function MessageList(channel, ul) {
	this.channel = channel;
	this.ul = ul;
	this.messages = {};
	this.ids = [];
}

MessageList.prototype.poll = function() {
	return this.channel.poll().then(messages => {
		// new messages, in oldest-to-newest order
		recent = messages.filter(m => !this.messages[m.id]).reverse();

		recent.forEach(m => {
			id = m.id;
			this.messages[id] = m;
			this.ids.push(id);
		});

		return recent;
	});
}

MessageList.prototype.write = function(html, classArray) {
	if (!classArray) {
		classArray = [];
	}

	let li = $('<li class="' + classArray.join(' ') + '">');
	li.html(html);
	this.ul.append(li);
}

MessageList.prototype.safeWrite = function(str, classArray) {
	this.write(escapeHtml(str), classArray);
}

// putting this on the MessageList class so that we have a way to output data
MessageList.prototype.handleSlashCommand = function(str) {
	var components = str.split(' ');

	if (components[0] == 'help') {
		this.safeWrite('Commands: /help, /ignore <user>, /color <letter|color code>');
	} else if (components[0] == 'ignore') {
		if (components[1]) {
			var user = components[1];
			settings.addIgnore(user);
			this.safeWrite("Ignored " + user);
		} else {
			this.safeWrite("Ignore list: " + settings.ignore_list.join(", "));
		}
	} else if (components[0] == 'color') {
		if (components[1]) {
			var color = components[1];
			settings.setColor(color);
			this.write('Set chat color to "' + color + '". Sample: "' + colorCallback(null, color, 'foo bar baz') + '"');
		} else {
			if (settings.color_code) {
				var color = settings.color_code;
				this.write('Current chat color is "' + color + '". Sample: "' + colorCallback(null, color, 'foo bar baz') + '"');
			} else {
				this.safeWrite("Currently using the default chat color.");
			}
		}
	}
	
	this.scrollToBottom();
}

MessageList.prototype.scrollToBottom = function() {
	this.ul.scrollTop(1e10); // just scroll down a lot
}
