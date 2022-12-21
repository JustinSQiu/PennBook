var CryptoJS = require('crypto-js');

const secret = "g15 is the best";

var encryption = function(word){
	return CryptoJS.AES.encrypt(word, secret).toString();
}

var decryption = function(word){
	return CryptoJS.AES.decrypt(word, secret).toString(CryptoJS.enc.Utf8);;
}


var security = {
	encrypt: encryption,
	decrypt: decryption
}

module.exports = security;