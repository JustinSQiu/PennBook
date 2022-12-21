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

var makePost = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	} else {
		let user = session.userId;
		const d = new Date();
		let postId = user + d.getTime();
		var postContent = req.body.text;
		var postImage = req.body.image;
		if (typeof(req.body.postedTo) === 'undefined') {
			var wall = user;
		} else {
			var wall = req.body.postedTo;
		}
		if (postContent === "") {
			res.send("Error")
		} else {
			var date = d.getTime().toString();
		  
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
				value: wall,
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
				  res.send("Error")
				} else if (data) {
					db.put('WallPostedTo', 'postedTo', wall, columnsTo, function(err, data) {
						if (err) {
							console.log(err)
						  res.send("Error")
						} else if (data) {
							res.send({
								status: "Success",
								user: user,
								date: date
							});
						} else {
							console.log(err)
						  res.send("Error")
						}
					});
				} else {
					console.log(err)
				  res.send("Error")
				}
			});
		}
	}
}

var makeComment = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	} else {
		const user = req.session.userId;
		const d = new Date();
		let commentId = user + d.getTime();
		var commentContent = req.body.text;
		var parentCreator = req.body.parentCreator;
		var parentDate = req.body.parentDate;
		var parentId = parentCreator + parentDate;
		var rootCreator = req.body.rootCreator;
		var rootDate = req.body.rootDate;
		var rootId = rootCreator + rootDate;
		var date = d.getTime() + '';
	  
		var columns = [
		{
			column: 'date',
			value: date,
			type: 'N'
		},
		{
			column: 'content',
			value: commentContent,
			type: 'S'
		},
		{
			column:'creator',
			value: user,
			type: 'S'
		},
		{
			column: 'commentId',
			value: commentId,
			type: 'S'
		},
		{
			column: 'parentCreator',
			value: parentCreator,
			type: 'S'
		},
		{
			column: 'parentId',
			value: parentId,
			type: 'S'
		},
		{
			column: 'parentDate',
			value: parentDate,
			type: 'N'
		},
		{
			column: 'rootParentId',
			value: rootId,
			type: 'S'
		},
		{
			column: 'rootParentCreator',
			value: rootCreator,
			type: 'S'
		},
		{
			column: 'rootParentDate',
			value: rootDate,
			type: 'N'
		}
		];
		db.put('postComments', 'commentId', commentId, columns, function(err, data) {
			if (err) {
				console.log(err)
			  	res.send("Error")
			} else if (data) {
				res.send({
					status: "Success",
					user: user,
					date: date
				})
			} else {
				console.log(err)
			  	res.send("Error")
			}
		});
	}
}

var getHome = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	const user = req.session.userId;
	db.lookup("Settings", "username", user, ['firstname', 'lastname', 'friends'], function(err, data){
		if(err){
			console.log("errored out");
			console.log(err);
			res.send("bad");
		} else if(data.length == 0){
			res.send("bad");
		}
		else{

			//console.log(data[0].friends);
			//data[0].friends.L.forEach(x => children.push({id: x.S, name: x.S}));
			
			//TODO: replace dummy feed with promises from queries, use ajax?
			res.render('home.ejs',{
				user: req.session.userId,
				firstname: data[0].firstname.S,
				lastname: data[0].lastname.S
			});
		}
	});
}

var getUserPosts = function(req, res){
	const user = req.params.user;
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	db.lookup('WallPostedBy', 'postedBy', user, ['postedBy', 'postImage', 'postContent', 'date', 'postId', 'postedTo'], function(err,data) {
		if (err) {
			console.log(err)
		}
		res.send(
			JSON.stringify(data)
	  	);
	});
}

var getPostsHome = function(req, res) {
	const user = req.session.userId;
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	db.lookup("Settings", "username", user, ['firstname','lastname','friends'], function(err, data){
		if (err) {
			console.log(err);
		} else {
			var err = undefined;
			if (req.query.error===1) {
				err = "friend does not exist!";
			}
			const dataitem = data[0];
			var friendsProcessed = [];
			var friends = dataitem.friends.L;
			friends.forEach(elt => friendsProcessed.push(elt.S));
			var searchItems = [];
			searchItems = searchItems.concat(friendsProcessed);
			searchItems = searchItems.concat(user);
			var allData = [];
			db.lookup('WallPostedTo', 'postedTo', user, ['postedBy', 'postImage', 'postContent', 'date', 'postId', 'postedTo'], function(err,data1) {
				if (err) {
					console.log(err);
				}
				var promises = [];
				//console.log("Data 1: " + data1);
				allData = allData.concat(data1);
				searchItems.forEach(item => 
					promises.push(new Promise(function(resolve, reject) {
						db.lookup('WallPostedBy', 'postedBy', item, ['postedBy', 'postImage', 'postContent', 'date', 'postId', 'postedTo'], function(err,data2) {
							if (err) {
								console.log(err)
							}
							allData = allData.concat(data2);
							//console.log("New data: " + data2);
							resolve();
						})
					}))
				);
				Promise.all(promises).then(() => {
					//console.log(allData);
					var uniqueIds = [];
					const uniqueData = allData.filter(elt => {
						//console.log(JSON.stringify(elt));
						if (typeof elt.postId === 'undefined') {
							return false;
						}
						if (!uniqueIds.includes(elt.postId.S)) {
							uniqueIds.push(elt.postId.S)
							return true;
						}
						//console.log(elt.postId.S);
						return false;
					});
					//console.log(uniqueIds);
					//console.log(uniqueData);
					res.send(
						JSON.stringify(uniqueData)
				  	);
				})
		  	});
		}
	});
}

var getPostsWall = function(req, res) {
	const user = req.params.user;
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	db.lookup('WallPostedTo', 'postedTo', user, ['postedBy', 'postImage', 'postContent', 'date', 'postId', 'postedTo'], function(err,data1) {
		if (err) {
			console.log(err)
		}
		db.lookup('WallPostedBy', 'postedBy', user, ['postedBy', 'postImage', 'postContent', 'date', 'postId', 'postedTo'], function(err,data2) {
			if (err) {
				console.log(err)
			}
			var data = data1.concat(data2)
			var uniqueIds = [];
			const uniqueData = data.filter(elt => {
				if (typeof elt.postId === 'undefined') {
					return false;
				}
				if (!uniqueIds.includes(elt.postId.S)) {
					uniqueIds.push(elt.postId.S)
					return true;
				}
				return false;
			});
			res.send(
				JSON.stringify(uniqueData)
		  	);
		});
  	});
}

var viewPostsWall = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	} else {
		db.lookup("Settings", "username", req.params.user, ['firstname','lastname','friends','affiliation','birthday', 'interests'], function(err, data2){
			if(err || data2.length==0) {
				res.redirect('/');
			}
			else{
				db.lookup("Settings", "username", req.session.userId, ['firstname','lastname', 'friends'], function(err, data){
					if(err || data.length==0) {
						res.redirect('/');
					}
					else {
						res.render('wall.ejs', {
							user: req.session.userId, 
							firstname: data[0].firstname.S,
							lastname: data[0].lastname.S,
							friends: data[0].friends.L,
							wall: req.params.user,
							tab: 'wall',
							profile: data2[0]
						});
					}
				});
			}
		});
	}
}

var viewUserPosts = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	} else {
		db.lookup("Settings", "username", req.params.user, ['firstname','lastname','friends','affiliation','birthday', 'interests'], function(err, data2){
			if(err || data2.length==0) {
				res.redirect('/');
			}
			else{
				db.lookup("Settings", "username", req.session.userId, ['firstname','lastname','friends'], function(err, data){
					if(err || data.length==0) {
						res.redirect('/');
					}
					else {
						res.render('wall.ejs', {
							user: req.session.userId, 
							firstname: data[0].firstname.S,
							lastname: data[0].lastname.S,
							friends: data[0].friends.L,
							wall: req.params.user,
							tab: 'posts',
							profile: data2[0]
						});
					}
				});
			}
		});
	}
}

var viewUserProfile = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	} else {
		db.lookup("Settings", "username", req.params.user, ['firstname','lastname','friends','affiliation','birthday', 'interests'], function(err, data2){
			if(err || data2.length==0) {
				res.redirect('/');
			}
			else{
				db.lookup("Settings", "username", req.session.userId, ['firstname','lastname', 'friends'], function(err, data){
					if(err || data.length==0) {
						res.redirect('/');
					}
					else {
						res.render('wall.ejs', {
							user: req.session.userId, 
							firstname: data[0].firstname.S,
							lastname: data[0].lastname.S,
							friends: data[0].friends.L,
							wall: req.params.user,
							tab: 'profile',
							profile: data2[0]
						});
					}
				});
			}
		});
	}
}

var getComments = function(req, res) {
	const rootParentId = req.params.postid;
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	db.secondaryLookup('rootParentId-index', 'postComments', 'rootParentId', rootParentId, ['commentId', 'content', 'creator', 'date', 'parentCreator', 'parentDate', 'parentId', 'rootParentCreator', 'rootParentDate'], function(err,data1) {
		if (err) {
			console.log(err)
		}
		res.send(
			JSON.stringify(data1)
	  	);
  	});
}

var makeLike = function(req, res) {
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	} else {
		const user = session.userId;
		let postId = req.body.parentId;

		db.secondaryLookup('postId-index', 'WallPostedTo', 'postId', postId, ['postedTo', 'date', 'postContent', 'postedBy', 'postId', 'postImage', 'postLikes'], function(err, data) {
			if (err) {
				console.log(err)
			  	res.send("Error")
			} else if (data) {
				//console.log(data);
				var postLikes = data[0].postLikes.SS;
				//console.log(postLikes);
				var likesSet = new Set(postLikes);
				if (likesSet.has(user)) {
					likesSet.delete(user);
				} else {
					likesSet.add(user);
				}
				var likes = Array.from(likesSet);
				//console.log(likes);
				var columnsBy = [
				{
					column: 'date',
					value: data[0].date.N,
					type: 'N'
				},
				{
					column: 'postContent',
					value: data[0].postContent.S,
					type: 'S'
				},
				{
					column: 'postImage',
					value: data[0].postImage.S,
					type: 'S'
				},
				{
					column: 'postId',
					value: data[0].postId.S,
					type: 'S'
				},
				{
					column: 'postedTo',
					value: data[0].postedTo.S,
					type: 'S'
				},
				{
					column: 'postLikes',
					value: likes,
					type: 'SS'
				}		
				];
				var columnsTo = [
				{
					column: 'date',
					value: data[0].date.N,
					type: 'N'
				},
				{
					column: 'postContent',
					value: data[0].postContent.S,
					type: 'S'
				},
				{
					column: 'postImage',
					value: data[0].postImage.S,
					type: 'S'
				},
				{
					column: 'postId',
					value: data[0].postId.S,
					type: 'S'
				},
				{
					column: 'postedBy',
					value: data[0].postedBy.S,
					type: 'S'
				},
				{
					column: 'postLikes',
					value: likes,
					type: 'SS'
				}	
				];
				db.put('WallPostedBy', 'postedBy', data[0].postedBy.S, columnsBy, function(err, data1) {
					if (err) {
						console.log(err)
					  	res.send("Error")
					} else if (data) {
						db.put('WallPostedTo', 'postedTo', data[0].postedTo.S, columnsTo, function(err, data2) {
							if (err) {
								console.log(err)
							  	res.send("Error")
							} else if (data) {
								res.send({
									status: "Success",
									likesList: likes
								});
							} else {
								console.log(err)
							  res.send("Error")
							}
						});
					} else {
						console.log(err)
					  res.send("Error")
					}
				});
			} else {
				console.log(err)
			  	res.send("Error")
			}
		});
	}
}

var getLikes = function(req, res) {
	const rootParentId = req.params.postid;
	if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
	db.secondaryLookup('postId-index', 'WallPostedBy', 'postId', rootParentId, ['postLikes'], function(err,data1) {
		if (err) {
			console.log(err)
		}
		res.send(
			JSON.stringify(data1)
	  	);
  	});
}

var routes = {
   	make_post: makePost, 
	view_wall: viewPostsWall, 
	view_posts: viewUserPosts,
	view_profile: viewUserProfile,
	get_home: getHome, 
	get_posts_home: getPostsHome,
	make_comment: makeComment, 
	get_posts: getPostsWall,
	get_user_posts: getUserPosts,
	get_comments: getComments,
	make_like: makeLike,
	get_likes: getLikes
};
  
module.exports = routes;

