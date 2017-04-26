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

			let msg_list = $('<ul class="message_list">');
			channel_div.append(msg_list);

			let list = new MessageList(user.channels[chan], msg_list);
			user.channels[chan].list = list;

			li.click(function() {
				$('.channel_tab').removeClass('active');
				li.addClass('active');

				$('.channel_area').hide();
				channel_div.show();
				
				list.scrollToBottom();
			});


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
	let valid_colors = "BEFGHIJLMNQUVWY";
	let num_colors = valid_colors.length;

	let hash = user.split("").map(e => e.charCodeAt(0)).reduce((a, e) => a+e, 0);
	let colorCode = valid_colors.charAt((user.length + hash) % num_colors);
	let colorized = '`' + colorCode + user + "`";

	return colorized;
}

function colorizeMessage(msg) {
	let runs = [];

	// Iterate backwards until we find the most recent unclosed run, then close it. 
	// Once we close this run, continue iterating backwards until we find the last still-open run to resume coloring from
	function closeLastCode(runs, x) {
		let closedRun = null;
		for(let y = runs.length-1; y >= 0; y--) {
			let run = runs[y];
			if(run.close == null) {
				if(closedRun == null) {
					run.close = x;
					closedRun = run;	
				} else {
					closedRun.resumeColor = run.color;
					break;
				}
			}
		}
	}

	let currentColor = null;
	// Iterate each character
	for(let x = 0; x < msg.length; x++) {
		let char = msg.charAt(x);
		if(char == '`') { // For each color code, look ahead a single step
			if(x + 1 < msg.length) {
				let next = msg.charAt(x+1);
				if(next.match(/[A-Za-z0-5]/)) { // If the next character is a coloring code, this is an "open" code
					runs.push({color: next, open: x});
					currentColor = next;
				} else { // Otherwise it's a close code, but we need to iterate backwards to find the correct "depth" to close
					closeLastCode(runs, x);
				}
			} else {
				closeLastCode(runs, x);
			}
		}
	}


	// Iterate the runs to replace nested opening colors with terminate/open
	for(let x = 0; x < runs.length; x++) {
		let run = runs[x];
		if(run.resumeColor == null) {
			continue;
		}

		if(x - 1 >= 0) {
			if(runs[x-1].close - run.open <= 1) {
				continue;
			}
		} else {
			continue;
		}
		let pre = msg.slice(0, run.open + 1);
		let post = msg.slice(run.open + 1);
		msg = pre + '`' + post;

		runs.forEach(r => {
			if(r.close >= run.open + 1) {
				r.close++;
			}

			if(r.open >= run.open + 1) {
				r.open++;
			}
		});
	}

	// Iterate the runs to replace nested close colors with terminate/re-open last
	for(let x = 0; x < runs.length; x++) {
		let run = runs[x];
		if(run.resumeColor == null) {
			continue;
		}

		if(x + 1 < runs.length) {
			if(runs[x+1].open - run.close <= 1) {
				continue;
			}
		} else {
			continue;
		}

		let pre = msg.slice(0, run.close + 1);
		let post = msg.slice(run.close + 1);
		msg = pre + '`' + run.resumeColor + post;

		runs.forEach(r => {
			if(r.close >= run.open + 1) {
				r.close += 2;
			}

			if(r.open >= run.open + 1) {
				r.open += 2;
			}
		});
	}

	return msg.replace(/`+$/, '`');
}

function colorizeMentions(msg) {
	return msg.replace(/(^|\W)@(\w+)(\W|$)/g, function(match, startPad, name, endPad) {
		return startPad + '`C@`' + colorizeUser(name) + endPad;
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
	msg = colorizeMessage(msg);
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

