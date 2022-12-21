var db = require('../models/database.js');
var security = require('../models/cipher.js');
var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var stemmer = require('porter-stemmer').stemmer;
const docClient = new AWS.DynamoDB.DocumentClient();

var verifyUser = function(req) {
	var session = req.session;
	if(!session.userId) {
		return false;
	}
	return true;
}

var viewNews = function(req, res) {
    if(!verifyUser(req)) {
        res.redirect('/?error=2');
        return;
    }
    res.render('news.ejs', {user:req.session.userId});
}

var getArticleInfo = function(req, res) {
    if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
    var articleId = req.params.artid ? req.params.artid: 1;
    db.lookup_int("News", "articleId", articleId, ['articleId', 'publish_date', 'authors', 'category',
                            'headline', 'link', 'short_description'], function(err, data) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    res.send(JSON.stringify(data));
                                }
                            });
}

var getNewsForUser = function(req, res) {
    if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
    var limit = 20;
    let user = req.session.userId;

    db.lookup_limit("NewsPosted", "username", user, ['timestamp', 'articleId', 'publish_date'], limit, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            res.send(JSON.stringify(data));
        }
    });

}

var getIsLikedArticle = function(req, res) {
    if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
    let userId = req.session.userId;
    let articleId = req.params.artid?req.params.artid:1;
    db.lookup_news_like(userId, articleId, [articleId], function(err, data) {
        if (err) {
            console.log(err);
        } else {
            if (data.length === 0) {
                res.send(JSON.stringify({response: "no"}));
            } else {
                res.send(JSON.stringify({response: "yes"}));
            }
        }
    });
}

var getLikeArticle = function(req, res) {
    if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
    let userId = req.session.userId;
    let articleId = req.body.articleId?req.body.articleId:1;
    db.lookup_news_like(userId, articleId, [articleId], function(err, data) {
        if (err) {
            console.log(err);
        } else {
            if (data.length === 0) {
                var column = [
                    {
                        column: 'articleId',
                        value: articleId,
                        type: 'N'
                    }
                ]
                db.put("NewsLike", "username", userId, column, function(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.send({status:"Success"})
                    }
                })
            } else {
                db.delete_sort("NewsLike", "username", userId, "articleId", articleId, function(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.send({status:"Success"})
                    }
                });
            }
        }
    });
}

var getNewsSearch = function(req, res) {
    if(!verifyUser(req)) {
		res.redirect('/?error=2');
		return;
	}
    let user = req.session.userId;
    var queryStr = req.body.query ? req.body.query: '';
        
    var article_counts = new Object();
    var query_words = queryStr.split(' ')
    var words_processed = 0;
    for (var i = 0; i < query_words.length; i++) {
        var word = query_words[i];
        if (word === '') {
            words_processed += 1;
            if (words_processed === query_words.length) {
                var sol_arr = [];
                for (var key in article_counts) {
                    sol_arr.push({key: key, val: article_counts[key]});
                }
                sol_arr.sort(function(a,b) {
                    return b.val - a.val;
                });
                console.log(sol_arr)
                var sol = []
                for (var k = 0; k < sol_arr.length; k++) {
                    sol.push(sol_arr[k].key);
                }
                res.send(JSON.stringify(sol));
                return;
            }
            continue;
        }
        word = word.toLowerCase();
        word = stemmer(word);
        db.lookup("InverseNews", "keyword", word, ['keyword', 'articleId'], function(err,data) {
            if (err) {
                console.log(err);
            } else {
                for (var j = 0; j < data.length; j++) {
                    var articleId = data[j].articleId.N;
                    if (articleId in article_counts) {
                        article_counts[articleId] += 1
                    } else {
                        article_counts[articleId] = 1
                    }
                }
            }
            words_processed += 1;
            if (words_processed === query_words.length) {
                db.lookup("NewsWeights", "username", user, ['weights'], function(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        news_weights = (data.length == 0)?[]:data[0].weights.L;
                        var sol_arr = [];
                        for (var key in article_counts) {
                            sol_arr.push({key: key, val: article_counts[key]});
                        }
                        //console.log(news_weights);
                        sol_arr.sort(function(a,b) {
                            if (b.val != a.val)
                                return b.val - a.val;
                            var a_ind = news_weights.length;
                            var b_ind = news_weights.length;
                            for (var l = 0; l < news_weights.length; l++) {
                                var val = news_weights[l].N;
                                if (val === a.key){
                                    a_ind = l;
                                }
                                if (val === b.key) {
                                    b_ind = l;
                                }
                            }
                            return a_ind - b_ind;
                        });
                        //console.log(sol_arr)
                        var sol = []
                        for (var k = 0; k < sol_arr.length; k++) {
                            sol.push(sol_arr[k].key);
                        }
                        res.send(JSON.stringify(sol));
                        return;
                    }
                });
            }
        });
    }
}

var routes = {
    view_news: viewNews,
	get_news_for_user: getNewsForUser,
    get_news_search: getNewsSearch,
    get_article: getArticleInfo,
    is_liked: getIsLikedArticle,
    like_article: getLikeArticle
};

module.exports = routes;