import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Index;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;

import scala.Tuple2;
import org.apache.livy.LivyClient;
import org.apache.livy.LivyClientBuilder;

public class LivyRun {
	AmazonDynamoDB client;
	DynamoDB db;
	
	int articleCount;
	int categoryCount;
	int userCount;
	List<Integer> userNodes;
	Set<Integer> allArticles;
	int querDate;
	List<MyPair<MyPair<Integer, Integer>, Double>> edgeWeights;
	Map<String, Integer> categoryIndex;
	Map<String, Integer> userIndex;
	Map<Integer, String> usernameMap;
	List<Integer> allNodesList;
	
	void loadNetwork() {
		//load the whole network with all users
		Map<String, AttributeValue> articleAttributeValues = new HashMap<String, AttributeValue>();
		articleAttributeValues.put(":min_date", new AttributeValue().withN("0"));
		Calendar c = Calendar.getInstance();
		int year = c.get(Calendar.YEAR);
		int month = c.get(Calendar.MONTH) + 1;
		int day = c.get(Calendar.DAY_OF_MONTH);
		querDate = day + 100 * month + 10000 * year;
		Table newsTable = db.getTable("News");
		Table newsLikeTable = db.getTable("NewsLike");
		Index newsIndex = newsTable.getIndex("NewsDate");
		allArticles = new HashSet<Integer>();
		
		//get all articles published on the current date
		QuerySpec articleSpec = new QuerySpec()
				.withKeyConditionExpression("publish_date = :q_date")
				.withValueMap(new ValueMap()
						.withNumber(":q_date", querDate));
		ItemCollection<QueryOutcome> articleItems = newsIndex.query(articleSpec);
		
		articleCount = 0;
		categoryCount = 0;
		userIndex = new HashMap<String, Integer>();
		categoryIndex = new HashMap<String, Integer>();
		
		for (Item item : articleItems) {
			String category = item.getString("category");
			int articleId = Integer.parseInt(item.getNumber("articleId").toString());
			allArticles.add(articleId);
			articleCount = Math.max(articleId + 1, articleCount);
			if (!categoryIndex.containsKey(category)) {
				categoryIndex.put(category, categoryIndex.size());
			}
		}
		
		categoryCount = categoryIndex.size();
		
		//get all users in PennBook
		ScanRequest userRequest = new ScanRequest()
			    .withTableName("Settings").withProjectionExpression("username, friends, interests");
		ScanResult userResults = client.scan(userRequest);
		
		userCount=0;
		usernameMap = new HashMap<Integer, String>();
		for (Map<String, AttributeValue> item: userResults.getItems()) {
			userCount++;
			String username = item.get("username").getS();
			userIndex.put(username, userIndex.size());
			usernameMap.put(articleCount + categoryCount + userIndex.get(username), username);
		}
		
		
		List<Tuple2<Integer, Integer>> edgeList = new ArrayList<Tuple2<Integer, Integer>>();
		
		//add edges from users to categories and between users (friends)
		for (Map<String, AttributeValue> item: userResults.getItems()) {
			String username = item.get("username").getS();
			for (AttributeValue interest: item.get("interests").getL()) {
				String interCat = interest.getS().toUpperCase();
				if (categoryIndex.containsKey(interCat)) {
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryCount + userIndex.get(username), 
							articleCount + categoryIndex.get(interCat)));
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryIndex.get(interCat),
							articleCount + categoryCount + userIndex.get(username)));
				}
			}
			for (AttributeValue username2: item.get("friends").getL()) {
				String user2 = username2.getS();
				if (userIndex.containsKey(user2)) {
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryCount + userIndex.get(username),
							articleCount + categoryCount + userIndex.get(user2)));
				}
			}
		}
		
		
		//add edges between articles and categories
		for (Item item : articleItems) {
			String category = item.getString("category");
			int articleId = Integer.parseInt(item.getNumber("articleId").toString());
			edgeList.add(new Tuple2<Integer, Integer>(articleId, articleCount + categoryIndex.get(category)));
			edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryIndex.get(category), articleId));
		}
		
		//add edges between users and liked articles
		for (Map<String, AttributeValue> item: userResults.getItems()) {
			String username = item.get("username").getS();
			//get liked articles
			QuerySpec likeSpec = new QuerySpec()
					.withKeyConditionExpression("username = :u_na")
					.withValueMap(new ValueMap()
							.withString(":u_na", username));
			ItemCollection<QueryOutcome> likeItems = newsLikeTable.query(likeSpec);
			for (Item item2: likeItems) {
				int articleId = item2.getNumber("articleId").intValue();
				if (allArticles.contains(articleId)) {
					edgeList.add(new Tuple2<Integer, Integer>(articleId, articleCount + categoryCount + userIndex.get(username)));
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryCount + userIndex.get(username), articleId));
				}
			}
		}
		
		Map<Integer, Integer> articlesOut = new HashMap<Integer, Integer>();
		Map<Integer, Integer> categoriesOut = new HashMap<Integer, Integer>();
		Map<Integer, Integer> usersOut = new HashMap<Integer, Integer>();
		
		for (Tuple2<Integer, Integer> edge : edgeList) {
			int a = edge._1;
			int b = edge._2;
			if (b < articleCount) {
				articlesOut.put(a, articlesOut.getOrDefault(a, 0) + 1);
			} else if (b < articleCount + categoryCount) {
				categoriesOut.put(a, categoriesOut.getOrDefault(a, 0) + 1);
			} else {
				usersOut.put(a,  usersOut.getOrDefault(a, 0) + 1);
			}
		}
		
		//add weights to edges
		edgeWeights = new ArrayList<MyPair<MyPair<Integer, Integer>, Double>>();
		for (Tuple2<Integer, Integer> edge : edgeList) {
			int a = edge._1;
			int b = edge._2;
			if (a >= articleCount + categoryCount) {
				if (b < articleCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.4 / articlesOut.get(a)));
				} else if (b < articleCount + categoryCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / categoriesOut.get(a)));
				} else {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / usersOut.get(a)));
				}
			} else if (b >= articleCount + categoryCount) {
				if (a < articleCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.4 / articlesOut.get(b)));
				} else if (a < articleCount + categoryCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / categoriesOut.get(b)));
				} else {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / usersOut.get(b)));
				}
			} else if (a >= articleCount) {
				edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 1.0 / articlesOut.get(a)));
			} else {
				edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 1.0 / articlesOut.get(b)));
			}
		}
		
		System.out.println("Articles: " + articleCount);
		System.out.println("Categories: " + categoryCount);
		System.out.println("Users: " + userCount);
		allNodesList = new ArrayList<Integer>();
		for (Item item : articleItems) {
			String category = item.getString("category");
			int articleId = Integer.parseInt(item.getNumber("articleId").toString());
			int categoryId = articleCount + categoryIndex.get(category);
			allNodesList.add(articleId);
			allNodesList.add(categoryId);
		}
		userNodes = new ArrayList<Integer>();
		for (Map<String, AttributeValue> item: userResults.getItems()) {
			String username = item.get("username").getS();
			int userId = userIndex.get(username);
			allNodesList.add(articleCount + categoryCount + userId);
			userNodes.add(articleCount + categoryCount + userId);
		}
		
	}
	
	void loadNetwork(String usern) {
		//load the graph for a single user
		
		Map<String, AttributeValue> articleAttributeValues = new HashMap<String, AttributeValue>();
		articleAttributeValues.put(":min_date", new AttributeValue().withN("0"));
		Calendar c = Calendar.getInstance();
		int year = c.get(Calendar.YEAR);
		int month = c.get(Calendar.MONTH) + 1;
		int day = c.get(Calendar.DAY_OF_MONTH);
		querDate = day + 100 * month + 10000 * year;
		Table newsTable = db.getTable("News");
		Table newsLikeTable = db.getTable("NewsLike");
		Table settingsTable = db.getTable("Settings");
		Index newsIndex = newsTable.getIndex("NewsDate");
		allArticles = new HashSet<Integer>();
		
		//get all articles from the current date
		QuerySpec articleSpec = new QuerySpec()
				.withKeyConditionExpression("publish_date = :q_date")
				.withValueMap(new ValueMap()
						.withNumber(":q_date", querDate));
		ItemCollection<QueryOutcome> articleItems = newsIndex.query(articleSpec);
		
		articleCount = 0;
		categoryCount = 0;
		userIndex = new HashMap<String, Integer>();
		categoryIndex = new HashMap<String, Integer>();
		
		for (Item item : articleItems) {
			String category = item.getString("category");
			int articleId = Integer.parseInt(item.getNumber("articleId").toString());
			allArticles.add(articleId);
			articleCount = Math.max(articleId + 1, articleCount);
			if (!categoryIndex.containsKey(category)) {
				categoryIndex.put(category, categoryIndex.size());
			}
		}
		
		categoryCount = categoryIndex.size();
		
		//get the information about the specified user
		QuerySpec userSpec = new QuerySpec()
				.withKeyConditionExpression("username = :u_na")
				.withValueMap(new ValueMap()
						.withString(":u_na", usern));
		ItemCollection<QueryOutcome> userItems = settingsTable.query(userSpec);

		
		userCount=0;
		usernameMap = new HashMap<Integer, String>();
		for (Item item : userItems) {
			userCount++;
			String username = item.getString("username");
			userIndex.put(username, userIndex.size());
			usernameMap.put(articleCount + categoryCount + userIndex.get(username), username);
		}
		
		List<Tuple2<Integer, Integer>> edgeList = new ArrayList<Tuple2<Integer, Integer>>();
		
		
		//add edges between user and categories, as well as between users and their friends
		for (Item item : userItems) {
			String username = item.getString("username");
			for (Object interest: item.getList("interests")) {
				
				String interCat = ((String)(interest)).toUpperCase();
				if (categoryIndex.containsKey(interCat)) {
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryCount + userIndex.get(username), 
							articleCount + categoryIndex.get(interCat)));
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryIndex.get(interCat),
							articleCount + categoryCount + userIndex.get(username)));
				}
			}
			for (Object username2: item.getList("friends")) {
				String user2 = (String)username2;
				if (userIndex.containsKey(user2)) {
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryCount + userIndex.get(username),
							articleCount + categoryCount + userIndex.get(user2)));
				}
			}
		}
		
		//add edges between categories and articles
		for (Item item : articleItems) {
			String category = item.getString("category");
			int articleId = Integer.parseInt(item.getNumber("articleId").toString());
			edgeList.add(new Tuple2<Integer, Integer>(articleId, articleCount + categoryIndex.get(category)));
			edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryIndex.get(category), articleId));
		}
		
		//add edges between user and liked articles
		for (Item item : userItems) {
			String username = item.getString("username");
			//get liked articles
			QuerySpec likeSpec = new QuerySpec()
					.withKeyConditionExpression("username = :u_na")
					.withValueMap(new ValueMap()
							.withString(":u_na", username));
			ItemCollection<QueryOutcome> likeItems = newsLikeTable.query(likeSpec);
			for (Item item2: likeItems) {
				int articleId = item2.getNumber("articleId").intValue();
				if (allArticles.contains(articleId)) {
					edgeList.add(new Tuple2<Integer, Integer>(articleId, articleCount + categoryCount + userIndex.get(username)));
					edgeList.add(new Tuple2<Integer, Integer>(articleCount + categoryCount + userIndex.get(username), articleId));
				}
			}
		}
		
		Map<Integer, Integer> articlesOut = new HashMap<Integer, Integer>();
		Map<Integer, Integer> categoriesOut = new HashMap<Integer, Integer>();
		Map<Integer, Integer> usersOut = new HashMap<Integer, Integer>();
		
		for (Tuple2<Integer, Integer> edge : edgeList) {
			int a = edge._1;
			int b = edge._2;
			if (b < articleCount) {
				articlesOut.put(a, articlesOut.getOrDefault(a, 0) + 1);
			} else if (b < articleCount + categoryCount) {
				categoriesOut.put(a, categoriesOut.getOrDefault(a, 0) + 1);
			} else {
				usersOut.put(a,  usersOut.getOrDefault(a, 0) + 1);
			}
		}
		
		//add weights to edges
		edgeWeights = new ArrayList<MyPair<MyPair<Integer, Integer>, Double>>();
		for (Tuple2<Integer, Integer> edge : edgeList) {
			int a = edge._1;
			int b = edge._2;
			if (a >= articleCount + categoryCount) {
				if (b < articleCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.4 / articlesOut.get(a)));
				} else if (b < articleCount + categoryCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / categoriesOut.get(a)));
				} else {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / usersOut.get(a)));
				}
			} else if (b >= articleCount + categoryCount) {
				if (a < articleCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.4 / articlesOut.get(b)));
				} else if (a < articleCount + categoryCount) {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / categoriesOut.get(b)));
				} else {
					edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 0.3 / usersOut.get(b)));
				}
			} else if (a >= articleCount) {
				edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 1.0 / articlesOut.get(a)));
			} else {
				edgeWeights.add(new MyPair<MyPair<Integer, Integer>, Double>(new MyPair<Integer, Integer>(a,b), 1.0 / articlesOut.get(b)));
			}
		}

		
		System.out.println("Articles: " + articleCount);
		System.out.println("Categories: " + categoryCount);
		System.out.println("Users: " + userCount);
		allNodesList = new ArrayList<Integer>();
		for (Item item : articleItems) {
			String category = item.getString("category");
			int articleId = Integer.parseInt(item.getNumber("articleId").toString());
			int categoryId = articleCount + categoryIndex.get(category);
			allNodesList.add(articleId);
			allNodesList.add(categoryId);
		}
		userNodes = new ArrayList<Integer>();
		for (Item item : userItems) {
			String username = item.getString("username");
			int userId = userIndex.get(username);
			allNodesList.add(articleCount + categoryCount + userId);
			userNodes.add(articleCount + categoryCount + userId);
		}
	}
	
	void checkInterestUpdates () throws IOException, URISyntaxException {
		//check if any user's interests were updated
		//get all interest updates
		ScanRequest userRequest = new ScanRequest()
			    .withTableName("InterestUpdates").withProjectionExpression("username");
		ScanResult userResults = client.scan(userRequest);
		Table interestTable = db.getTable("InterestUpdates");
		for (Map<String, AttributeValue> item: userResults.getItems()) {
			String username = item.get("username").getS();
			interestTable.deleteItem("username", username);
			loadNetwork(username);
			//connect to livy client
			LivyClient client = new LivyClientBuilder()
					  .setURI(new URI("http://ec2-34-239-163-14.compute-1.amazonaws.com:8998"))
					  .build();
			try {
				
				List<Tuple2<Integer, List<Tuple2<Integer, Double>>>> resWeights = new ArrayList<>();
				//path of basicjar.jar
				String jar = "/home/ec2-user/basicjar.jar";
				
				System.out.printf("Uploading %s to the Spark context...\n", jar);
				client.uploadJar(new File(jar)).get();
				List<MyPair<Integer, List<MyPair<Integer, Double>>>> resWeights2 = client.submit(new Adsorption(userNodes, edgeWeights, allNodesList)).get();
				for (MyPair<Integer, List<MyPair<Integer, Double>>> w : resWeights2) {
					List<Tuple2<Integer, Double>> innerlist = new ArrayList<>();
					for (MyPair<Integer, Double> p2 : w.getRight()) {
						innerlist.add(new Tuple2<Integer, Double>(p2.getLeft(), p2.getRight()));
					}
					resWeights.add(new Tuple2<Integer, List<Tuple2<Integer, Double>>>(w.getLeft(), innerlist));
				}
				postArticles(resWeights);
			} catch(Exception e) {
				e.printStackTrace();
			}
			finally {
				client.stop(true);
			}
		}
		
	}
	
	void runTotalUpdates () throws IOException, URISyntaxException {
		//update the weight graph for all users
		loadNetwork();
		//connect to livy client
		LivyClient client = new LivyClientBuilder()
				  .setURI(new URI("http://ec2-34-239-163-14.compute-1.amazonaws.com:8998"))
				  .build();
		try {
			
			List<Tuple2<Integer, List<Tuple2<Integer, Double>>>> resWeights = new ArrayList<>();
			//path to basicjar.jar
			String jar = "/home/ec2-user/basicjar.jar";
			
			System.out.printf("Uploading %s to the Spark context...\n", jar);
			client.uploadJar(new File(jar)).get();
			List<MyPair<Integer, List<MyPair<Integer, Double>>>> resWeights2 = client.submit(new Adsorption(userNodes, edgeWeights, allNodesList)).get();
			for (MyPair<Integer, List<MyPair<Integer, Double>>> w : resWeights2) {
				List<Tuple2<Integer, Double>> innerlist = new ArrayList<>();
				for (MyPair<Integer, Double> p2 : w.getRight()) {
					innerlist.add(new Tuple2<Integer, Double>(p2.getLeft(), p2.getRight()));
				}
				resWeights.add(new Tuple2<Integer, List<Tuple2<Integer, Double>>>(w.getLeft(), innerlist));
			}
			postArticles(resWeights);
		} catch(Exception e) {
			e.printStackTrace();
		}
		finally {
			client.stop(true);
		}
		
	}
	
	public void postArticles(List<Tuple2<Integer, List<Tuple2<Integer, Double>>>> resWeights) {
		//post new articles to the users
		Random rand = new Random();
		double eps = 1e-9;
		for (Tuple2<Integer, List<Tuple2<Integer, Double>>> w : resWeights) {
			//for each user
			
			int userId = w._1;
			List<Tuple2<Integer, Double>> weights = w._2;
			String username = usernameMap.get(userId);
			Table posted = db.getTable("NewsPosted");
			Table weightsTable = db.getTable("NewsWeights");
			//get articles already posted
			QuerySpec postedSpec = new QuerySpec()
					.withKeyConditionExpression("username = :u_name")
					.withFilterExpression("publish_date = :q_date")
					.withValueMap(new ValueMap()
							.withNumber(":q_date", querDate)
							.withString(":u_name", username));
			ItemCollection<QueryOutcome> postedItems = posted.query(postedSpec);
			HashSet<Integer> alreadyPosted = new HashSet<>();
			for (Item item : postedItems) {
				alreadyPosted.add(item.getNumber("articleId").intValue());
			}
			List<Tuple2<Integer, Double>> articleWeights = new ArrayList<>(weights);
			int solu = articleWeights.get(0)._1;
			double soluW = articleWeights.get(0)._2;
			double totalSum = 0.0;
			double currSum = 0.0;
			
			
			//get sum of weights
			for (Tuple2<Integer, Double> article : articleWeights) {
				//for all articles
				int articleId = article._1;
				double weight = article._2;
				//skip non-article nodes
				if (articleId >= articleCount) {
					continue;
				}
				//skip already posted articles
				if (alreadyPosted.contains(articleId)) {
					continue;
				}
				totalSum += weight + eps;
			}
			double goal = rand.nextDouble() * totalSum;
			//select article to push (weighted random choice)
			for (Tuple2<Integer, Double> article : articleWeights) {
				int articleId = article._1;
				double weight = article._2;
				if (articleId >= articleCount) {
					continue;
				}
				if (alreadyPosted.contains(articleId)) {
					continue;
				}
				currSum += weight + eps;
				if (goal < currSum) {
					solu = articleId;
					soluW = weight;
					break;
				}
			}
			//sort by weight
			articleWeights.sort((a,b) -> {
				if (b._2 > a._2 + 1e-9) {
					return 1;
				}
				else if (a._2 > b._2 + 1e-9) {
					return -1;
				} else {
					return 0;
				}
			});
			int totalAdded = 0;
			//get top articles 
			List<Integer> topArticles = new ArrayList<Integer>();
			for (Tuple2<Integer, Double> article : articleWeights) {
				int articleId = article._1;
				if (articleId >= articleCount) {
					continue;
				}
				totalAdded++;
				
				topArticles.add(articleId);
				if (totalAdded == 10) {
					break;
				}
			}
			System.out.println(username + " " + solu + " " + soluW);
			//add article recommendation
			Item item = new Item()
					.withPrimaryKey("username", username)
					.withNumber("publish_date", querDate)
					.withNumber("articleId", solu)
					.withNumber("timestamp", System.currentTimeMillis() / 1000L);
			posted.putItem(item);
			//add top articles to NewsWeights
			Item item2 = new Item()
					.withPrimaryKey("username", username)
					.withList("weights", topArticles);
			weightsTable.putItem(item2);
		}
	}
	
	public void init() {
		//init aws dynamodb
		client = AmazonDynamoDBClientBuilder.standard()
				.withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(
						Config.DYNAMODB_URL, "us-east-1"))
	    			.withCredentials(new DefaultAWSCredentialsProviderChain())
					.build();
		db = new DynamoDB(client);
	}
	
	public void run() throws IOException, URISyntaxException {
		long prevTotal = 0;
		long prevMin = 0;
		while (true) {
			//run total updates every 60 mins, check for interest updates every 30 secs
			long timest = System.currentTimeMillis() / 1000L;
			if (timest > prevTotal + 60 * 60) {
				prevTotal = timest;
				runTotalUpdates();
			}
			if (timest > prevMin + 60) {
				prevMin = timest;
				checkInterestUpdates();
			}
			try {
				TimeUnit.SECONDS.sleep(5);
			} catch (InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
	}
	
	void shutdown() {
		db.shutdown();
	}
	
	public static void main(String[] args) throws IOException, URISyntaxException {
		LivyRun livyRun = new LivyRun();
		livyRun.init();
		livyRun.run();
		livyRun.shutdown();
		
		
	}
}
