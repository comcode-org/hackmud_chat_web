var act=new Account();

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
	}
	else {
		this.li.removeAttr('data-mention')
	}

	this.li.attr('data-unread',unread);
}
