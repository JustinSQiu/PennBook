import java.util.ArrayList;
import java.util.List;

import java.io.IOException;

//import org.apache.logging.log4j.LogManager;
//import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.sql.SparkSession;

import scala.Tuple2;
import org.apache.livy.Job;
import org.apache.livy.JobContext;


public class Adsorption implements Job<List<MyPair<Integer, List<MyPair<Integer, Double>>>>>{

	SparkSession spark;
	
	JavaSparkContext context;

	JavaPairRDD<Tuple2<Integer, Integer>, Double> weightedEdgeRDD;
	JavaRDD<Integer> allNodes;
	List<Integer> userNodes;
	List<Tuple2<Tuple2<Integer, Integer>, Double>> edgeWeights;
	List<MyPair<MyPair<Integer, Integer>, Double>> edgeWeights2;
	List<Integer> allNodesList;
	
	public JavaPairRDD<Integer, Double> initWeights(int startNode) {
		//initialize all weights to 0, except startNode which is 1
		return allNodes.mapToPair(nodeNum -> {
			if (nodeNum == startNode) {
				return new Tuple2<Integer, Double>(nodeNum, 1.0);
			} else {
				return new Tuple2<Integer, Double>(nodeNum, 0.0);
			}
		});	
	}
	
	public JavaPairRDD<Integer, Double> adsorptionIteration(JavaPairRDD<Integer, Double> currWeights, int startNode) {
		//one iteration of an adsorption pass
		return weightedEdgeRDD.mapToPair(p -> {
			return new Tuple2<Integer, Tuple2<Integer, Double>>(p._1._1, new Tuple2<Integer, Double>(p._1._2, p._2));
		}).cogroup(currWeights).flatMapValues(p -> {
			List<Tuple2<Integer, Double>> endings = new ArrayList<Tuple2<Integer, Double>>();
			if (!p._2.iterator().hasNext()) {
				return endings.iterator();
			}
			double mult = p._2.iterator().next();
			for (Tuple2<Integer, Double> p2 : p._1) {
				int node = p2._1;
				double weight = p2._2 * mult;
				endings.add(new Tuple2<Integer, Double>(node, weight));
			}
			return endings.iterator();
		}).mapToPair(p -> {
			return new Tuple2<Integer, Double>(p._2._1, p._2._2);
		}).reduceByKey((a,b)->a+b);
	}
	
	public List<Tuple2<Integer, JavaPairRDD<Integer, Double>>> normalize(List<Tuple2<Integer, JavaPairRDD<Integer, Double>>> weights) {
		//normalize weights
		List<Tuple2<Integer, JavaPairRDD<Integer, Double>>> normWeights = new ArrayList<>();
		for (Tuple2<Integer, JavaPairRDD<Integer, Double>> w : weights) {
			double wSum = w._2.values().reduce((a,b)->a+b);
			double eps = 1e-9;
			JavaPairRDD<Integer, Double> norm = w._2.mapValues(p -> {
				if (wSum < eps) {
					return 0.0;
				} else {
					return p / wSum;
				}
			}).mapToPair(p -> {
				if ((int)p._1 == (int)w._1) {
					return new Tuple2<Integer, Double>(w._1, 1.0);
				} else {
					return p;
				}
			});
			normWeights.add(new Tuple2<Integer, JavaPairRDD<Integer, Double>>(w._1,norm));
		}
		return normWeights;
	}
	
	
	
	public List<MyPair<Integer, List<MyPair<Integer, Double>>>> getNodeWeights() {
		//get all node weights after several rounds of adsorption iterations
		weightedEdgeRDD = context.parallelizePairs(edgeWeights, Config.PARTITIONS);
		allNodes = context.parallelize(allNodesList, Config.PARTITIONS).distinct();
		System.out.println("Run 1");
		List<Tuple2<Integer, JavaPairRDD<Integer, Double>>> currWeights = new ArrayList<Tuple2<Integer, JavaPairRDD<Integer, Double>>>();
		for (int startNode : userNodes) {
			currWeights.add(new Tuple2<Integer, JavaPairRDD<Integer, Double>>(startNode, initWeights(startNode)));
		}
		double maxDiff = 0;
		double convergeDiff = 1e-5;
		int iterCount = 0;
		System.out.println("Run 2");
		do {
			List<Tuple2<Integer, JavaPairRDD<Integer, Double>>> newWeights = new ArrayList<>();
			for (Tuple2<Integer, JavaPairRDD<Integer, Double>> w : currWeights) {
				newWeights.add(new Tuple2<Integer, JavaPairRDD<Integer, Double>>(w._1, adsorptionIteration(w._2, w._1)));
			}
			List<Tuple2<Integer, JavaPairRDD<Integer, Double>>> normWeights = normalize(newWeights);
			maxDiff = 0;
			for (int i = 0; i < normWeights.size(); i++) {
				JavaPairRDD<Integer, Double> differences = normWeights.get(i)._2.join(currWeights.get(i)._2).mapValues(p -> Math.abs(p._1 - p._2));
				maxDiff = Math.max(maxDiff, differences.values().reduce((a,b) -> Math.max(a, b)));
			}
			currWeights = normWeights;
			iterCount++;
			System.out.println("iteration " + iterCount);
		} while(maxDiff > convergeDiff && iterCount < 15); //repeat 15 times or until convergence
		
		System.out.println("Run 3");
		List<MyPair<Integer, List<MyPair<Integer, Double>>>> solu = new ArrayList<>();
		for (Tuple2<Integer, JavaPairRDD<Integer, Double>> p : currWeights) {
			List<MyPair<Integer, Double>> soluIn = new ArrayList<>();
			List<Tuple2<Integer, Double>> p_list = p._2.collect();
			for (Tuple2<Integer, Double> p2 : p_list) {
				soluIn.add(new MyPair<Integer, Double>(p2._1, p2._2));
			}
			solu.add(new MyPair<Integer, List<MyPair<Integer, Double>>>(p._1, soluIn));
		}
		
		return solu;
	}
	
	
	
	public Adsorption(List<Integer> userNodes, List<MyPair<MyPair<Integer, Integer>, Double>> edgeWeights, List<Integer> allNodesList) {
		//initialize parameters
		this.userNodes = userNodes;
		this.edgeWeights2 = edgeWeights;
		this.edgeWeights = new ArrayList<>();
		for (MyPair<MyPair<Integer, Integer>, Double> p : edgeWeights2) {
			Tuple2<Integer, Integer> firstPair = new Tuple2<Integer, Integer>(p.getLeft().getLeft(), p.getLeft().getRight());
			double secondPart = p.getRight();
			this.edgeWeights.add(new Tuple2<Tuple2<Integer, Integer>, Double>(firstPair, secondPart));
		}
		this.allNodesList = allNodesList;
	}
	
	/**
	 * Initialize the database connection
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 */
	public void initialize() throws IOException, InterruptedException {
		//init spark
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		context.setLogLevel("ERROR");		
		
		
	}
	
	public void run() throws IOException, InterruptedException {
		
	}
	
	/**
	 * Graceful shutdown
	 */
	public void shutdown() {

		if (spark != null)
			spark.close();
		
		
	}

	@Override
	public List<MyPair<Integer, List<MyPair<Integer, Double>>>> call(JobContext arg0) throws Exception {
		initialize();
		return getNodeWeights();
	}

}
