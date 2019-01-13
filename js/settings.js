function Settings() {
	this.ignore_list = [];
}
Settings.prototype.setSkipHelp = function(skip) {
	this.skip_help = !!skip;
	if(!this.skip_help) {
		localStorage.removeItem('skip_help');
	} else {
		localStorage.setItem('skip_help', true);
	}
}

Settings.prototype.setColor = function(code) {

	if(code == "none") {
		this.color_code = null;
		localStorage.removeItem('color_code');
	} else {
		this.color_code = code;
		localStorage.setItem('color_code', JSON.stringify(code));
	}
}

Settings.prototype.addIgnore = function(user) {
	this.ignore_list.push(user);
	localStorage.setItem('ignore_list', JSON.stringify(this.ignore_list));
}

Settings.prototype.ready = function() {
	[
		'color_code',
		'ignore_list',
		'skip_help',
	].forEach(function(key) {
		var data = localStorage.getItem(key);
		if (data) {
			settings[key] = JSON.parse(data);
		}
	});
}

var settings = new Settings();
