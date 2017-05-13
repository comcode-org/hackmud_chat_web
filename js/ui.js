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

function setupChannel(user,chan_ul,user_div,chan,tell=false) {
	let li = $('<li class="channel_tab">');
	if(tell) {
		li.append($('<span class="col-C">@</span>'));
	}
	else {
		li.append($('<span class="col-C">#</span>'));
	}
	li.append(chan);
	chan_ul.append(li);


	let channel_div = $('<div class="channel_area">');
	channel_div.hide();
	user_div.append(channel_div);

	let msg_list = $('<ul class="message_list">');
	channel_div.append(msg_list);

	let list = new MessageList((tell?user.tells:user.channels)[chan], msg_list, user);

	list.li=li; // hackity hack hack
	list.channel_div=channel_div;
	if(tell) {
		list.channel.users=[user.name,chan]
	}

	(tell?user.tells:user.channels)[chan].list = list;

	li.click(function() {
		$('.channel_tab').removeClass('active');
		li.addClass('active');
		list.clearMentions();

		$('.channel_area').hide();
		channel_div.show();

		list.scrollToBottom();
	});


	let form = $('<form action="">');
	let input = $('<input type="text" class="chat-input">');
	if (!settings.skip_help)
	{
		input.attr("placeholder", "/help");
	}

	let ch=chan;
	let u=user;
	form.keydown(_=>list.clearMentions())
	$(list).scroll(_=>list.clearMentions())
	form.submit(function() {
		try {
			let msg = input.val();

			if(msg.trim().length == 0) {
				return false;
			}

			if (msg[0] == '/') {
				list.handleSlashCommand(msg.slice(1));
			} else {
				if (settings.color_code) {
					msg = '`' + settings.color_code + msg + '`';
				}
				if(tell)
					list.tell(u,ch,msg)
				else
					list.send(msg);
			}
			input.val('');
		} catch (e) {
			console.error(e);
		}
		return false;
	})

	input.keydown(function(e) {
		let keycode = e.which;

		if(keycode == 34) { // PgDn
			list.pgDn();
		} else if(keycode == 33) { // PgUp
			list.pgUp();
		}
	});
	form.append(input);
	channel_div.append(form);
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
		if(!user.tells)user.tells={}

		let li = $('<li class="user_tab">');
		user.li=li;
		li.text(name);
		user_ul.append(li);

		let user_div = $('<div class="user_area" id="user-' + name + '">');
		main_div.append(user_div);

		li.click(function() {
			act.setActiveUser(name);

			$('.user_tab').removeClass('active');
			li.addClass('active');

			$('.user_area').hide();
			user_div.show();
		});

		let chan_ul = $('<ul class="tab-list">');
		let tabset = $('<div class="tabset">');

		tabset.append(chan_ul);
		user_div.append(tabset);

		user.chan_ul=chan_ul;
		user.user_div=user_div
		for (let chan in user.channels) {
			setupChannel(user,chan_ul,user_div,chan);
		}

		for (let tell in user.tells) {
			setupChannel(user,chan_ul,user_div,tells,true);
		}
	}

	$('.channel_area').hide();
	$('.user_area').hide();

	if (!act.poll_interval) {
		act.poll_interval = setInterval(function() {
			act.poll({after:"last"}).then(function(data) {
				for (user in data.chats) {
					let channels = act.users[user].channels;
					let tells = act.users[user].tells;

					// new messages, in oldest-to-newest order
					// TODO deal with tells
					recent = data.chats[user].filter(m => m.channel && !channels[m.channel].list.messages[m.id]);

					data.chats[user].filter(m => !m.channel).map(m=> m.from_user==user?m.to_user:m.from_user).forEach(m=>{if(!tells[m]){tells[m]={};setupChannel(act.users[user],act.users[user].chan_ul,act.users[user].user_div,m,true);}});
					recent_tells = data.chats[user].filter(m => !m.channel && !tells[m.from_user==user?m.to_user:m.from_user].list.messages[m.id]);

					recent.forEach(function(msg) {
						channels[msg.channel].list.recordMessage(msg);
					});
					recent_tells.forEach(function(msg) {
						tells[msg.from_user==user?msg.to_user:msg.from_user].list.recordMessage(msg);
					});
				}
			});
		}, 1200);
	}
}

function colorizeUser(user) {
	let valid_colors = "BEFGHIJLMNQUVWY";
	let num_colors = valid_colors.length;

	let hash = user.split("").map(e => e.charCodeAt(0)).reduce((a, e) => a+e, 0);
	let colorCode = valid_colors.charAt((user.length + hash) % num_colors);
	let colorized = '`' + colorCode + user + "`";

	return colorized;
}

function colorizeMentions(msg) {
	return msg.replace(/@(\w+)(\W|$)/g, function(match, name, endPad) {
		return replaceColorCodes('`C@`' + colorizeUser(name) + endPad);
	});
}

function colorizeScripts(msg) {
	let trustUsers = [
		'accts',
		'autos',
		'chats',
		'corps',
		'escrow',
		'gui',
		'kernel',
		'market',
		'scripts',
		'sys',
		'trust',
		'users'
	];

	return msg.replace(/(#s.|[^#\.a-z0-9_]|^)([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)/g, function(match, pre, username, script) {
		let colorCode = trustUsers.indexOf(username) !== -1 ? 'F' : 'C';

		return replaceColorCodes(pre + '`' + colorCode + username + '`.`L' + script + '`');
	});
}

function replaceColorCodes(string) {
	return string.replace(/`([0-9a-zA-Z])([^:`\n]{1,2}|[^`\n]{3,}?)`/g, colorCallback);
}

function formatMessage(obj) {
	let date = new Date(obj.t * 1000);
	let timestr = [date.getHours(), date.getMinutes()].map(a => ('0' + a).slice(-2)).join(":");
	let msg = escapeHtml(obj.msg);
	let coloredUser = replaceColorCodes(colorizeUser(obj.from_user));
	msg = colorizeMentions(msg);
	msg = colorizeScripts(msg);
	msg = replaceColorCodes(msg).replace(/\n/g, '<br>');

	return '<span class="timestamp">' + timestr + "</span> " + coloredUser + ' <span class="msg-content">' + msg + '</span>';
}

function colorCallback(not_used, p1, p2) {
	let css = (p1.match(/[A-Z]/) ? 'col-cap-' : 'col-') + p1;
	return '<span class="' + css + '">' + p2 + '</span>';
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
