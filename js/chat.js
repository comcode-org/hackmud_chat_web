function chatApiRequest(endpoint, data) {
	var req = new XMLHttpRequest();
	req.open("POST", "https://hackmud.com/mobile/" + endpoint + ".json");
	req.setRequestHeader("Content-Type", "application/json");
	req.send(JSON.stringify(data));
	return req
}
