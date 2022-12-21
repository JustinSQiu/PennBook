var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();

var general_DB_lookup_with_limit = function(searchTable, searchKey, searchTerm, queryTerms, limit, callback) {
  //console.log('Looking up: ' + searchTerm); 

  var params = {
      KeyConditions: {
	//this assumes all keys we are going to use are strings
        [searchKey]: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      TableName: searchTable,
      Limit: limit,
      AttributesToGet: queryTerms,
      ScanIndexForward: false
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
};

var general_DB_lookup = function(searchTable, searchKey, searchTerm, queryTerms, callback) {
	//console.log('Looking up: ' + searchTerm); 

  var params = {
      KeyConditions: {
	//this assumes all keys we are going to use are strings
        [searchKey]: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      TableName: searchTable,
      AttributesToGet: queryTerms
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
}

var partial_DB_lookup = function(searchTerm, queryTerms, callback) {
	//console.log('Looking up: ' + searchTerm); 

  const params = {
    TableName: "Settings",
    KeyConditionExpression: "begins_with(firstname, :value)",
    ExpressionAttributeValues: {
      ":value": searchTerm
    },
    AttributesToGet: queryTerms
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
}

var lookup_news_like = function(username, articleId, queryTerms, callback) {
  var params = {
    KeyConditionExpression: 'username = :u_na and articleId = :a_id',
    ExpressionAttributeValues: {
      ':a_id' : {N: articleId},
      ':u_na' : {S: username}
    },
    ProjectionExpression: 'articleId',
    TableName: "NewsLike",
};

db.query(params, function(err, data) {
  if (err) {
    callback(err, null);
  } else {
    callback(err, data.Items);
  }
});
}


var general_DB_int_lookup = function(searchTable, searchKey, searchTerm, queryTerms, callback) {
	//console.log('Looking up: ' + searchTerm); 

  var params = {
      KeyConditions: {
	//this assumes all keys we are going to use are strings
        [searchKey]: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { N: searchTerm } ]
        }
      },
      TableName: searchTable,
      AttributesToGet: queryTerms
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
}

var secondary_DB_lookup = function(indexName, searchTable, searchKey, searchTerm, queryTerms, callback) {
	console.log('SECONDARY Looking up: ' + searchTerm); 

  var params = {
      TableName: searchTable,
      IndexName: indexName,
      KeyConditions: {
        [searchKey]: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      AttributesToGet: queryTerms
  };

  db.query(params, function(err, data) {
    if (err) {
	  console.log(err);
      callback(err, null);
    } else {
	  console.log(data.Items)
      callback(err, data.Items);
    }
  });
}

// Note: this function is nonfunctional rn. Keeping in case we need later and can refactor
var multiple_DB_lookup = function(searchTable, searchKey, searchTerms, queryTerms, callback) {
	//console.log('Looking up: ' + searchTerms); 

  var params = {
      KeyConditions: {
	//this assumes all keys we are going to use are strings
        [searchKey]: {
          ComparisonOperator: 'IN',
          AttributeValueList: searchTerms
        }
      },
      TableName: searchTable,
      AttributesToGet: queryTerms,
      
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
}

/*
columns of the form [{
	column: string,
	type: char,
	value: any
}] where column is the column name, type is the type of the input (needed for list shenanigans), and value is the desired value
*/
var general_DB_put = function(tableName, key, keyword, columns, callback) {
  var params = {
      Item: {
		//this assumes all keys we are going to use are strings
        [key]: {
          S: keyword
        }
      },
      TableName: tableName,
      ReturnValues: 'NONE'
  };
  
  columns.forEach(function(x){
	params.Item[x.column] = {[x.type]:x.value};
  });
  
  db.putItem(params, function(err, data){
    if (err)
      callback(err)
    else
      callback(null, 'Success')
  });
};

var general_DB_putInt = function(tableName, key, keyword, columns, callback) {
  var params = {
      Item: {
		//this assumes all keys we are going to use are integers
        [key]: {
          N: keyword
        }
      },
      TableName: tableName,
      ReturnValues: 'NONE'
  };
  
  columns.forEach(function(x){
	params.Item[x.column] = {[x.type]:x.value};
  });
  
  db.putItem(params, function(err, data){
    if (err)
      callback(err)
    else
      callback(null, 'Success')
  });
};

var general_DB_scan = function(tableName, columns, callback) {
	var params = {
		AttributesToGet: columns,
		TableName: tableName
	};
	db.scan(params, function(err, data){
		if(err)
			callback(err, null)
		else
			callback(null, data)
	})
};

var general_DB_delete = function(tableName, key, keyword, callback) {
	var params = {
      Key: {
	//this assumes all keys we are going to use are strings
	      [key]:{
			S:keyword
		}
	  },

      TableName: tableName
  };
	db.deleteItem(params, function(err, data){
		if(err)
			callback(err, null)
		else
			callback(null, data)
	});
};

var general_DB_delete_with_sort = function(tableName, key, keyword, sortKey, sortKeyword, callback) {
	var params = {
      Key: {
	//this assumes all keys we are going to use are strings
	      [key]:{
          S:keyword
        },
        [sortKey]:{
          N:sortKeyword
        }
	  },

      TableName: tableName
  };
	db.deleteItem(params, function(err, data){
		if(err)
			callback(err, null)
		else
			callback(null, data)
	});
};


var likes_DB_update = function(searchTable, searchKey, searchTerm, user, queryTerms, callback) {
	console.log('PUTTING LIKES FOR: ' + searchTerm); 

  var params = {
      TableName: searchTable,
      IndexName: 'postId-index',
      KeyConditions: {
        [searchKey]: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      AttributesToGet: queryTerms,
      UpdateExpression: "ADD postLikes = :newLike",
      ExpressionAttributeValues: {
		':newLike': user
	  }
  };

  db.updateItem(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
	  console.log(data.Items)
      callback(err, data.Items);
    }
  });
}


// TODO Your own functions for accessing the DynamoDB tables should go here

/* We define an object with one field for each method. For instance, below we have
   a 'lookup' field, which is set to the myDB_lookup function. In routes.js, we can
   then invoke db.lookup(...), and that call will be routed to myDB_lookup(...). */

// TODO Don't forget to add any new functions to this class, so app.js can call them. (The name before the colon is the name you'd use for the function in app.js; the name after the colon is the name the method has here, in this file.)

var database = { 
  lookup: general_DB_lookup,
  lookup_limit: general_DB_lookup_with_limit,
  lookup_int: general_DB_int_lookup,
  multipleLookup: multiple_DB_lookup,
  put: general_DB_put,
  scan: general_DB_scan,
  delete: general_DB_delete,
  delete_sort: general_DB_delete_with_sort,
  putInt: general_DB_putInt,
  secondaryLookup: secondary_DB_lookup,
  update: likes_DB_update,
  lookup_news_like: lookup_news_like,
  partial_DB_lookup: partial_DB_lookup
}

module.exports = database;