const postHTML = $(document.createElement('div'));
const commentHTML = $(document.createElement('div'));
const newsHTML = $(document.createElement('div'));

//how frequent we get news articles compared to posts
const newsFrequency = 4;
var newsIndex = 1;

postHTML.load('../html/new_post.html');
commentHTML.load('../html/new_comment.html');
newsHTML.load('../html/new_news.html');

//store the posts and news data here
var rootMap = new Map();
var commentRoots = []; //list of roots to maintain comments for


function toDateTime(secs) {
	var t = new Date();
    t.setTime(secs);
    return t.toString();
}
function toMapKey(foo) {
	if(foo===null) return 'gibberish';
	return foo.creator+'|||'+foo.date.toString();
}

function queryNews(){
	$.getJSON('/user_news', function(data) {
		//console.log(data);
		data.forEach(x=>x.type='news');
		var promises = [];
		data.forEach(item => 
			promises.push(new Promise(function(resolve, reject) {
				$.getJSON('/get_article/'+item.articleId.N, function(data2) {
					//console.log(data2);
					if(data2 !== null && data2.length>0){
						item.data2 = data2;
					}
					resolve();
				});
			}))
		);
		Promise.all(promises).then(() => {
			//console.log(data);
			generateCommentTree(data);
		}); 
		/*// code to get comments
		// data.forEach(x=>x.type='post');
		// console.log(data);
		// var promises = [];
		// data.forEach(item => 
		// 	promises.push(new Promise(function(resolve, reject) {
		// 		$.getJSON('/getComments/'+item.postId.S, function(data2) {
		// 			if(data2 !== null){
		// 				console.log(data2);
		// 				data2.forEach(x => x.type='comment');
		// 				data = data.concat(data2);
		// 			}
		// 			resolve();
		// 		});
		// 	}))
		// );
		// Promise.all(promises).then(() => {
		// 	console.log(data);
		// 	generateCommentTree(data);
		// }); */
	});
}

function generateCommentTree(data) {
	var news_data = []
	var post_data = [];
	for (const item of data) {
		if(item.type === 'news') news_data.push(item);
		else post_data.push(item);
	}
	post_data.sort(function(x, y) {
	  	if (Number(x.date.N) > Number(y.date.N)) {
	    	return 1;
	  	}
	  	if (Number(x.date.N) < Number(y.date.N)) {
	    	return -1;
	  	}
	  	if(x.postedBy.S > y.postedBy.S) {
	  		return 1;
	  	}
	  	return -1;
	});


	for(const item of post_data) {
		//key to insert into post data map
		/*var itemKey = {
			creator: item.postedBy.S,
			date: Number(item.date.N)
		};*/
		//formatted information
		var itemObj;
		if(item.type === 'post'){
			itemObj = {
				type: 'post', 
				creator: item.postedBy.S, 
				date: Number(item.date.N), 
				postedTo: item.postedTo.S+"'s wall",
				likes: item.likes,
				clientliked: item.clientliked,
				numcomments: 0,
				data: {
					text: item.postContent.S,
					image: item.postImage.S
				}
			};
			//adds the post html to the page
			insertPost(itemObj, null);
		}
		//WIP
		else if(item.type === 'comment'){
			itemObj = {
				type: 'comment', 
				creator: item.creator.S, 
				date: Number(item.date.N),
				parent: { 
					creator: item.parentCreator.S,
					date: Number(item.parentDate.N)
				},
				root: {
					creator: item.rootParentCreator.S,
					date: Number(item.rootParentDate.N)
				},
				likes: 0,
				data: {
					text: item.content.S
				}
			};
			//adds the comment html under the comment section of its parent
			insertComment(itemObj);
		}
	}

	for(const item of news_data) {
		if(item.data2 && item.data2.length>0){
			itemObj = {
				type: 'news', 
				articleId: item.articleId.N, 
				date: Number(item.publish_date.N), 
				likes: "WIP",
				author: item.data2[0].authors.S,
				topic: item.data2[0].category.S,
				headline:  item.data2[0].headline.S,
				link: item.data2[0].link.S,
				summary: item.data2[0].short_description.S,
				numcomments: 0
			};
			insertNews(itemObj);
		}
	}
	updateLikes();
}

function generateNewsSearchData1(news_data) {
	$('#displayed-news').empty();
	for(const item of news_data) {
		itemObj = {
			type: 'news', 
			articleId: item[0].articleId.N, 
			date: Number(item[0].publish_date.N), 
			likes: "WIP",
			author: item[0].authors.S,
			topic: item[0].category.S,
			headline:  item[0].headline.S,
			link: item[0].link.S,
			summary: item[0].short_description.S,
			numcomments: 0
		};
		console.log(itemObj);
		insertNewsSearch(itemObj);
	}
	updateLikes();
}


/*function comparePosts(newData) {
	var news_data, post_data = [];
	for (const item of newData) {
		if(item.type === 'news') news_data.push(item);
		else post_data.push(item);
	}
	post_data.sort(function(x, y) {
	  	if (Number(x.date.N) > Number(y.date.N)) {
	    	return 1;
	  	}
	  	if (Number(x.date.N) < Number(y.date.N)) {
	    	return -1;
	  	}
	  	if(x.postedBy.S > y.postedBy.S) {
	  		return 1;
	  	}
	  	return -1;
	});

	var lastPost = null;

	//we will assume that the new data coming in will be newer than the old data
	for(const item of post_data) {
		if(item.type === 'post'){
			insertPost(item, lastPost);
			lastPost = {creator: item.creator, date: item.date};
		}
		else if(item.type === 'comment'){
			insertComment(item);
		}
	}

}*/

//manual ejs, but since ejs is template we can't use that here :(
function generatePostHTML(item) {
	//console.log(item);
	const IDTag = item.creator+'||'+item.date;
	const commentIDTag = IDTag+'||comment';
	const replyIDTag = IDTag+'||reply';
	const commentsectionIDTag = IDTag+'||commentsection';
	const numcommentsIDTag = IDTag+'||numcomments';
	const likeTag = item.creator+item.date+"||likes";
	const toggleLike = item.creator+item.date+'||togglelike';

	var ret = postHTML.clone();
	ret.attr('id', IDTag);
	setAvatar(item.creator, ret.find('sl-avatar').not('.reply-avatar'));
	setAvatar(CLIENT_USER, ret.find('.reply-avatar'));

	ret.find(".text-creator").text(item.creator);
	ret.find(".text-creator").attr('onclick', "window.location.href = '/profile/"+item.creator+"'");
	ret.find(".text-creator").removeClass("text-creator");

	ret.find(".date-date").attr('date', toDateTime(item.date));
	ret.find(".date-date").removeClass("date-date");

	ret.find(".text-postedto").text(item.postedTo);
	ret.find(".text-postedto").attr('onclick', "window.location.href = '/wall/"+item.postedTo.slice(0, -7)+"'");
	ret.find(".text-postedto").removeClass("text-postedto");

	ret.find(".text-textcontent").text(item.data.text);
	ret.find(".text-textcontent").removeClass("text-textcontent");

	if(item.data.image==='none') {
		ret.find('.image-imageContent').hide();
	}
	else {
		ret.find(".card-image").attr('src', item.data.image);
	}
	ret.find('.image-imageContent').removeClass('image-imageContent');
	
	ret.find(".text-numcomments").text(item.numcomments + ' comments');
	ret.find(".text-numcomments").attr('id', numcommentsIDTag);
	ret.find(".text-numcomments").removeClass("text-numcomments");

	ret.find(".text-likes").text(item.likes);
	ret.find(".text-likes").attr('id', likeTag);
	ret.find(".text-likes").removeClass("text-likes");

	ret.find(".onclick-hide").attr('onclick',
		"document.getElementById('"+IDTag+"').style.display = 'none'");
	ret.find(".onclick-hide").removeClass('onclick-hide');

	ret.find(".onclick-like").attr('onclick',
		"mainPostLike('"+item.creator+"','"+item.date+"')");
	ret.find(".onclick-like").attr('id', toggleLike);
	ret.find(".onclick-like").removeClass('onclick-like');

	ret.find(".onclick-commentidtag").attr('onclick', 
		"document.getElementById('"+commentIDTag+"').style.display='flex';");
	ret.find(".onclick-commentidtag").removeClass("onclick-commentidtag");

	ret.find(".id-commentidtag").attr('id', commentIDTag);
	ret.find(".id-commentidtag").removeClass("id-commentidtag");

	ret.find(".id-replyidtag").attr('id', replyIDTag);
	ret.find(".id-replyidtag").removeClass("id-replyidtag");
	
	ret.find(".onclick-newcomment").attr('onclick', 
		"mainNewComment('"+item.creator+"','"+item.date+"')");
	ret.find(".onclick-newcomment").removeClass("onclick-newcomment");

	ret.find(".onclick-clearcomment").attr('onclick', 
		"document.getElementById('"+commentIDTag+"').style.display='none';document.getElementById('"+replyIDTag+"').value = '';");
	ret.find(".onclick-clearcomment").removeClass("onclick-clearcomment");

	ret.find(".id-commentsection").attr('id', commentsectionIDTag);
	ret.find(".id-commentsection").removeClass("id-commentsection");

	return ret;
}

function generateCommentHTML(item) {
	const IDTag = item.creator+'||'+item.date;
	const commentIDTag = item.creator+'||'+item.date+'||comment';
	const replyIDTag = item.creator+'||'+item.date+'||reply';
	const commentsectionIDTag = item.creator+'||'+item.date+'||commentsection';

	var ret = commentHTML.clone();
	ret.attr('id', IDTag);
	setAvatar(item.creator, ret.find('sl-avatar').not('.reply-avatar'));
	setAvatar(CLIENT_USER, ret.find('.reply-avatar'));

	ret.find(".text-creator").text(item.creator);
	ret.find(".text-creator").attr('onclick', "window.location.href = '/profile/"+item.creator+"'");
	ret.find(".text-creator").removeClass("text-creator");

	ret.find(".text-textcontent").text(item.data.text);
	ret.find(".text-textcontent").removeClass("text-textcontent");

	ret.find(".id-commentidtag").attr('id', commentIDTag);
	ret.find(".id-commentidtag").removeClass("id-commentidtag");

	// ret.find(".onclick-like").attr('onclick',
	// 	"mainLike('"+item.creator+"','"+item.date+"',false)");
	ret.find(".onclick-like").removeClass('onclick-like');

	ret.find(".onclick-commentidtag").attr('onclick', 
		"document.getElementById('"+commentIDTag+"').style.display='flex';");
	ret.find(".onclick-commentidtag").removeClass("onclick-commentidtag");

	ret.find(".date-date").attr('date', toDateTime(item.date)); 
	ret.find(".date-date").removeClass(".date-date");

	ret.find(".id-replyidtag").attr('id', replyIDTag);
	ret.find(".id-replyidtag").removeClass("id-replyidtag");

	ret.find(".onclick-newcomment").attr('onclick', 
		"mainNewComment('"+item.creator+"','"+item.date+"')");
	ret.find(".onclick-newcomment").removeClass("onclick-newcomment");

	ret.find(".onclick-clearcomment").attr('onclick', 
		"document.getElementById('"+commentIDTag+"').style.display='none';document.getElementById('"+replyIDTag+"').value = '';");
	ret.find(".onclick-clearcomment").removeClass("onclick-clearcomment");

	ret.find(".id-commentsection").attr('id', commentsectionIDTag);
	ret.find(".id-commentsection").removeClass("id-commentsection");

	return ret;
}

function generateNewsHTML(item) {
	const IDTag = item.articleId+'||'+item.date;
	// const commentIDTag = IDTag+'||comment';
	// const replyIDTag = IDTag+'||reply';
	// const commentsectionIDTag = IDTag+'||commentsection';
	// const numcommentsIDTag = IDTag+'||numcomments';
	const toggleLike = item.articleId+'||togglelike';

	var ret = newsHTML.clone();
	ret.attr('id', IDTag);

	ret.find(".onclick-like").attr('onclick',
		"mainNewsLike('"+item.articleId+"')");
	ret.find(".onclick-like").attr('id', toggleLike);
	ret.find(".onclick-like").removeClass('onclick-like');

	ret.find(".onclick-hide").attr('onclick',
		"document.getElementById('"+IDTag+"').style.display = 'none'");
	ret.find(".onclick-hide").removeClass('onclick-hide');

	ret.find(".text-creator").text(item.author);
	ret.find(".text-creator").removeClass('text-creator');

	ret.find(".text-topic").text(item.topic);
	ret.find(".text-topic").removeClass('text-topic');

	ret.find(".text-likes").text(item.likes);
	ret.find(".text-likes").removeClass("text-likes");
	
	var foodate = new Date(item.date.toString().substring(0,4), Number
		(item.date.toString().substring(4,6))-1,item.date.toString().substring(6,8),0,0,0);
	ret.find(".date-date").attr('date', foodate.toString());
	ret.find(".date-date").removeClass("date-date");

	ret.find(".text-summary").text(item.summary);
	ret.find(".text-summary").removeClass('text-summary');

	ret.find(".text-headline").text(item.headline);
	ret.find(".text-headline").removeClass('text-headline');
	
	ret.find(".href-url").attr('href', item.link);
	ret.find(".href-url").find("small").text(item.link.split('.')[1].toUpperCase());
	ret.find(".href-url").removeClass('href-url');
	return ret;
}

//functions to insert comments and posts
//inserts a comment (parent should be a property inside the itemObj)
function insertComment(itemObj) {
	if(rootMap.has(toMapKey({creator: itemObj.creator, date: itemObj.date}))) {
		console.log("Comment already exists in root map for: ");
		console.log(itemObj);
		return;
	}
	if(!rootMap.has(toMapKey(itemObj.parent))){
		console.log("Missing parent in root Map for object: ");
		console.log(itemObj);
		return;
	}

	rootMap.set(toMapKey({creator: itemObj.creator, date: itemObj.date}), 
		rootMap.get(toMapKey(itemObj.parent)));

	//increment root parent comment counter
	const numcommentsIDTag = itemObj.root.creator+'||'+itemObj.root.date+'||numcomments';
	$("[id='"+numcommentsIDTag+"']").text(Number($("[id='"+numcommentsIDTag+"']").text().replace(' comments',''))+1 + " comments");

	//finds the appropriate time-sorted parent to insert
	const parentId = itemObj.parent.creator+'||'+itemObj.parent.date+'||commentsection';
	for(const item of $("[id='"+parentId+"']").children().toArray().slice().reverse()){
		if($(item).find('sl-relative-time').attr('date') > itemObj.date){
			generateCommentHTML(itemObj).insertAfter(item);
			return;
		}
	}
	$("[id='"+parentId+"']").prepend(generateCommentHTML(itemObj));
}

//inserts a post 
function insertPost(itemObj, prev) {
	if(rootMap.has(toMapKey({creator: itemObj.creator, date: itemObj.date}))) {
		console.log("Post already exists in root map for: ");
		console.log(itemObj);
		return;
	}
	//by default, inserts into top of feed
	if(!rootMap.has(toMapKey(prev))) {
		$('#feed-items').prepend(generatePostHTML(itemObj));
	}
	//otherwise it will insert it above the specified prev
	else {
		const prevID = prev.creator+'||'+prev.date;
		generatePostHTML(itemObj).insertBefore($("[id='"+prevID+"']"));
	}
	//set root to itself as it is a post
	rootMap.set(toMapKey({creator: itemObj.creator, date: itemObj.date}), {creator: itemObj.creator, date: itemObj.date});
	commentRoots.push({type:'post', postId: itemObj.creator+itemObj.date});
}

//inserts a news
function insertNews(itemObj) {
	if(rootMap.has(toMapKey({creator: itemObj.articleId, date: itemObj.date}))){
		console.log("News article already exists for: ");
		console.log(itemObj);
		return;
	}
	const feedElements = $('#feed-items').children();
	if(feedElements.length===0) $('#feed-items').append(generateNewsHTML(itemObj));
	else feedElements.eq(Math.min(newsFrequency*newsIndex, feedElements.length-1)).after(generateNewsHTML(itemObj));
	rootMap.set(toMapKey({creator: itemObj.articleId, date: itemObj.date}, {creator: itemObj.articleId, date: itemObj.date}));
	newsIndex++;
	commentRoots.push({type:'news', articleId:itemObj.articleId});
}

function insertNewsSearch(itemObj) {
	if(rootMap.has(toMapKey({creator: itemObj.articleId, date: itemObj.date}))){
		console.log("News article already exists for: ");
		console.log(itemObj);
		return;
	}
	$('#displayed-news').prepend(generateNewsHTML(itemObj));
	//rootMap.set(toMapKey({creator: itemObj.articleId, date: itemObj.date}, {creator: itemObj.articleId, date: itemObj.date}));
	//commentRoots.push({type:'news', articleId:itemObj.articleId});
}

//functions used to update the frontend immediately after user action
function mainNewPost(wall) {
	//finds the textContent and imageContent of the post
	//note that imageContent is a url because i can't be bothered to deal with image uploads
	const textContent = document.getElementById('post-content-area').value;
	var imageContent = document.getElementById('post-image').src;

	//getting .src gives a prefix, remove it for none
	if(imageContent.endsWith('/none')) imageContent = 'none';
	console.log("Wall :" + wall);
	
	var data = {
		text: textContent,
		image: imageContent,
		postedTo: wall
	}

	//TO DO: return date and user in AJAX call

	$.ajax({
		type: 'POST',
		url: '/makePost',
		data: data,
		success: function(response) {
			if (response.status === "Success") {
				//hide overlay
				document.getElementById('overlay').style.top='-9999px';
				//reset the bubble
				document.getElementById('post-content-area').value='';
				document.getElementById("open-make-post").innerText="What's on your mind, "+ response.user +'?';
				document.getElementById('post-content-button').disabled=true;
				document.getElementById('close-post-image').click();

				const postContent= {
					type: 'post', 
					creator: response.user, 
					date: Number(response.date),
					postedTo: wall + "'s wall",
					likes: 0, 
					numcomments: 0,
					data: {
						text: textContent,
						image: imageContent
					}
				};
				insertPost(postContent, null);
			} else {
		  	  	document.getElementById('make-post-fail').show();
			}
			//console.log("Response: " + response)
		},
		error: function(response) {
		    alert("There was an unexpected database error adding your post.")
			console.log(response)
		}
	})
}

function mainNewComment(parentCreator, parentDate) {
	//finds the textContent of the comment
	const textContent = document.getElementById(parentCreator+'||'+parentDate+'||reply').value;

	//TO DO: route, include comment data and parent in req.body
	//TO DO: add a check if the ajax fails
	//TO DO: move all this inside the ajax call
	
	console.log(Array.from(rootMap.keys()));
	const rootInfo = rootMap.get( toMapKey({
						creator: parentCreator, 
						date: parentDate
					}));

	console.log(toMapKey({
						creator: parentCreator, 
						date: parentDate
					}));
	var data = {
		text: textContent,
		parentCreator: parentCreator,
		parentDate: parentDate,
		rootCreator: rootInfo.creator,
		rootDate: rootInfo.date
	};

	//TO DO: return date and user in AJAX call

	$.ajax({
		type: 'POST',
		url: '/makeComment',
		data: data,
		success: function(response) {
			if (response.status === "Success") {
				const itemObj = 
				{
					type: 'comment', 
					creator: response.user,
					date: Number(response.date),
					parent: { 
						creator: parentCreator,
						date: parentDate,
					},
					root: {
						creator: rootInfo.creator,
						date: rootInfo.date,
					},
					likes: 0,
					data: {
						text: textContent
					}
				};
				
				const parentId = parentCreator+'||'+parentDate+'||comment';
				//hides the commenting area
				document.getElementById(parentId).style.display = 'none';
				document.getElementById(parentCreator+'||'+parentDate+'||reply').value = '';
			
				//adds the comment
				insertComment(itemObj);
			} else {
			}
			console.log("Response: " + response)
		},
		error: function(response) {
		    alert("There was an unexpected database error adding your post.")
			console.log(response)
		}
	})
}

function mainPostLike(parentCreator, parentDate){
	var data = {
		parentCreator: parentCreator,
		parentDate: parentDate,
		parentId: parentCreator + parentDate
	};
	const liketag = data.parentId+'||likes';
	const toggleLike = data.parentId+'||togglelike';
	$.ajax({
		type: 'POST',
		url: '/makeLike',
		data: data,
		success: function(response) {
			if (response.status === "Success") {
				console.log("like success");
				if($("[id='"+toggleLike+"']").text()==="Liked"){
					$("[id='"+toggleLike+"']").text("Like");
					$("[id='"+liketag+"']").text(Number($("[id='"+liketag+"']").text())-1);
				}
				else{
					$("[id='"+toggleLike+"']").text("Liked");
					$("[id='"+liketag+"']").text(Number($("[id='"+liketag+"']").text())+1);
				}
				
			} else {
			}
			console.log("Response: " + response)
		},
		error: function(response) {
		    alert("There was an unexpected database error adding your post.")
			console.log(response)
		}
	});
}
function mainNewsLike(articleId) {
	var data = {
		articleId: articleId
	};
	const toggleLike = data.articleId+'||togglelike';
	$.ajax({
		type: 'POST',
		url: '/news_like',
		data: data,
		success: function(response) {
			if (response.status === "Success") {
				console.log("like success");
				if($("[id='"+toggleLike+"']").text()==="Liked"){
					$("[id='"+toggleLike+"']").text("Like");
				}
				else{
					$("[id='"+toggleLike+"']").text("Liked");
				}
			} else {
			}
			console.log("Response: " + response)
		},
		error: function(response) {
		    alert("There was an unexpected database error adding your post.")
			console.log(response)
		}
	});
	
}







// set interval
var TID;
function beginLoop() {
	TID = setInterval(updateComments, 10000);
}

function endLoop() { // to be called when you want to stop the timer
  clearInterval(TID);
}

//TO DO: make this function recursively call itself
function updateComments() {
	console.log("fetching new comments...");
	var promises = [];
	var newData = [];
	for(const item of commentRoots){
		console.log(item);
		if(item.type === 'post'){
			promises.push(new Promise(function(resolve, reject) {
				$.getJSON('/getComments/'+item.postId, function(data2) {
					if(data2 !== null){
						data2.forEach(x => x.type='comment');
						newData = newData.concat(data2);
					}
					resolve();
				});
			}))
		}
		else if(item.type==='news') {
			//console.log('oops! no news call yet :P')
		}
	}
	Promise.all(promises).then(() => {
		generateCommentTree(newData);
		updateLikes();
		console.log("fecthed!");
	});
}


function updateLikes() {
	commentRoots.forEach(item=>{
		if(item.type==='post'){
			$.getJSON('/getLikes/'+item.postId, function(data2) {
				const liketag = item.postId+'||likes';
				const toggleLike = item.postId+'||togglelike';
				$("[id='"+liketag+"']").text(data2[0].postLikes.SS.length);
				data2[0].postLikes.SS.includes(CLIENT_USER)? $("[id='"+toggleLike+"']").text("Liked"): $("[id='"+toggleLike+"']").text("Like");
			});
		}
		else if(item.type==='news'){
			const toggleLike = item.articleId+'||togglelike';
			$.getJSON('/news_is_liked/'+item.articleId, function(data2) {
				const toggleLike = item.articleId+'||togglelike';

				if (data2.response==="yes"){
					$("[id='"+toggleLike+"']").text("Liked");
				}
				else{
					$("[id='"+toggleLike+"']").text("Like");
				}
			});
		}
	});
}