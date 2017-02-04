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

			let list = new MessageList(user.channels[chan]);

			let channel_div = $('<div class="channel_area">');
			user_div.append(channel_div);
			li.click(function() {
				$('.channel_area').hide();
				channel_div.show();
			});

			let msg_list = $('<ul class="message_list">');
			channel_div.append(msg_list);

			// TODO clean this up to not leak like hell
			setInterval(function() {
				list.poll().then(function(msgs) {
					let at_bottom = msg_list[0].scrollHeight - msg_list.scrollTop() == msg_list.height();

					msgs.forEach(m => {
						let li = $('<li class="message">');
						let date = new Date(m.t * 1000);
						let timestr = [date.getHours(), date.getMinutes()].map(a => ('0' + a).slice(-2)).join(":");
						li.text(timestr + " " + m.from_user + ": " + m.msg);
						msg_list.append(li);
					});

					if (at_bottom) {
						msg_list.scrollTop(1e10); // just scroll down a lot
					}
				});
			}, 1000)

			let form = $('<form action="">');
			let input = $('<input type="text" class="chat-input">');
			form.submit(function() {
				try {
					let msg = input.val();
					list.channel.send(msg);
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
