Account.prototype.setPollDelay=function(delay) {
	this.poll_delay=delay;

	if(!this.poll_callback)
		return;

	if(this.isPolling()) {
		this.stopPolling();
		this.startPolling(this.poll_callback, this.poll_ext);
	}
}
Account.prototype.startPolling=function(callback, ext) {
	this.poll_callback=callback;
	this.poll_ext=ext;

	let act=this;
	this.poll_interval=setInterval(function() {
		act.poll(ext).then(callback)
	}, this.poll_delay);
}
Account.prototype.stopPolling=function() {
	clearInterval(this.poll_interval);
	this.poll_interval=null;
}
Account.prototype.isPolling=function() {
	return !!this.poll_interval;
}

var act=new Account();

act.poll_delay=null;
act.poll_interval=null;
act.poll_callback=null;

function getMentions(ch) {
	var n=ch.list.li.attr('data-mention');
	if(n)return parseInt(n);
	return 0;
}
function isUnread(ch) {
	return !!ch.list.li.attr('data-unread');
}
User.prototype.updateInteresting=function() {
	var n=0;
	var unread=false;
	for(var i in this.channels) {
		n+=getMentions(this.channels[i]);
		unread = unread || isUnread(this.channels[i]);
	}
	for(var i in this.tells) {
		n+=getMentions(this.tells[i]);
	}

	if(n) {
		this.li.attr('data-mention',n)
		unread = true;
	}
	else {
		this.li.removeAttr('data-mention')
	}

	if(unread) {
		this.li.attr('data-unread',unread);
	}
	else {
		this.li.removeAttr('data-unread');
	}
}
