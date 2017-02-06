$(document).ready(function() {
	var token = getToken();
	if (token) {
		act.update(token).then(replaceUI);
	}
})

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
	main_div = $("#chat_area");

	main_div.innerHTML = ''

	var user_ul = $('<ul class="tab-list">');
	let tabset = $('<div class="tabset">');
	tabset.append(user_ul);
	main_div.append(tabset);

	for (let name in act.users) {
		user = act.users[name];

		let li = $("<li>");
		li.text(name);
		user_ul.append(li);

		let user_div = $('<div class="user_area" id="user-' + name + '">');
		main_div.append(user_div);

		li.click(function() {
			$('.user_area').hide();
			user_div.show();
		});

		let chan_ul = $('<ul class="tab-list">');
		let tabset = $('<div class="tabset">');
		tabset.append(chan_ul);
		user_div.append(tabset);

		for (let chan in user.channels) {
			let li = $('<li>');
			li.text(chan);
			chan_ul.append(li);


			let channel_div = $('<div class="channel_area">');
			user_div.append(channel_div);
			li.click(function() {
				$('.channel_area').hide();
				channel_div.show();
			});

			let msg_list = $('<ul class="message_list">');
			channel_div.append(msg_list);

			let list = new MessageList(user.channels[chan], msg_list);

			// TODO clean this up to not leak like hell
			setInterval(function() {
				list.poll().then(function(msgs) {
					let at_bottom = msg_list[0].scrollHeight - msg_list.scrollTop() == msg_list.height();

					msgs.forEach(m => {
						classList = ['message'];
						if (settings.ignore_list.includes(m.from_user)) {
							classList.push('ignore');
						}
						list.write(formatMessage(m), classList);
					});

					if (at_bottom) {
						list.scrollToBottom();
					}
				});
			}, 1000)

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
}

function formatMessage(obj) {
	let date = new Date(obj.t * 1000);
	let timestr = [date.getHours(), date.getMinutes()].map(a => ('0' + a).slice(-2)).join(":");
	let msg = escapeHtml(obj.msg).replace(/`([0-9a-zA-Z])([^:`\n]{1,2}|[^`\n]{3,}?)`/g, colorCallback).replace(/\n/g, '<br>');

	return '<span class="timestamp">' + timestr + "</span> " + obj.from_user + ' <span class="msg-content">' + msg + '</span>';
}

function colorCallback(not_used, p1, p2) {
	let css = (p1.match(/[A-Z]/) ? 'col-cap-' : 'col-') + p1;
	return '<span class="' + css + '">' + p2 + '</span>';
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

