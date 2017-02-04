function MessageList(channel) {
	this.channel = channel;
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
