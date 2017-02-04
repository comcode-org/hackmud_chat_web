var request;

if(typeof window!="undefined") {
	// browser
	request=function(ops,cb) {
		var x=new XMLHttpRequest();
		x.onreadystatechange=function() {
			if(x.readyState !== XMLHttpRequest.DONE)return;
			cb(null,{statusCode:x.status},JSON.parse(x.responseText));
		}

		x.open(ops.method,ops.uri);
		x.setRequestHeader('Content-Type','application/json');
		x.setRequestHeader('Accept','application/json');
		x.send(JSON.stringify(ops.json))
	}
}
else {
	// node
	request=require('request');
}






var API= {
	__promise_wrap:(endpoint,dat) => {
		return new Promise( (resolve,reject) => {
			request({ method: 'POST', uri: 'https://www.hackmud.com/mobile/'+endpoint+'.json', json:dat},
				(error,response,body) => {
					if(!error && response.statusCode == 200)
						resolve(body)
					else
						reject({error:error,statusCode:response?response.statusCode:null,body:body})
				}
			)
		})
	},

	// core API
	get_token:  (pass)                         => API.__promise_wrap('get_token',  {pass:pass}),
	usernames:  (token)                        => API.__promise_wrap('usernames',  {chat_token:token}),
	channels:   (token,user_id)                => API.__promise_wrap('channels',   {chat_token:token, user_id:user_id}),
	chats:      (token,user_id,channel_id)     => API.__promise_wrap('chats',      {chat_token:token, user_id:user_id, channel_id:channel_id}),
	create_chat:(token,user_id,channel_id,msg) => API.__promise_wrap('create_chat',{chat_token:token, user_id:user_id, channel_id:channel_id, msg:msg}),
}




function Channel(user,name,id) {
	this.user=user;
	this.name=name;
	this.id=id;
}
Channel.prototype.poll=function() {
	return API.chats(this.user.account.token,this.user.id,this.id);
}
Channel.prototype.send=function(msg) {
	return API.create_chat(this.user.account.token,this.user.id,this.id,msg);
}
Channel.prototype.print=function() {
	console.log('        Channel:');
	console.log('          name : '+this.name)
	console.log('          id   : '+this.id)
}


function User(account,name,id) {
	this.account=account;
	this.name=name;
	this.id=id;
	this.channels=null;
}
User.prototype.poll=function() {
	var ar=[];
	var names=[];
	for(var i in this.channels) {
		names.push(this.channels[i].name);
		ar.push(this.channels[i].poll());
	}
	return Promise.all(ar).then(ar=>{
		var ret={};
		for(var i=0;i<ar.length;++i)
			ret[names[i]]=ar[i]
		return ret;
	});
}
User.prototype.getChannels=function() {
	return API.channels(this.account.token,this.id).then(channels=>{
		this.channels={};
		for(var i=0;i<channels.length;++i) {
			var name=channels[i].name;
			var id=channels[i].id;
			this.channels[name]=new Channel(this,name,id);
		}
		return this;
	})
}
User.prototype.print=function() {
	console.log('    User:');
	console.log('      name : '+this.name)
	console.log('      id   : '+this.id)
	console.log('      channels:')
	for(var i in this.channels)
		this.channels[i].print();
}


function Account() {
	this.users=null;
	this.token=null;
}
Account.prototype.login=function(pass) {
	return API.get_token(pass).then(token=>this.update(token.chat_token))
}
Account.prototype.update=function(token) {
	this.token=token;
	return API.usernames(this.token).then(usernames=>{
		this.users={};
		var channels=[];
		for(var i=0;i<usernames.length;++i) {
			var name=usernames[i].name;
			var id=usernames[i].id;
			this.users[name]=new User(this,name,id);
			channels.push(this.users[name].getChannels());
		}
		return Promise.all(channels).then(_=>this);
	})
}
Account.prototype.poll=function() {
	var ar=[];
	var names=[];
	for(var i in this.users) {
		names.push(this.users[i].name);
		ar.push(this.users[i].poll());
	}
	return Promise.all(ar).then(ar=>{
		var ret={};
		for(var i=0;i<ar.length;++i)
			ret[names[i]]=ar[i]
		return ret;
	});
}
Account.prototype.print=function() {
	console.log('Account:');
	console.log('  token: '+this.token)
	console.log('  users:')
	for(var i in this.users)
		this.users[i].print();
}




var act=new Account();
