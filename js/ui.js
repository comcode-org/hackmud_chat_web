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

			let msg_list = $('<ul>');
			channel_div.append(msg_list);

			// TODO clean this up to not leak like hell
			setInterval(function() {
				list.poll().then(function(msgs) {
					msgs.forEach(m => {
						let li = $('<li class="message">');
						li.text(m.from_user + ": " + m.msg);
						msg_list.append(li);
					});
				});
			}, 1000)
		}
	}

	$('.channel_area').hide();
	$('.user_area').hide();
}