function ui_ready() {
	var token = getToken();
	if (token) {
		act.update(token).then(replaceUI);
	}
}

function login(pass) {
	act.login(pass).then(function() {
		saveToken();
		replaceUI();
	});
}

function saveToken() {
	// saving the token as a cookie, rather than local storage, under the assumption that people are in the habit of clearing cookies specifically when they want to de-auth a site
	document.cookie = 'chat_token=' + act.token;
}
function getToken() {
	return readCookieValue('chat_token');
}

function readCookieValue(key) {
	return document.cookie.replace(new RegExp('(?:(?:^|.*;\\s*)' + key + '\\s*\\=\\s*([^;]*).*$)|^.*$'), "$1");
}

function replaceUI() {
	$('#chat_pass_login').hide();

	main_div = $("#chat_area");

	main_div.innerHTML = ''

	var user_ul = $('<ul class="tab-list">');
	let tabset = $('<div class="tabset">');
	tabset.append(user_ul);
	main_div.append(tabset);

	for (let name in act.users) {
		user = act.users[name];

		let li = $('<li class="user_tab">');
		li.text(name);
		user_ul.append(li);

		let user_div = $('<div class="user_area" id="user-' + name + '">');
		main_div.append(user_div);

		li.click(function() {
			$('.user_tab').removeClass('active');
			li.addClass('active');

			$('.user_area').hide();
			user_div.show();
		});

		let chan_ul = $('<ul class="tab-list">');
		let tabset = $('<div class="tabset">');
		tabset.append(chan_ul);
		user_div.append(tabset);

		for (let chan in user.channels) {
			let li = $('<li class="channel_tab">');
			li.text(chan);
			chan_ul.append(li);


			let channel_div = $('<div class="channel_area">');
			user_div.append(channel_div);
			li.click(function() {
				$('.channel_tab').removeClass('active');
				li.addClass('active');

				$('.channel_area').hide();
				channel_div.show();
			});

			let msg_list = $('<ul class="message_list">');
			channel_div.append(msg_list);

			let list = new MessageList(user.channels[chan], msg_list);
			user.channels[chan].list = list;


			let form = $('<form action="">');
			let input = $('<input type="text" class="chat-input">');
			form.submit(function() {
				try {
					let msg = input.val();
					if (msg[0] == '/') {
						list.handleSlashCommand(msg.slice(1));
					} else {
						if (settings.color_code) {
							msg = '`' + settings.color_code + msg + '`';
						}
						list.channel.send(msg);
					}
					input.val('');
				} catch (e) {
					console.error(e);
				}
				return false;
			})
			form.append(input);
			channel_div.append(form);
		}
	}

	$('.channel_area').hide();
	$('.user_area').hide();

	if (!act.poll_interval) {
		act.poll_interval = setInterval(function() {
			act.poll({after:"last"}).then(function(data) {
				for (user in data.chats) {
					let channels = act.users[user].channels;

					// new messages, in oldest-to-newest order
					// TODO deal with tells
					recent = data.chats[user].filter(m => m.channel && !channels[m.channel].list.messages[m.id]);

					recent.forEach(function(msg) {
						channels[msg.channel].list.recordMessage(msg);
					});
				}
			});
		}, 1200);
	}
}

function colorizeUser(user) {
	let valid_colors = "BEFGHIJLMNQSUVWY";
	let num_colors = valid_colors.length;

	let hash = user.split("").map(e => e.charCodeAt(0)).reduce((a, e) => a+e, 0);
	let colorCode = valid_colors.charAt((user.length + hash) % num_colors);
	let colorized = '`' + colorCode + user + "`";

	return replaceColorCodes(colorized);
}

function replaceColorCodes(string) {
	return escapeHtml(string).replace(/`([0-9a-zA-Z])([^:`\n]{1,2}|[^`\n]{3,}?)`/g, colorCallback);
}

function formatMessage(obj) {
	let date = new Date(obj.t * 1000);
	let timestr = [date.getHours(), date.getMinutes()].map(a => ('0' + a).slice(-2)).join(":");
	let msg = replaceColorCodes(obj.msg).replace(/\n/g, '<br>');

	return '<span class="timestamp">' + timestr + "</span> " + colorizeUser(obj.from_user) + ' <span class="msg-content">' + msg + '</span>';
}

function colorCallback(not_used, p1, p2) {
	let css = (p1.match(/[A-Z]/) ? 'col-cap-' : 'col-') + p1;
	return '<span class="' + css + '">' + p2 + '</span>';
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

