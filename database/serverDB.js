import Database from "better-sqlite3";
import { tensorToSerializable, serializableToTensor, calculateEuclideanDistance, calculateSimilarity} from "./serialize.js";
import * as tf from "@tensorflow/tfjs";
import { AbstractStorage } from "./baseStorage.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { quantize } = require("./lib/quantizer.cjs");

const DATA_DIR = "./data/";

export class NodeStorage extends AbstractStorage {
  constructor() {
    super();
    this._ensureDataDir();
    this.db = new Database(path.join(DATA_DIR, "vectorStorage.db"));
    this._initializeDB();
    this._begin = this.db.prepare("BEGIN");
    this._commit = this.db.prepare("COMMIT");
    this._rollback = this.db.prepare("ROLLBACK");
    this.requantizeThreshold = 1000; // Example threshold
  }

  _ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  _initializeDB() {
    const tableCreationQuery = `
            CREATE TABLE IF NOT EXISTS vectors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT UNIQUE,
                vector BLOB,
                source TEXT,
                clusterID INTEGER
            );
        `;
    this.db.prepare(tableCreationQuery).run();

    const createCentroidsTableQuery = `
            CREATE TABLE IF NOT EXISTS centroids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                centroid BLOB
            );
        `;
    this.db.prepare(createCentroidsTableQuery).run();

    // Add indexes after table creation
    const createIndexText = `CREATE INDEX IF NOT EXISTS idx_vectors_text ON vectors(text);`;
    const createIndexVector = `CREATE INDEX IF NOT EXISTS idx_vectors_vector ON vectors(vector);`;
    const createIndexSource = `CREATE INDEX IF NOT EXISTS idx_vectors_source ON vectors(source);`;
    const createIndexClusterID = `CREATE INDEX IF NOT EXISTS idx_vectors_clusterID ON vectors(clusterID);`;

    this.db.prepare(createIndexText).run();
    this.db.prepare(createIndexVector).run();
    this.db.prepare(createIndexSource).run();
    this.db.prepare(createIndexClusterID).run();
  }

  async addVector(text, vector, source) {
    this._begin.run();

    try {
      const tensor = tf.tensor(vector);
      const serializableVector = await tensorToSerializable(tensor);
      if (await this._shouldRequantize()) {
        await this.performRequantization();
      }

      // Use `this` to refer to the current instance
      let clusterID = await this.getClusterIDForVector(tensor);

      const insertQuery = `INSERT INTO vectors (text, vector, source, clusterID) VALUES (?, ?, ?, ?)`;
      this.db
        .prepare(insertQuery)
        .run(text, JSON.stringify(serializableVector), source, clusterID);

      this._commit.run();
    } catch (error) {
      console.error("Error adding vector to database", error);
      this._rollback.run();
    }
  }

  async _shouldRequantize() {
    const countQuery = `SELECT COUNT(*) as count FROM vectors`;
    const result = this.db.prepare(countQuery).get();
    return result.count >= this.requantizeThreshold;
  }

  async performRequantization() {
    // Retrieve all vectors for re-quantization
    let allVectors = await this.getAllVectors();
    allVectors = allVectors.map((tensor) => tensor.arraySync()); // Convert tensors to arrays

    // Determine the number of clusters
    // This can be a fixed number or a function of the number of vectors
    let numClusters = Math.min(10, Math.ceil(Math.sqrt(allVectors.length / 2)));

    // Re-run quantization
    let quantizedResults = quantize(allVectors, numClusters);

    // Clear the current centroids table
    const clearCentroidsQuery = `DELETE FROM centroids`;
    this.db.prepare(clearCentroidsQuery).run();

    // Update centroids table with new centroids
    quantizedResults.centroids.forEach((centroid) => {
      const insertCentroidQuery = `INSERT INTO centroids (centroid) VALUES (?)`;
      this.db
        .prepare(insertCentroidQuery)
        .run(JSON.stringify(tensorToSerializable(tf.tensor(centroid))));
    });

    // Optionally, update clusterID for each vector in the vectors table
    // This part can be resource-intensive for large datasets
    for (let i = 0; i < allVectors.length; i++) {
      let clusterID = this.findClusterIDForVector(
        allVectors[i],
        quantizedResults.centroids
      );
      // Update the vectors table with the new clusterID
      const updateClusterIDQuery = `UPDATE vectors SET clusterID = ? WHERE id = ?`;
      this.db.prepare(updateClusterIDQuery).run(clusterID, i + 1); // Assuming 'id' is a 1-based index
    }
  }

  findClusterIDForVector(vector, centroids) {
    let minDistance = Infinity;
    let clusterID = -1;

    for (let i = 0; i < centroids.length; i++) {
      let distance = calculateEuclideanDistance(vector, centroids[i]);
      if (distance < minDistance) {
        minDistance = distance;
        clusterID = i; // Assuming centroid IDs are 0-based index
      }
    }

    return clusterID;
  }

//   calculateEuclideanDistance(vector1, vector2) {
//     return Math.sqrt(
//       vector1.reduce(
//         (sum, value, index) => sum + Math.pow(value - vector2[index], 2),
//         0
//       )
//     );
//   }

  async getVectorByText(text) {
    try {
      const selectQuery = `SELECT vector FROM vectors WHERE text = ?`;
      const row = this.db.prepare(selectQuery).get(text);
      return row ? serializableToTensor(JSON.parse(row.vector)) : null;
    } catch (error) {
      console.error("Error retrieving vector by text", error);
      // Handle the error, e.g., return null or throw
    }
  }

  async getAllVectors() {
    try {
      const selectAllQuery = `SELECT vector FROM vectors`;
      const rows = this.db.prepare(selectAllQuery).all();
      return rows.map((row) => serializableToTensor(JSON.parse(row.vector)));
    } catch (error) {
      console.error("Error retrieving all vectors", error);
      // Handle the error, e.g., return an empty array or throw
    }
  }

  clearDatabase() {
    // Start a database transaction
    this._begin.run();

    try {
      const clearQuery = `DELETE FROM vectors`;
      this.db.prepare(clearQuery).run();
      console.log("Database cleared successfully");

      // If everything is successful, commit the transaction
      this._commit.run();
    } catch (error) {
      console.error("Error clearing the database", error);
      // If there's an error, rollback the transaction
      this._rollback.run();
      // Handle the error, e.g., re-throw, return an error status, etc.
    }
  }

  async searchVectorsInCluster(clusterID) {
    try {
      const selectQuery = `SELECT vector FROM vectors WHERE clusterID = ?`;
      const rows = this.db.prepare(selectQuery).all(clusterID);
      return rows.map((row) => serializableToTensor(JSON.parse(row.vector)));
    } catch (error) {
      console.error("Error retrieving vectors by cluster ID", error);
    }
  }

  async getClusterIDForVector(vector) {
    const centroids = await this._getCentroids();
    let minDistance = Infinity;
    let clusterID = -1;

    for (let i = 0; i < centroids.length; i++) {
      const centroid = serializableToTensor(JSON.parse(centroids[i].centroid));
      const distance = this._calculateDistance(centroid, vector);
      if (distance < minDistance) {
        minDistance = distance;
        clusterID = centroids[i].id;
      }
    }

    return clusterID;
  }

  _calculateDistance(centroid, vector) {
    // Implement the distance calculation between two tensors
    // Assuming centroid and vector are TensorFlow.js tensors
    const diff = centroid.sub(vector);
    return diff.norm().dataSync()[0];
  }

  _getCentroids() {
    // Retrieve centroids from the database
    const selectQuery = `SELECT * FROM centroids`;
    return this.db.prepare(selectQuery).all();
  }

  async performInitialQuantization(vectors) {
    let numClusters = 10; // Determine the appropriate number of clusters
    let quantizedResults = quantize(vectors, numClusters);

    // Assuming quantizedResults contains information about clusters and their centroids
    // Store the centroids in the centroids table
    quantizedResults.centroids.forEach((centroid) => {
      const insertCentroidQuery = `INSERT INTO centroids (centroid) VALUES (?)`;
      this.db
        .prepare(insertCentroidQuery)
        .run(JSON.stringify(tensorToSerializable(centroid)));
    });

    // For each vector, find its cluster, calculate clusterID and store in the vectors table
    vectors.forEach((vector) => {
      let clusterID = this.findClusterIDForVector(
        vector,
        quantizedResults.centroids
      );
      // Store the vector along with its clusterID in the vectors table
      this.addVector(vector, clusterID);
    });
  }
  async performRequantization() {
    // Retrieve all vectors for re-quantization
    let allVectors = await this.getAllVectors();
    allVectors = allVectors.map((tensor) => tensor.arraySync()); // Convert tensors to arrays

    // Determine the number of clusters
    // This can be a fixed number or a function of the number of vectors
    let numClusters = Math.min(10, Math.ceil(Math.sqrt(allVectors.length / 2)));

    // Re-run quantization
    let quantizedResults = quantize(allVectors, numClusters);

    // Clear the current centroids table
    const clearCentroidsQuery = `DELETE FROM centroids`;
    this.db.prepare(clearCentroidsQuery).run();

    // Update centroids table with new centroids
    quantizedResults.centroids.forEach((centroid) => {
      const insertCentroidQuery = `INSERT INTO centroids (centroid) VALUES (?)`;
      this.db
        .prepare(insertCentroidQuery)
        .run(JSON.stringify(tensorToSerializable(tf.tensor(centroid))));
    });

    // Optionally, update clusterID for each vector in the vectors table
    // This part can be resource-intensive for large datasets
    for (let i = 0; i < allVectors.length; i++) {
      let clusterID = this.findClusterIDForVector(
        allVectors[i],
        quantizedResults.centroids
      );
      // Update the vectors table with the new clusterID
      const updateClusterIDQuery = `UPDATE vectors SET clusterID = ? WHERE id = ?`;
      this.db.prepare(updateClusterIDQuery).run(clusterID, i + 1); // Assuming 'id' is a 1-based index
    }
  }

  findClusterIDForVector(vector, centroids) {
    let minDistance = Infinity;
    let clusterID = -1;

    for (let i = 0; i < centroids.length; i++) {
      let distance = this.calculateEuclideanDistance(vector, centroids[i]);
      if (distance < minDistance) {
        minDistance = distance;
        clusterID = i; // Assuming centroid IDs are 0-based index
      }
    }

    return clusterID;
  }

//   calculateEuclideanDistance(vector1, vector2) {
//     return Math.sqrt(
//       vector1.reduce(
//         (sum, value, index) => sum + Math.pow(value - vector2[index], 2),
//         0
//       )
//     );
//   }


  async searchSimilarVectors(searchVector) {
    // Convert search vector to tensor if it's not already one
    if (!Array.isArray(searchVector)) {
      searchVector = tf.tensor(searchVector);
    }

    // Find the cluster ID for the search vector
    const clusterID = await this.getClusterIDForVector(searchVector);

    // Retrieve vectors from the identified cluster
    const clusterVectors = await this.searchVectorsInCluster(clusterID);

    // Calculate similarity or distance to each vector in the cluster
    const similarities = clusterVectors.map((clusterVector) => {
      return {
        vector: clusterVector,
        similarity: calculateSimilarity(clusterVector, searchVector),
      };
    });

    // Sort by similarity (or distance)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return sorted vectors or just the similarities, depending on your requirement
    return similarities;
  }
}

//   _calculateSimilarity(vector1, vector2) {
//     // Implement the similarity calculation here
//     // For example, using Euclidean distance
//     const diff = vector1.sub(vector2);
//     return diff.norm().dataSync()[0];
//   }
// }

//////////////////////////-----------------
const nodeStorage = new NodeStorage();
await nodeStorage.clearDatabase(); // Clear the database

let exampleVector = [1.0, 2.0, 3.0];
let exampleText = "example text";
await nodeStorage.addVector(exampleText, exampleVector, "exampleSource");

// Perform initial quantization with the current data
let allVectors = await nodeStorage.getAllVectors();
allVectors = allVectors.map((tensor) => tensor.arraySync());
await nodeStorage.performInitialQuantization(allVectors);

let searchVector2 = [1.1, 2.1, 3.1];
let similarVectors = await nodeStorage.searchSimilarVectors(searchVector2);

// Log the similar vectors
similarVectors.forEach((result) => {
  console.log("Similarity:", result.similarity);
  console.log("Vector:", result.vector.arraySync());
});
