let request, api_root = "https://www.hackmud.com"

if(typeof window!="undefined") {
	// super quick and dirty browser wrapper
	request=function(ops,cb) {
		var x=new XMLHttpRequest();
		x.onreadystatechange=function() {
			if(x.readyState !== XMLHttpRequest.DONE)return;
			cb(null,{statusCode:x.status},x.responseText?JSON.parse(x.responseText):[]);
		}

		x.open(ops.method,ops.uri);
		x.setRequestHeader('Content-Type','application/json');
		x.setRequestHeader('Accept','application/json');
		x.send(JSON.stringify(ops.json))
	}
	// Find out if we're looking at hackmud itself, or a local proxy
	if (!document.location.origin.includes("hackmud.com")) {
		// Local proxy, configure API root
		api_root = document.location.origin
	}
}
else {
	// Simple, straight forward node
	request=require('request');
}


var API = {
	domain_root: api_root,
	__promise_wrap:(endpoint,dat) => {
		return new Promise( (resolve,reject) => {
			request({ method: 'POST', uri: API.domain_root+'/mobile/'+endpoint+'.json', json:dat},
				(error,response,body) => {
					if(!error && response.statusCode == 200)
						resolve(body)
					else {
						reject({error:error,statusCode:response?response.statusCode:null,body:body})
					}
				}
			)
		})
	},

	// core API
	get_token:   (pass)                       => API.__promise_wrap('get_token',   {pass:pass}),
	account_data:(token)                      => API.__promise_wrap('account_data',{chat_token:token}),
	chats:       (token,usernames,ext={})     => API.__promise_wrap('chats',       Object.assign(ext,{chat_token:token, usernames:usernames})),
	send:        (token,username,channel,msg) => API.__promise_wrap('create_chat', {chat_token:token, username:username, channel:channel, msg:msg}),
	tell:        (token,username,user,msg)    => API.__promise_wrap('create_chat', {chat_token:token, username:username, tell:user, msg:msg}),
}
//------------------------------------------------------------------------------
function Channel(user,name,users) {
	this.user=user;
	this.name=name;
	this.users=users;
}
Channel.prototype.send=function(msg) {
	return API.send(this.user.account.token,this.user.name,this.name,msg);
}
Channel.prototype.older=function() {
	var ext = {
		channels: [this.name],
		sort: -1,
		before: this.first ? this.first : (new Date()).getUTCMilliseconds()/1000.0,
	}
	ext.before = this.first
	return API.chats(this.user.account.token,[this.user.name],ext)
		.then(o=>{
			if(!o.ok) return o;
			if (o.chats && o.chats[this.user.name] && o.chats[this.user.name].length)
			{
				let chats = o.chats[this.user.name];
				this.first = chats[chats.length-1].t;
			}

			return o;
		});
}
Channel.prototype.print=function() {
	console.log('        Channel:');
	console.log('          name : '+this.name)
}
//------------------------------------------------------------------------------
function User(account,name,dat) {
	this.account=account;
	this.name=name;
	this.channels={}
	for(var i in dat) {
		this.channels[i]=new Channel(this,i,dat[i]);
	}
}
User.prototype.tell=function(to,msg) {
	return API.tell(this.account.token,this.name,to,msg);
}
User.prototype.print=function() {
	console.log('    User:');
	console.log('      name : '+this.name)
	console.log('      channels:')
	for(var i in this.channels)
		this.channels[i].print();
}
//------------------------------------------------------------------------------
function Account(last=Date.now()/1000-300 /* 5 minutes ago*/) {
	this.users=null;
	this.token=null;
	this.last=last
}
Account.prototype.login=function(pass) {
	if(pass.length>10)return this.update(pass)
	return API.get_token(pass).then(token=>this.update(token.chat_token))

}
Account.prototype.update=function(token) {
	this.token=token;
	return API.account_data(this.token).then(dat=>{
		if(!dat.ok)return false;
		this.users={};
		for(var i in dat.users) {
			var name=i
			this.users[name]=new User(this,name,dat.users[i]);
		}
		return this;
	})
}
Account.prototype.poll=function(ext={}) {
	if(this.last) {
		if(ext.before=='last')
			ext.before=this.last+0.1;
		if(ext.after=='last') {
			ext.after=this.last-0.1;
			var five_min_ago=new Date()/1000 - 300;
			if(ext.after < five_min_ago)
				ext.after=five_min_ago
		}
	}
	return API.chats(this.token,Object.keys(this.users),ext)
		.then(o=>{
			if(!o.ok)return o;
			var last=0;
			for(var i in o.chats) {
				o.chats[i].sort((a,b)=>a.t-b.t);
				var l=o.chats[i];
				if(l.length && l[l.length-1].t>last)
					last=l[l.length-1].t;
				o.chats[i]
					.filter(m=>typeof m.channel!="undefined" && (m.is_join || m.is_leave))
					.forEach(m=>{
						var ch=this.users[i].channels[m.channel];
            			if(!ch) {
							ch=this.users[i].channels[m.channel]=new Channel(this.users[i],m.channel,[]);
						}
						if(m.is_join) {
							if(ch.users.indexOf(m.from_user)==-1)
								ch.users.push(m.from_user);
						}
						if(m.is_leave) {
							for(var ind=ch.users.indexOf(m.from_user);ind!=-1;ind=ch.users.indexOf(m.from_user)) {
								ch.users.splice(ind,1);
							}
						}
					})
			}
			if(last)
				this.last=last
			return o;
		});
}
Account.prototype.print=function() {
	console.log('Account:');
	console.log('  token: '+this.token)
	console.log('  users:')
	for(var i in this.users)
		this.users[i].print();
}

if(typeof exports!="undefined") {
	exports.API=API;
	exports.Account=Account;
	exports.User=User;
	exports.Channel=Channel
}
