var db = require('../models/database.js');
var security = require('../models/cipher.js');
var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient();

var verifyUser = function(req) {
	var session = req.session;
	if(!session.userId) {
		return false;
	}
	return true;
}

var getMessages = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let user = session.userid;
	//let user = "zuck";
	res.render('messages.ejs', {user:user});
};

var postMessageGroups = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let user = req.session.userId;
	//console.log(user)
	//console.log("\n\n\n\n");
	//let user = "zuck";
	db.lookup("GroupOfMember", "username", user, ['id'], function(err, data){
		if (err) {
			console.log(err);
		} else {


			if(!data[0]){
				res.send(JSON.stringify("no groups yet!"));
			}else{
				res.send(JSON.stringify(data[0]));
			}

			
		}
	});
};

var getGcName = function(req, res){
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}

	db.lookup("groupName", "id", req.params.id, ["gcname"], function(err, data){
		if(err){
			console.log(err);
			res.send(JSON.stringify("null"));
		}else{

			if(!data[0]){
				res.send(JSON.stringify("Groupchat id: "+req.params.id));
			} else{
				res.send(JSON.stringify(data[0].gcname.S));
			}

		}
	})


}



var postDMGroups = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let user = session.userId;
	//console.log(user)
	//console.log("\n\n\n\n");
	//let user = "zuck";
	db.lookup("DMofMember", "username", user, ['people'], function(err, data){
		if (err) {
			console.log(err);
		} else {
			res.send(JSON.stringify(data));
		}
	});
};

var changeGcName = function(req,res){
	console.log("aljkefhljaksdhfjklasdhjklfashlkjfhsakldf")
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let user = session.userId;



	const params = {
		Key:{
			"id":req.params.id
		},
		TableName:"groupName",
		UpdateExpression: "set gcname = :r",
		ExpressionAttributeValues: {
			":r": req.params.name
		}
	}

	docClient.update(params, function(err, data){
	if(err){
		console.log(err);
		return;
		}
});
res.send();

}


var getChatRequests = function(req, res) {
  // Verify that the user is authenticated
  if (!verifyUser(req)) {
    res.redirect('/?error=2');
    return;
  }

  // Get the user's session ID
  let user = req.session.userId;

  // Query the "requestsOfMembers" table for the user's chat requests
  db.lookup("requestsOfMembers", "username", user, ["people"], function(err, data) {
    if (err) {
      console.log(err);
      res.send(JSON.stringify([]));
    } else {
      // Send the user's chat requests as a response
      res.send(JSON.stringify(data[0]));
    }
  });
};

var myFriends = function(req,res){
	
	if (req.session.userId == null) {
		res.redirect('/'); //or whatever the login page is
	}
	let user = session.userId;
	console.log(req.session.people);
	
	db.lookup("Settings", "username", user, ['friends'], function(err, data){
		if (err) {
			console.log(err);
		} else {
			
			res.send(JSON.stringify(data[0].friends.L));
		}
	});
	
	
}


var postUsersOfGroups = function(req, res){
	
	
}

var postMessageContents = function(req, res){
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let user = session.userId;
	//let user = "zuck";
	var id = req.body.id;
	if (!id) {
		res.send(JSON.stringify([]));
	} else {
		db.lookup("newMessage", "id", id.toString(), ['from', 'message'], function(err, data){
			if (err) {
				console.log(err);
				res.send(JSON.stringify([]));
			} else {
				//console.log(data);
				res.send(JSON.stringify(data));
			}
		});
	}
};




var postDMContents = function(req, res){
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	let user = session.userId;
	//let user = "zuck";
	var id = req.body.id;
	if (!id) {
		res.send(JSON.stringify([]));
	} else {
		db.lookup("newMessageDM", "id", id, ['from', 'message'], function(err, data){
			if (err) {
				console.log(err);
				res.send(JSON.stringify([]));
			} else {
				//console.log(data);
				res.send(JSON.stringify(data));
			}
		});
	}
};

var sendMessage = function(req, res){
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	const d = new Date();
	let time = d.getTime();
	let user = "zuck";
	console.log("sendMessage\n\n\n\n\n\n\n")
	console.log(req.body);
	res.send("hello");
	var columns = [
		{column: "id", value:req.body.id, type:"S"},
		{column:"from", value:user, type:"S"},
		{column:"message",value:req.body.message, type:"S"},
		{column:"timestamp",value:String(time), type:"S"}
	]
	db.put("newMessage", "id", req.body.id, columns, function(err){
		if(err){
			console.log(err);
		}
	})	
}

var currMembers = function (req, res){
	let id = req.body.id;
	
	db.lookup("newGroupMembers", "id", String(id), ["username"], function(err,data){
		if(err){
			console.log(err);
		}else{
			console.log(data[0]);
			res.send(JSON.stringify(data[0].username));
		}
	})
	
	
}

var routes = { 
   
	get_messages: getMessages, //msg
	post_message_contents: postMessageContents, //msg
	post_message_groups: postMessageGroups, //msg
	messageSubmit: sendMessage, //msg
	post_users_groups: postUsersOfGroups,
	my_friends:myFriends, //msg
	currMembers:currMembers,
	post_dm_contents:postDMContents,
	chatRequests:getChatRequests,
	getDMGroup:postDMGroups,
	getGCName:getGcName,
	changeGcName:changeGcName
};
  
module.exports = routes;