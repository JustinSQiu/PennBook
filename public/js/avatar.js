var avatarBank = new Map();
var imageBank = new Map();

function setAvatar (foo, elt){
	if(avatarBank.has(foo)) {
		elt.attr('image', avatarBank.get(foo));
		return;
	}
	$.getJSON('/getProfileImage/'+foo, function(data) {
		avatarBank.set(foo, data);
		elt.attr('image', data);
	});
}

function setAvatarSrc (foo, elt){
	if(imageBank.has(foo)) {
		elt.attr('src', imageBank.get(foo));
		return;
	}
	$.getJSON('/getProfileImage/'+foo, function(data) {
		if(data === '') imageBank.set(foo, 'https://images.unsplash.com/photo-1559209172-0ff8f6d49ff7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=80');
		else imageBank.set(foo, data);

		elt.attr('src', imageBank.get(foo));
	});
}
