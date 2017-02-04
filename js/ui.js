function login(pass) {
	act.login(pass).then(replaceUI);
}

function replaceUI() {
	main_div = $("#chat_area");

	main_div.innerHTML = ''

	var user_ul = $("<ul>");
	main_div.append(user_ul);

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

		let chan_ul = $('<ul>');
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
		user_div.append(chan_ul);
	}

	$('.channel_area').hide();
	$('.user_area').hide();
}
