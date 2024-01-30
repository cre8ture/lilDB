import * as tf from "@tensorflow/tfjs";
import { DBOperations } from "./dbOperations.js";
// import { quantize } from "./quantizer"; // Assuming quantizer.js exists
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { quantize, centroids } = require("./lib/quantizer.cjs");
import {
  tensorToSerializable,
  serializableToTensor,
  calculateEuclideanDistance,
} from "./serialize.js"; // Utility functions

const DATA_DIR = "./data/";
const dbPath = DATA_DIR + "vectorStorage.db";

export class NodeStorage {
  constructor() {
    this.dbOperations = new DBOperations(dbPath);
    this.requantizeThreshold = 1000; // Example threshold for re-quantization
  }

  async addVector(text, vector, source) {
    const tensor = tf.tensor(vector);
    const serializableVector = tensorToSerializable(tensor);

    if (await this._shouldRequantize()) {
      await this.performRequantization();                                                           
    }
    let array = tensor.arraySync();
    let clusterID = await this.dbOperations.getClusterIDForVector(array);
    this.dbOperations.addVector(
      text,
      JSON.stringify(serializableVector),
      source,
      clusterID
    );
  }

  async _shouldRequantize() {
    const allVectors = this.dbOperations.getAllVectors();
    return allVectors.length >= this.requantizeThreshold;
  }

  async performRequantization() {
    let allVectors = this.dbOperations.getAllVectors();
    allVectors = allVectors.map((vector) =>
      serializableToTensor(vector.vector).arraySync()
    );

    let numClusters = Math.min(10, Math.ceil(Math.sqrt(allVectors.length / 2)));
    let quantizedResults = quantize(allVectors, numClusters);

    this.dbOperations.clearCentroids();

    quantizedResults.centroids.forEach((centroid) => {
      this.dbOperations.addCentroid(
        JSON.stringify(tensorToSerializable(tf.tensor(centroid)))
      );
    });

    allVectors.forEach((vector, index) => {
      let clusterID = this.findClusterIDForVector(
        vector,
        quantizedResults.centroids
      );
      this.dbOperations.updateClusterID(index + 1, clusterID);
    });
  }

  findClusterIDForVector(vector, centroids) {
    let minDistance = Infinity;
    let clusterID = -1;

    centroids.forEach((centroid, index) => {
      let distance = calculateEuclideanDistance(vector, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        clusterID = index;
      }
    });

    return clusterID;
  }

  
  async searchSimilarVectors(searchVector, k=3) {
    searchVector = tf.tensor(searchVector);
  
    const search_centroid = this.dbOperations.makeCentroids(searchVector);
  
    // Use searchSimilarVectorsKCentroid function here
    const sorted_vectors = await this.dbOperations.searchSimilarVectorsKCentroid(search_centroid, k);
  
    return sorted_vectors;
  }



  getClusterIDForVector(vector) {
    const centroids = this.dbOperations.getCentroids();
    
    return this.findClusterIDForVector(
      vector,
      centroids.map((c) => serializableToTensor(c.centroid).arraySync())
    );
  }

  async clearDatabase() {
    // Clear vectors table
    this.dbOperations.clearTable("vectors");

    // Clear centroids table
    this.dbOperations.clearTable("centroids");

    // Additional tables can be cleared similarly
  }

  deleteEntireDatabase() {
    const dbFilePath = this.dbOperations.getDBFilePath();
    if (fs.existsSync(dbFilePath)) {
      fs.unlinkSync(dbFilePath); // Deletes the database file
    }
  }
}

const nodeStorage = new NodeStorage();

// Clear the database before starting the test
await nodeStorage.clearDatabase();
console.log("Database cleared.");

    // Example data
    let vector1 = [1, 2, 3];
    let text1 = "First Vector";
    let source1 = "source1";

    let vector2 = [4, 5, 6];
    let text2 = "Second Vector";
    let source2 = "source2";

    // Add first vector
    await nodeStorage.addVector(text1, vector1, source1);
    console.log("Added first vector.");

    // Display all vectors
    let allVectors = await nodeStorage.dbOperations.getAllVectors();
    console.log("All Vectors:", allVectors);

    // Add second vector
    await nodeStorage.addVector(text2, vector2, source2);
    console.log("Added second vector.");

    // Display all vectors
    allVectors = await nodeStorage.dbOperations.getAllVectors();
    console.log("All Vectors:", allVectors);

    // Delete first vector
    await nodeStorage.dbOperations.deleteVector(text1);
    console.log("Deleted first vector.");

    // Search for similar vectors to a new vector
    let searchVector = [3.5, 4.5, 5.5];
    let similarVectors = await nodeStorage.searchSimilarVectors(searchVector);
    console.log("Similar vectors to", searchVector, ":", similarVectors.map(v => v.vector.arraySync()));

    // Optional: Clear entire database
    // await nodeStorage.clearDatabase();
    // console.log("Cleared database.");

    // Optional: Delete entire database file
    // nodeStorage.deleteEntireDatabase();
    // console.log("Deleted database file.");