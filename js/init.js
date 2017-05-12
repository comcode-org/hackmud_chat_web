var act=new Account();

function getMentions(ch) {
	var n=ch.list.li.attr('data-unread');
	if(n)return parseInt(n);
	return 0;
}
User.prototype.updateMentions=function() {
	var n=0;
	for(var i in this.channels)
		n+=getMentions(this.channels[i]);
	for(var i in this.tells)
		n+=getMentions(this.tells[i]);

	if(n) {
		this.li.attr('data-unread',n)
	}
	else {
		this.li.removeAttr('data-unread')
	}
}
