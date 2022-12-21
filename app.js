var express = require('express');
var routes_general = require('./routes/routes_general.js');
var routes_msg = require('./routes/routes_msg.js');
var routes_wall = require('./routes/routes_wall.js');
var routes_news = require('./routes/routes_news.js');
var session = require('express-session');

var db = require('./models/database.js');
var app = express();
var path = require("path");
var http = require("http").Server(app);
var serveStatic = require('serve-static');
var path = require('path');
const io = require("socket.io")(http);
var AWS = require('aws-sdk');
const { get_friends_2 } = require('./routes/routes_general.js');
AWS.config.update({region:'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient();



app.use(serveStatic(path.join(__dirname, 'public')));
const sessionMiddleware = session({secret: 'rin'})
app.use(express.urlencoded());
app.use(sessionMiddleware);
const wrap = middleware => (socket, next) => middleware(socket.request,{},next)
var people = {};
var people_to_id = {};

var addChatsToPerson = function(person, chat){
	
	db.lookup("GroupOfMember", "username",person,['id'], function(err, data){
			if(err){
				console.log(err);
			}else{
				
				
				data_arr = data[0].id.L
				inp = []
				data_arr.forEach(item => inp.push(item.S));
				inp.push(String(chat));
				const params = {
				    Key:{
						"username":person
					},
					TableName:"GroupOfMember",
					UpdateExpression: "set id = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
				if(err){
					console.log(err);
					return;
					}
			});
			
			console.log("succesfully uploaded data: ");
			console.log(person);
				console.log(chat);
				console.log(inp);
					
			}
			
		});
}
//app.use(express.bodyParser());
//app.use(express.static(path.join(__dirname, "public")))
io.use(wrap(sessionMiddleware));
io.on("connection", function(socket){
	
	socket.on("join", function(){
		
		people[socket.request.session.userId] = socket.id;
		console.log("join event!")
		console.log(people);
	
		
	});
	
	socket.on("disconnect", function(){
		delete people[socket.request.session.userId];
		
	});
	
	socket.on("initDM", function(receiver){
		
  // Get the current user's username
  let user = socket.request.session.userId;
  
  

  // Query the "requestsOfMembers" table for the specified receiver's chat requests
  db.lookup("requestsOfMembers", "username", receiver, ["people"], function(err, data) {
    if (err) {
      console.log(err);
    } else {
      // Update the "people" list for the receiver to include the current user's username
      var people = data[0].people.L;
      var inp = []
     people.forEach(item => inp.push(item.S));
      
     /* db.lookup("requestsOfMembers","username", user, ["people"], function(err,data){
	if(err){console.log(err)}else{
		var people_user = data[0].people.L;
		var people_user_extracted = [];
		people_user.forEach(item=> people_user_extracted.push(item.S));
		if(people_user_extracted.indexOf(receiver)!=-1){
			
			return;
		}
	}
})*/ //WIP check if requests are in already. 
      
      
      if(inp.indexOf(user)<0){
		inp.push(user);
	  }

      // Update the entry for the receiver in the "requestsOfMembers" table with the new "people" list
      const params = {
        Key: {
          "username": receiver
        },
        TableName: "requestsOfMembers",
        UpdateExpression: "set people = :r",
        ExpressionAttributeValues: {
          ":r": inp
        }
      };
      docClient.update(params, function(err, data) {
        if (err) {
          console.log(err);
          return;
        }
      });
    }
  });

  // Emit a "receiveDM" event to the specified receiver
  io.to(people[receiver]).emit("receiveDM", user);
});
		
		
		
		
		

	
	socket.on("startGC", function(users){
	
		const d = new Date();
		let id = d.getTime();
		console.log(id);
		console.log(d.getTime());
		var insert = [{
		column:'username',
		value:[{S:users[0]},{S:users[1]},{S:users[2]}],
		type:'L'
	}];
	var nameInsert = [{column:"gcname", value:"Groupchat id: "+String(id), type:"S"}, {column:"id", value:String(id), type:"S"}]
	
	
		db.put("newGroupMembers", "id",String(id), insert, function(err, success){
			if(err){
				console.log(err);
				return;
			} else{
				console.log("succesfully put item into newGroupMembers");
			}
		});
		
		addChatsToPerson(users[0],id);
		addChatsToPerson(users[1],id);
		addChatsToPerson(users[2],id);

		db.put("groupName", "id", String(id), nameInsert, function(err, success){
			if(err){
				console.log(err);
				return;
			} 
		});
		
	});
	
	var remove2from1 = function(person1, person2){
		
		db.lookup("requestsOfMembers", "username", person1, ["people"], function(err, data){
			if(err){
				console.log(err);
				return;
			} else{
				      var people = data[0].people.L;
				     var inp = []
				     people.forEach(item => inp.push(item.S));
				     var index = inp.indexOf(person2);
				     
				     if (index > -1) { // only splice array when item is found
					  inp.splice(index, 1); // 2nd parameter means remove one item only
					} else{
						console.log("I CANT SPLICE FUCK HELP");
					}
					
								 // Update the entry for the receiver in the "requestsOfMembers" table with the new "people" list
			      const params = {
			        Key: {
			          "username": person1
			        },
			        TableName: "requestsOfMembers",
			        UpdateExpression: "set people = :r",
			        ExpressionAttributeValues: {
			          ":r": inp
			        }
			      };
			      docClient.update(params, function(err, data) {
			        if (err) {
			          console.log(err);
			          return;
			        }
			      });
					
					
			}
		})
		
		
	}
	
	var addDMtoList = function(person1, person2){
		
		db.lookup("DMofMember", "username", person1, ["people"], function(err, data){
			
			if(err){
				console.log(err);
				return;
			} else{
				     var people = data[0].people.L;
				     
				   
				     var inp = []
				     people.forEach(item => inp.push(item.S));
				     
				     if(person1<person2){
					 inp.push(person1+","+person2);
				} else{
					inp.push(person2+","+person1);
				}
				
				   
					
								 // Update the entry for the receiver in the "requestsOfMembers" table with the new "people" list
			      const params = {
			        Key: {
			          "username": person1
			        },
			        TableName: "DMofMember",
			        UpdateExpression: "set people = :r",
			        ExpressionAttributeValues: {
			          ":r": inp
			        }
			      };
			      docClient.update(params, function(err, data) {
			        if (err) {
			          console.log(err);
			          return;
			        }
			      });
					
					
			}
			
			
			
			
		})
		
		
	}
	
	
	socket.on("startDM", function(person1){
		const d = new Date();
		let time = d.getTime();
		person2 = socket.request.session.userId;
		
		if(person1>person2){
			var temp = person1;
			person1 = person2;
			person2 = temp;
		}
		
		remove2from1(person1,person2);
		remove2from1(person2,person1);
		
		addDMtoList(person1, person2);
		addDMtoList(person2, person1);
		
		var columns = [
			{column: "id", value:person1+person2, type:"S"},
			{column:"from", value:"system", type:"S"},
			{column:"message",value:"start your chat here!", type:"S"},
			{column:"timestamp",value:String(time), type:"S"}
		]
		
		
		db.put("newMessageDM", "id", person1+person2, columns, function(err){
			if(err){
				console.log(err);
			}
		});
		console.log("emitting dmCreated!");
		io.to(socket.id).emit("dmCreated", [person1, person2]);
		io.to(people[person1]).emit("DM accepted", [person1, person2]);
		io.to(people[person2]).emit("DM accepted", [person1, person2]);
		
	});
	
	socket.on("roomChange", obj =>{
		console.log("currently in room: "+obj.prevId);
		console.log("joining: "+obj.id)
		if(obj.prevId!=undefined){
			socket.leave( obj.prevId);
		}
		socket.join(obj.id);
	});
	
	socket.on("leave room", id=>{
		
		db.lookup("GroupOfMember", "username", socket.request.session.userId, ["id"], function(err, data){
			
			if(err){
				console.log("error 1");
				console.log(err);
			} else{
				data_arr = data[0].id.L
				inp = []
				data_arr.forEach(item => inp.push(item.S));
				var index = inp.indexOf(id);
				inp.splice(index, 1);
				const params = {
				    Key:{
						"username":socket.request.session.userId
					},
					TableName:"GroupOfMember",
					UpdateExpression: "set id = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
				if(err){
					console.log("error 2");
					console.log(err);
					}
			});
			}
			
		})
		
		db.lookup("newGroupMembers", "id", id, ["username"], function(err, data){
			
			if(err){
				console.log("error 3");
				console.log(err);
			} else{
				data_arr = data[0].username.L
				inp = []
				data_arr.forEach(item => inp.push(item.S));
				var index = inp.indexOf(socket.request.session.userId);
				inp.splice(index, 1);
				console.log(inp)
				const params = {
				    Key:{
						"id":id
					},
					TableName:"newGroupMembers",
					UpdateExpression: "set username = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
				if(err){
					console.log("error 4");
					console.log(err);
					}
			});
			}
			
		})
		
		
	})
	
	socket.on("addFriend", obj =>{
		
		
		db.lookup("GroupOfMember", "username",obj.friend,['id'], function(err, data){

			if(err){
				console.log(err);
			}else{
				
				data_arr = data[0].id.L
				inp = []
				data_arr.forEach(item => inp.push(item.S));
				inp.push(String(obj.id));
				const params = {
				    Key:{
						"username":obj.friend
					},
					TableName:"GroupOfMember",
					UpdateExpression: "set id = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
				if(err){
					console.log(err);
					}
			});
					
			}
			
		});
		
		db.lookup("newGroupMembers", "id", obj.id, ["username"], function(err, data){
			if(err){
				console.log(err);
			}else{
				
				data_arr = data[0].username.L
				inp = []
				data_arr.forEach(item => inp.push(item.S));
				inp.push(obj.friend);
				
				const params = {
				    Key:{
						"id":obj.id
					},
					TableName:"newGroupMembers",
					UpdateExpression: "set username = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
					if(err){
						console.log(err);
						}
				});
					
			}
			
		});
		
		
	
		
	})
	
	/*socket.on("removeMember", obj =>{
		
		db.lookup("GroupOfMember", "username",obj.member,['id'], function(err, data){
			if(err){
				console.log(err);
			}else{
				
				data_arr = data[0].id.L
				inp = []
				data_arr.forEach(item => inp.push(item.S));
				var index = inp.indexOf(obj.id);
				inp.splice(index, 1);
				
				const params = {
				    Key:{
						"username":obj.member
					},
					TableName:"GroupOfMember",
					UpdateExpression: "set id = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
				if(err){
					console.log(err);
					}
			});
					
			}
			
		});
		
		db.lookup("newGroupMembers", "id", obj.id, ["username"], function(err, data){
			if(err){
				console.log(err);
			}else{
				
				data_arr = data[0].username.L
				inp = []
				data_arr.forEach(item => inp.push(item.S));
				var index = inp.indexOf(obj.member);
				inp.splice(index, 1);
				
				const params = {
				    Key:{
						"id":obj.id
					},
					TableName:"newGroupMembers",
					UpdateExpression: "set username = :r",
					ExpressionAttributeValues: {
						":r": inp
					}
				}
				docClient.update(params, function(err, data){
					if(err){
						console.log(err);
						}
				});
					
			}
			
		});
		
		io.to(obj.id).emit("leaveRoom",obj);
		
		
		
	
		
	});*/
	
	socket.on("chat message", obj => {
		const d = new Date();
		let time = d.getTime();
		//let user = "zuck";
		let user = socket.request.session.userId;
		console.log(user);
		console.log("\n\n\n");
		
		
		var columns = [
			{column: "id", value:obj.sender, type:"S"},
			{column:"from", value:user, type:"S"},
			{column:"message",value:obj.text, type:"S"},
			{column:"timestamp",value:String(time), type:"S"}
		]
		obj.text = user+": "+obj.text;
		
		
		
		db.put("newMessage", "id", obj.sender, columns, function(err){
			if(err){
				console.log(err);
			}
		})
		
		
		
		io.to(obj.sender).emit("chat message", obj);
	})
	
	socket.on("chat message DM", obj => {
		const d = new Date();
		let time = d.getTime();
		//let user = "zuck";
		let user = socket.request.session.userId;
		
		var columns = [
			{column: "id", value:obj.sender, type:"S"},
			{column:"from", value:user, type:"S"},
			{column:"message",value:obj.text, type:"S"},
			{column:"timestamp",value:String(time), type:"S"}
		]
		obj.text = user+": "+obj.text;
		
		db.put("newMessageDM", "id", obj.sender, columns, function(err){
			if(err){
				console.log(err);
			}
		})
		
		
		
		io.to(obj.sender).emit("chat message", obj);
	})
	
	
	
	
})

io.use(wrap(sessionMiddleware));
app.get('/', routes_general.get_main);
app.get('/logout', routes_general.get_logout);
app.get('/settings', routes_general.get_settings);
app.post('/settings-update', routes_general.post_settings);
app.post('/updateProfileImage', routes_general.post_profile_image); 
app.get('/getProfileImage/:user', routes_general.get_profile_image); 
app.get('/getHeaderInfo', routes_general.get_header_info);
app.get('/signup', routes_general.signup);
app.post('/createaccount', routes_general.create_account);
app.post('/checklogin', routes_general.check_login);
app.get("/friends",routes_general.get_friends);
app.post("/removeFriend",routes_general.remove_friends);
app.post("/addFriend",routes_general.add_friends);
app.get("/messages", routes_msg.get_messages);
app.post("/messageGroups", routes_msg.post_message_groups);
app.post("/messageContents", routes_msg.post_message_contents);
app.post("/makePost", routes_wall.make_post);
app.get("/wall/:user", routes_wall.view_wall);
app.get("/getComments/:postid", routes_wall.get_comments);
app.get("/profile/:user", routes_wall.view_profile);
app.get("/posts/:user", routes_wall.view_posts);
app.post("/makeLike", routes_wall.make_like);
app.get("/getLikes/:postid", routes_wall.get_likes);
app.get("/wallGetPosts/:user", routes_wall.get_posts);
app.get("/getUserPosts/:user", routes_wall.get_user_posts);
app.post("/makeComment", routes_wall.make_comment);
app.get("/searchUsername",routes_general.search_username);
app.post("/message_Submit", routes_msg.messageSubmit);
app.post("/groupUsers", routes_msg.post_users_groups);
app.get("/getUserFriends/:user", routes_general.get_user_friends);
app.get('/home', routes_wall.get_home);
app.get('/getPostsHome', routes_wall.get_posts_home);
app.post("/getFriends",routes_msg.my_friends);
app.post("/getFriendsOnline", function(req, res){
	if (req.session.userId == undefined) {
		res.redirect('/'); //or whatever the login page is
	}
	let user = req.session.userId;
	console.log("user: ");
	console.log(user);
	console.log(people);
	
	db.lookup("Settings", "username", user, ['friends'], function(err, data){
		if (err) {
			console.log("err1");
			console.log(err);
		} else {
			
			inp = [];
			db.lookup("DMofMember", "username", user, ['people'], function(err, data_chats){
				
				if(err){
					console.log("err2");
					console.log(err);
				} else{
					
					actual_chats = [];
					data_chats[0].people.L.forEach(item =>{
						actual_chats.push(item.S.split(",")[0]);
						actual_chats.push(item.S.split(",")[1]);
					})
					
					data[0].friends.L.forEach(item=>{
						if(people[item.S]!=undefined && item.S!=user && (actual_chats.indexOf(item.S)==-1)){
							console.log("pushed: ")
							console.log(item.S);
							inp.push(item.S);
						}
						
					})
					
					res.send(JSON.stringify(inp));
					
					
					
				}
				
				
			})
			
			
			/*data[0].friends.L.forEach(item => {
				
				if(people[item.S]!=undefined && item.S!=user){
					inp.push(item.S);
				}
				});
				
			res.send(JSON.stringify(inp));*/
		}
	});
});
app.post("/currMembersOfRoom", routes_msg.currMembers);
app.post("/DMContents",routes_msg.post_dm_contents);

app.post("/currMembersOfRoom", routes_msg.currMembers)

app.post("/currMembersOfRoom", routes_msg.currMembers);
app.get('/checkUser/:user', routes_general.check_user);
app.post("/chatRequests", routes_msg.chatRequests);
app.post("/getDMGroup", routes_msg.getDMGroup);

app.get("/test", function(req, res){res.render('frontend_test.ejs')});

app.get("/user_news", routes_news.get_news_for_user);
app.post("/news_search", routes_news.get_news_search);
app.get("/get_article/:artid", routes_news.get_article);
app.get("/news", routes_news.view_news);
app.post("/getGcName/:id", routes_msg.getGCName);
app.post("/changeName/:name/:id", routes_msg.changeGcName);

app.get("/news_is_liked/:artid", routes_news.is_liked);
app.post("/news_like", routes_news.like_article);

app.get('/login', routes_general.get_login);

app.get('/friendvisualization', routes_general.friendviz);

app.get('/getFriends2/:user', get_friends_2);
app.post("/getFriendsList", function(req,res){
	db.lookup("Settings", "username", req.session.userId, ['friends'], function(err, data){
		if(err){
			console.log(err);
			
		} else{
			const dataitem = data[0];
			friendsList = dataitem.friends.L;
			var online = [];
			for(var i = 0; i<friendsList.length; i++){
				if(people[friendsList[i].S]!=undefined){
					online.push(friendsList[i].S);
				}
			
			}
			res.send([dataitem.friends.L, online]);
		}
	});
});

app.get("/searchTermSuggest", function(req,res){
	db.partial_DB_lookup("k", ["username"], function(err, data){
		if(err){
			console.log(err)
		}else{
			console.log("partialqueryresults");
			console.log(data[0]);
			res.send(data[0]);
		}
	});
})

app.get("/getPeople", function(req, res){
	
	db.scan("Settings", ["username"], function(err, data){
		if(err){
			console.log("asjlsdfk")
			console.log(err);
		} else{
			res.send(data);
		}
	})
})

//catch all invalid urls
//app.all('*', routes_general.get_main);

http.listen(8080);
console.log("Running on port 8080!");
