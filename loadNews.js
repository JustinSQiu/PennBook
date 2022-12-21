var db = require('./models/database.js');
const fs = require('fs')
var AWS = require('aws-sdk')
var stemmer = require('porter-stemmer').stemmer
AWS.config.update({region:'us-east-1'});

var content = fs.readFileSync('/Users/anpans/Programming/G15/java/Adsorption/News_Category_Dataset_v2.json', 'utf8');
var contentSplit = content.split('\n')
var data = []
for (const col of contentSplit) {
	try {
		data.push(JSON.parse(col))
	} catch (err) {
		console.log(col)
	}
}

var stop_words_file = fs.readFileSync('nlp_en_stop_words.txt', 'utf8')
var stop_words1 = stop_words_file.split('\n')
var stop_words = []
for (var i = 0; i < stop_words1.length; i++) {
	stop_words.push(stemmer(stop_words1[i]));
}

// Note: only first 1000 were loaded, worried about write capacity/passing spending limit
for (var i = 5; i < 200000; i++) {
	//console.log('starting ' + i)
	var date = data[i]['date']
	date = date.replace(/-/g, '')
	var dateInt = parseInt(date);
	dateInt += 50000
	date = dateInt.toString()
	if (!(dateInt >= 20221220 && dateInt <= 20221220)) {
		continue;
	}
	var columns = [
	{
		column: 'category',
		value: data[i]['category'],
		type: 'S'
	},
	{
		column: 'headline',
		value: data[i]['headline'],
		type: 'S'
	},
	{
		column: 'authors',
		value: data[i]['authors'],
		type: 'S'
	},
	{
		column: 'link',
		value: data[i]['link'],
		type: 'S'
	},
	{
		column: 'short_description',
		value: data[i]['short_description'],
		type: 'S'
	},
	{
		column: 'publish_date',
		value: date,
		type: 'N'
	}
	];

	var title = data[i]['headline']
	//console.log(title)
	var title_words = title.split(' ')
	for (var j = 0; j < title_words.length; j++) {
		var word = title_words[j];
		word = word.toLowerCase()
		word = stemmer(word)
		if (!stop_words.includes(word)) {
			var column2 = [
				{
					column: 'articleId',
					value: i.toString(),
					type: 'N'
				}
			]
			db.put('InverseNews', 'keyword', word, column2, function(err, data) {
				if (err) {
					  console.log(err)
				} else if (data) {
					  console.log('good1')
				} else {
					console.log('error1')
				}
			})
 		} 
	}
	
	//console.log(title_words)

	db.putInt('News', 'articleId', i.toString(), columns, function(err, data) {
		if (err) {
		  	console.log(err)
		} else if (data) {
		  	console.log('good')
		} else {
			console.log('error')
		}
	})
}
