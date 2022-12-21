var db = require('../models/database.js');
var security = require('../models/cipher.js');
var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient();
var dbClient = new AWS.DynamoDB();

//helper function to verify session
//TODO: change this depending on how login session is set up
var verifyUser = function(req) {
	var session = req.session;
	if(!session.userId) {
		return false;
	}
	return true;
}

var getLogOut = function(req, res) {
	req.session.destroy();
	res.redirect('/?logout=1');
}

var getMain = function(req, res) {
	if(verifyUser(req)) {
		res.redirect('/home');
		return;
	}
	if (req.query.error == 1) {
		res.render('main.ejs', {error: "The username and/or password is not valid.", logout: false});
  } else if (req.query.error == 2) {
		res.render('main.ejs', {error: "You must log in before accessing that page!", logout: false});
  } else if(req.query.logout) {
		res.render('main.ejs', {error: null, logout: true});
  } else{
  	res.render('main.ejs', {error: null, logout: false});
  }
};

var signup = function(req, res) {
  if (req.query.error == 1) {
	res.render('signup.ejs', {error: "There was an error signing up, please try again."});
  } else {
	res.render('signup.ejs', {error: null});
  }
}

var createAccount = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  var birthday = req.body.birthday;
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  var interests = [];
  console.log(req.body.interests);
  JSON.parse(req.body.interests).forEach(x=>interests.push({S:x}));
  var affiliation = req.body.affiliation;

  if (username.replace(/\s+/g, '') == '' || password.replace(/\s+/g, '') == '' || email.replace(/\s+/g, '') == '' || birthday.replace(/\s+/g, '') == '' || firstname.replace(/\s+/g, '') == '' || lastname.replace(/\s+/g, '') == '') {
	res.redirect('/signup?error=1')
  } else {
	  // check if already exists
	  db.lookup('Settings', 'username', username, [], function(err, data) {
		if (data) {
			// already exists
			res.redirect('/signup?error=1')
		} else {
			var columns = [
			{
				column: 'password',
				value: security.encrypt(password),
				type: 'S'
			},
			{
				column: 'email',
				value: email,
				type: 'S'
			},
			{
				column: 'birthday',
				value: birthday,
				type: 'S'
			},
			{
				column: 'affiliation',
				value: affiliation,
				type: 'S'
			},
			{
				column: 'interests',
				value: interests,
				type: 'L'
			},
			{
				column: 'friends',
				value: [],
				type: 'L'
			},
			{
				column: 'firstname',
				value: firstname,
				type: 'S'
			},
			{
				column: 'lastname',
				value: lastname,
				type: 'S'
			},
			{
				column: 'profileimage',
				value: "",
				type: 'S'
			}
			];
			db.put('Settings', 'username', username, columns, function(err, data) {
		    if (err) {
			  console.log(err)
			  res.redirect('/signup?error=1')
			  return;
		    } else if (data) {
			  console.log("signed up successfully")
			  session = req.session;
			  session.userId = req.body.username;
			  
			  var msgcols = [{column:'id', value:[],type:'L'}, {column:'username',value:req.body.username, type:'S'}];
			  
			  db.put('GroupOfMember','username',req.body.username, msgcols, function(err, data){
				
				if(err){
					console.log(err);
					res.redirect('/signup?error=1')
					return;
				} else if(data){
				
			 
			  // Redirect to appropriate page
				}
				
			});
			
			var emptycols = [{column:'people', value:[],type:'L'}, {column:'username',value:req.body.username, type:'S'}];
			
			 
			  db.put('DMofMember','username',req.body.username, emptycols, function(err, data){
				
				if(err){
					console.log(err);
					res.redirect('/signup?error=1')
					return;
				} else if(data){
					 
			  	
			  // Redirect to appropriate page
				}
				
			});
			
			 
			  db.put('requestsOfMembers','username',req.body.username, emptycols, function(err, data){
				
				if(err){
					console.log(err);
					res.redirect('/signup?error=1')
					return;
				} else if(data){
					 res.redirect('/home');
			  	console.log(req.session);
			  // Redirect to appropriate page
				}
				
			});
			  
			  
			  
			  
			 
		    } else {
			  res.redirect('/signup?error=1')
		    }
		  });
		}
	  });

  }
};

// check if login is valid
var checkLogin = function(req, res) {
  username = req.body.username;
  password = req.body.password;
  if (username == "" || password == "") {
	res.redirect('/?error=1')
  } else {
	  db.lookup('Settings', 'username', username, ['password'], function(err, data) {
	    if (err || data.length == 0) {
		  console.log(err)
		  res.redirect('/?error=1')
	    } else if (data) {
		  if (security.decrypt(data[0]['password']['S']) == password) {
			  session = req.session;
			  session.userId = req.body.username;
			  console.log("logged in successfully")
			  res.redirect('/home')
	      } else {
		    console.log("username exists but password mismatch")
			res.redirect('/?error=1')
		  }
	    } else {
			res.redirect('/?error=1')
	    }
	  });
  }
};

var addFriend = function(req, res){
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	
	//var userID = "zuck";
	var userID = req.session.userId;
	db.lookup("Settings", "username", userID, ['friends'], function(err, data){
		if (err) {
			console.log("errored out");
			console.log(err);
		} else {
			var foundfriend = false;
			const friendsList = data[0].friends.L;
			
			
			db.lookup("Settings","username",req.body.newfriend, ['friends'], function(err, data) {
				console.log("reaching verification");
				if (err) {
					console.log("error checking if friend exists");
					res.redirect("/friends");
					return;
				}
				if (data[0]==undefined) {
					console.log("friend does not exit(?)");
					res.redirect("/friends?error=1");
					return;
				} else {
					
					var inp = [];
			friendsList.forEach(item =>{
				inp.push(item.S);
			});
			if(!inp.includes(req.body.newfriend)){
				inp.push(req.body.newfriend);
				
			}
			
			
        
        const params = {
				    Key:{
						"username":userID
					},
					TableName:"Settings",
					UpdateExpression: "set friends = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
			
			
			docClient.update(params, function(err, data){
				if(err){
					console.log(err);
					res.redirect("/friends");
				} else {
					res.redirect("/friends");
				}
			});
			
			
			db.lookup("Settings","username",req.body.newfriend, ['friends'], function(err, data_inner){
						if(err){
					console.log("errored out");
					console.log(err);} else{
						const friendsList_inner = data_inner[0].friends.L;
						var inp = [];
					friendsList_inner.forEach(item =>{
						inp.push(item.S);
					});
					if(!inp.includes(userID)){
						inp.push(userID);
						
					}
					
					
					const params = {
					    Key:{
							"username":req.body.newfriend
						},
						TableName:"Settings",
						UpdateExpression: "set friends = :r",
						ExpressionAttributeValues: {
							":r": inp
						}
						
					}
				
					docClient.update(params, function(err, data){
						if(err){console.log(err)}
						
					});
					
						}
					}
				
			);
				}	
			});
		
			
			
		}
	});
}

var removeFriend  = function(req, res){
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	//var userID = "zuck";
	var userID = req.session.userId;
	db.lookup("Settings", "username", userID, ['friends'], function(err, data){
		if(err){
			console.log("errored out");
			console.log(err);
		} else{
			const friendsList = data[0].friends.L;
				
			var inp = [];
			friendsList.forEach(item =>{
				inp.push(item.S);
			});
			
			var index = inp.indexOf(req.body.username);
			inp.splice(index, 1);	
			const params = {
			    Key:{
					"username":userID
				},
				TableName:"Settings",
				UpdateExpression: "set friends = :r",
				ExpressionAttributeValues: {
					":r": inp
				}
			}
			docClient.update(params, function(err, data){
				if(err){
					console.log(err);
					res.redirect("/friends");
				} else{
					res.redirect("/friends");
				}
			});
			
			db.lookup("Settings","username",req.body.username, ['friends'], function(err, data_inner){
					if(err){
				console.log("errored out");
				console.log(err);} else{
					const friendsList_inner = data_inner[0].friends.L;
					var inp = [];
				friendsList_inner.forEach(item =>{
					inp.push(item.S);
				});
				var index = inp.indexOf(userID);
				inp.splice(index, 1);	
				const params = {
				    Key:{
						"username":req.body.username
					},
					TableName:"Settings",
					UpdateExpression: "set friends = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
					if(err){console.log(err)}
					
				});
				
			}
				
				}
			);
			
			
		}
	});
	//res.redirect("/friends");
}

var getFriends = function(req, res) {

	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	
	const userID = req.session.userId;
	//const userID = "zuck";
	db.lookup("Settings", "username", userID, ['firstname','lastname','friends'], function(err, data){
		if(err){
			console.log(err);
			
		} else{
			var err = undefined;
			if(req.query.error==1){
				err = "friend does not exist!";
			}
			const dataitem = data[0];
			res.render("friends.ejs", {
				user: userID, 
				firstname:data[0].firstname.S, 
				lastname:data[0].lastname.S, 
				friends: dataitem.friends.L, err: err

			});
		}
	});
	
	
};



//renders settings page
var getSettings = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	
	const user = req.session.userId;
	
	db.lookup('Settings', 'username', user, ['affiliation', 'birthday', 'email', 'firstname', 'lastname', 'interests'], function(err,data) {
		if(err || data.length == 0) {
			if(err) console.log(err);
			if(data.length == 0) console.log("no associated username found for: "+foo);
			res.redirect("/");
		}
		else {
			const dataitem = data[0];
			res.render("settings.ejs", {
				user: user, 
				email: dataitem.email.S, 
				birthday: dataitem.birthday.S, 
				affiliation: dataitem.affiliation.S, 
				interests: dataitem.interests.L,
				firstname: dataitem.firstname.S, 
				lastname: dataitem.lastname.S
			});
		}
	});
	
	//placeholder lookup
	
	/*
	const foo = 'zuck';
	db.lookup('Settings', 'username', foo, ['affiliation', 'birthday', 'email', 'firstname', 'lastname', 'interests'], function(err,data) {
		if(err || data.length == 0) {
			if(err) console.log(err);
			if(data.length == 0) console.log("no associated username found for: "+foo);
			res.redirect("/");
		}
		else {
			var dataitem = data[0];
			res.render("settings.ejs", {
				username: foo, 
				email: dataitem.email.S, 
				birthday: dataitem.birthday.S, 
				affiliation: dataitem.affiliation.S, 
				interests: dataitem.interests.L,
				firstname: dataitem.firstname.S, 
				lastname: dataitem.lastname.S
			});
		}
	});*/
}

//function to process changes to settings by post request
var postSettings = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	const foo = req.session.userId;
	
	//TODO: remove interests from lookup list once properly implemented
	db.lookup('Settings', 'username', foo, ['password', 'friends', 'profileimage', 'interests'], function(err,data) {
		var interestsList = [];
		JSON.parse(req.body.interests).forEach(x=> {if(x!=='') interestsList.push({S:x})});
		var columns = [
			{
				column: 'email',
				value: req.body.email,
				type: 'S'
			},
			{
				column: 'birthday',
				value: req.body.birthday,
				type: 'S'
			},
			{
				column: 'affiliation',
				value: req.body.affiliation,
				type: 'S'
			},
			{
				column: 'interests',
				value: interestsList,
				type: 'L'
			},
			{
				column: 'friends',
				value: data[0].friends.L,
				type: 'L'
			},
			{
				column: 'profileimage',
				value: data[0].profileimage.S,
				type: 'S'
			},
			{
				column: 'firstname',
				value: req.body.firstname,
				type: 'S'
			},
			{
				column: 'lastname',
				value: req.body.lastname,
				type: 'S'
			}
		];

		let oldInterests = data[0].interests.L;
		let user = foo;
		const newI = JSON.parse(req.body.interests);
		var oldI = (JSON.stringify(oldInterests)).split('"');
		var changedInterests = newI.filter(x => !oldI.includes(x));
		
		const d = new Date();
		let postId = user + d.getTime();
		// make it so it only posts new updates
		var postContent = req.body.firstname + " is now interested in " + changedInterests;
		var postImage = "none";
		var date = d.getTime().toString();
		if (changedInterests.length !== 0) {

			var columnsBy = [
			{
				column: 'date',
				value: date,
				type: 'N'
			},
			{
				column: 'postContent',
				value: postContent,
				type: 'S'
			},
			{
				column: 'postImage',
				value: postImage,
				type: 'S'
			},
			{
				column: 'postId',
				value: postId,
				type: 'S'
			},
			{
				column: 'postedTo',
				value: user,
				type: 'S'
			},
			{
				column: 'postLikes',
				value: [user],
				type: 'SS'
			}
			];
			var columnsTo = [
			{
				column: 'date',
				value: date,
				type: 'N'
			},
			{
				column: 'postContent',
				value: postContent,
				type: 'S'
			},
			{
				column: 'postImage',
				value: postImage,
				type: 'S'
			},
			{
				column: 'postId',
				value: postId,
				type: 'S'
			},
			{
				column: 'postedBy',
				value: user,
				type: 'S'
			},
			{
				column: 'postLikes',
				value: [user],
				type: 'SS'
			}
			];
			db.put('WallPostedBy', 'postedBy', user, columnsBy, function(err, data) {
				if (err) {
					console.log(err)
				  	//res.send("Error")
				} else if (data) {
					db.put('WallPostedTo', 'postedTo', user, columnsTo, function(err, data) {
						if (err) {
							console.log(err)
						  //res.send("Error")
						} else if (data) {
							db.put("InterestUpdates", 'username', foo, [], function(err, data) {
								if (err) {
									console.log(err)
								} else {
									
								}
							})
						} else {
							console.log(err)
						  	//res.send("Error")
						}
					});
				} else {
					console.log(err)
				  	//res.send("Error")
				}
			});
		}

		if (req.body.oldpassword === "" && req.body.newpassword === "") {
			console.log("not changing pw");
			columns.push({
				column: 'password',
				value: data[0].password.S,
				type: 'S'
			});
			db.put('Settings', 'username', foo, columns, function(err){
				if (err) {
					console.log(err);
					res.redirect('/');
				}
				else {
					res.redirect('/settings');
				}
			});
		}
		//change to password
		else {
			console.log("changing pw");
			console.log(req.body.oldpassword);
			console.log(security.decrypt(data[0].password.S));
			if(req.body.oldpassword === security.decrypt(data[0].password.S)){
				//TODO: add processing for new password here
				columns.push({
					column: 'password',
					value: security.encrypt(req.body.newpassword),
					type: 'S'
				});
				db.put('Settings', 'username', foo, columns, function(err){
					if (err) {
						console.log(err);
						res.redirect('/');
					}
					else {
						res.redirect('/settings');
					}
				});
			}
			else {
				res.redirect('/settings');
			}
		}
	});
	//no change to password
}

//function to process changes to profile image
var postProfileImage = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	const foo = req.session.userId;
	
	//TODO: remove interests from lookup list once properly implemented
	db.lookup('Settings', 'username', foo, ['email', 'birthday', 'affiliation', 'interests', 'password', 'friends', 'firstname', 'lastname'], function(err,data) {
		var columns = [
			{
				column: 'email',
				value: data[0].email.S,
				type: 'S'
			},
			{
				column: 'birthday',
				value: data[0].birthday.S,
				type: 'S'
			},
			{
				column: 'affiliation',
				value: data[0].affiliation.S,
				type: 'S'
			},
			{
				column: 'interests',
				value: data[0].interests.L,
				type: 'L'
			},
			{
				column: 'friends',
				value: data[0].friends.L,
				type: 'L'
			},
			{
				column: 'firstname',
				value: data[0].firstname.S,
				type: 'S'
			},
			{
				column: 'lastname',
				value: data[0].lastname.S,
				type: 'S'
			},
			{
				column: 'password',
				value: data[0].password.S,
				type: 'S'
			},
			{
				column: 'profileimage',
				value: req.body.imageURL,
				type: 'S'
			}
		];
		
		db.put('Settings', 'username', foo, columns, function(err){
			if (err) {
				console.log(err);
				res.redirect('/');
			}
			else {
				res.redirect('/profile/'+foo);
			}
		});
		
	});
	//no change to password
}

var getProfileImage = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	const user = req.params.user;
	db.lookup("Settings", "username", user, ['profileimage'], function(err, data){
		if(err || data.length===0){
			console.log(err);
			res.redirect('/');
		}
		else{
			if(data[0].profileimage === undefined) data[0].profileimage = "";
			res.send(JSON.stringify(data[0].profileimage.S));
		}
	});
}

var getUserFriends = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	var userID = req.params.user;
	db.lookup("Settings", "username", userID, ['friends', 'firstname', 'lastname'], function(err, data){
		if(err){
			console.log("errored out");
			console.log(err);
			res.send("bad");
		} else if(data.length == 0){
			res.send("bad");
		}
		else{
			console.log(data[0].friends);
			var children = []; data[0].friends.L.forEach(x => children.push({id: x.S, name: x.S}));
			var json = {
				"id": userID,
				"name": data[0].firstname.S + ' '+ data[0].lastname.S,
				"children": children,
	        	"data": []
	    	};
	    	res.send(json);
		}
	});
	
}

var getLogin = function(req, res) {
	if(verifyUser(req)) {
		res.redirect('/home');
	}
	else{
		res.redirect('/');
	}
}

var checkUser = function(req, res){
	db.lookup("Settings", "username", req.params.user, ['username'], function(err, data){
		if(err){
			console.log("errored out");
			console.log(err);
			res.send(JSON.stringify(false));
		} else{
			res.send(JSON.stringify(data.length === 0));
		}
	});
}

var getHeaderInfo = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	db.lookup("Settings", "username", req.session.userId, ['username', 'firstname', 'lastname'], function(err, data){
		if(err){
			console.log("errored out");
			console.log(err);
			res.send("bad");
		} else if(data.length == 0){
			res.send("bad");
		}
		else{
			res.send(data[0]);
		}
	});
}

var friendviz = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let userId = req.session.userId;
	db.lookup("Settings", "username", userId, ['friends'], function(err, data) {
		if (err) {
			console.log(err)
		} else {
			var friendsArr = [];
			console.log("Friends:");
			if (data.length > 0) {
				for (var i = 0; i < data[0].friends.L.length; i++) {
					var frId = data[0].friends.L[i].S
					friendsArr.push({"id":frId, "name":frId, "children": [], "data": []})
				}
			}
			var json = {"id": userId, "name": userId, "children": friendsArr, "data": []};
			res.send(json);
		}
	});
	/*var json = {"id": "alice","name": "Alice","children": [{
        "id": "bob",
            "name": "Bob",
            "data": {},
            "children": [{
            	"id": "dylan",
            	"name": "Dylan",
            	"data": {},
            	"children": []
            }, {
            	"id": "marley",
            	"name": "Marley",
            	"data": {},
            	"children": []
            }]
        }, {
            "id": "charlie",
            "name": "Charlie",
            "data": {},
            "children": [{
                "id":"bob"
            }]
        }, {
            "id": "david",
            "name": "David",
            "data": {},
            "children": []
        }, {
            "id": "peter",
            "name": "Peter",
            "data": {},
            "children": []
        }, {
            "id": "michael",
            "name": "Michael",
            "data": {},
            "children": []
        }, {
            "id": "sarah",
            "name": "Sarah",
            "data": {},
            "children": []
        }],
        "data": []
    };
    res.send(json);*/
}

var getFriends2 = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let userId = req.params.user;
	db.lookup("Settings", "username", userId, ['friends'], function(err, data) {
		if (err) {
			console.log(err)
		} else {
			var friendsArr = [];
			console.log("Friends:");
			if (data.length > 0) {
				for (var i = 0; i < data[0].friends.L.length; i++) {
					var frId = data[0].friends.L[i].S
					friendsArr.push({"id":frId, "name":frId, "children": [], "data": []})
				}
			}
			var json = {"id": userId, "name": userId, "children": friendsArr, "data": []};
			res.send(json);
		}
	});
    /*console.log(req.params.user);
    var newFriends = {"id": "alice","name": "Alice","children": [{
        "id": "james",
            "name": "James",
            "data": {},
            "children": [{
                "id": "arnold",
                "name": "Arnold",
                "data": {},
                "children": []
            }, {
                "id": "elvis",
                "name": "Elvis",
                "data": {},
                "children": []
            }]
        }, {
            "id": "craig",
            "name": "Craig",
            "data": {},
            "children": [{
                "id":"arnold"
            }]
        }, {
            "id": "amanda",
            "name": "Amanda",
            "data": {},
            "children": []
        }, {
            "id": "phoebe",
            "name": "Phoebe",
            "data": {},
            "children": []
        }, {
            "id": "spock",
            "name": "Spock",
            "data": {},
            "children": []
        }, {
            "id": "matt",
            "name": "Matthe",
            "data": {},
            "children": []
        }],
        "data": []
    };
    res.send(newFriends);*/

};

var searchUsername = function(req, res) {
	const searchTerm = req.body.searchTerm;
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	db.substring_lookup('username-index', 'Settings', 'firstname', searchTerm, ['username'], function(err,data1) {
		if (err) {
			console.log(err)
		}
		res.send(
			JSON.stringify(data1)
	  	);
  	});
}

var routes = { 
    get_main: getMain,  //general
    signup: signup, //general
    create_account: createAccount, //general
    check_login: checkLogin, //general
    check_user: checkUser,
    get_settings: getSettings, //general
    post_settings: postSettings, //general
    get_friends: getFriends, //general
    remove_friends: removeFriend, //general
    add_friends:addFriend, //general
		get_user_friends: getUserFriends, //general
		get_login: getLogin,
		get_logout: getLogOut,
		post_profile_image: postProfileImage,
		get_profile_image: getProfileImage,
		get_header_info: getHeaderInfo,
	friendviz: friendviz,
	get_friends_2: getFriends2,
	search_username: searchUsername
};


module.exports = routes;


