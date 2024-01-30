import Database from 'better-sqlite3';
import fs from 'fs';
import * as tf from '@tensorflow/tfjs';

import { tensorToSerializable, serializableToTensor, calculateEuclideanDistance, calculateSimilarity, jsonToTensor} from "./serialize.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { quantize, centroids, calculateCentroid } = require("./lib/quantizer.cjs");

export class DBOperations {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this._initializeDB();
    }

    _initializeDB() {
        // Create tables if they do not exist
        const tableCreationQuery = `
            CREATE TABLE IF NOT EXISTS vectors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT UNIQUE,
                vector BLOB,
                source TEXT,
                clusterID TEXT
            );
        `;

        const createCentroidsTableQuery = `
            CREATE TABLE IF NOT EXISTS centroids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                centroid BLOB
            );
        `;

        this.db.prepare(tableCreationQuery).run();
        this.db.prepare(createCentroidsTableQuery).run();
    }


    // /**
    //  * Searches for vectors in a specific cluster.
    //  * @param {number} clusterID - The cluster ID to search for.
    //  * @returns {Array} - An array of vectors belonging to the specified cluster.
    //  */
    // async searchVectorsInCluster(clusterID) {
    //     try {
    //         const selectQuery = `SELECT vector FROM vectors WHERE clusterID = ?`;
    //         const rows = this.db.prepare(selectQuery).all(clusterID);
    //         return rows.map(row => serializableToTensor(JSON.parse(row.vector)));
    //     } catch (error) {
    //         console.error("Error retrieving vectors by cluster ID", error);
    //         return [];
    //     }
    // }


    async addVector(text, vector, source, clusterID) {
        const insertQuery = `INSERT INTO vectors (text, vector, source, clusterID) VALUES (?, ?, ?, ?)`;
        console.log("insertQery", insertQuery)
        try {
            await this.db.prepare(insertQuery).run(text, vector, source, clusterID);
        } catch (error) {
            console.error("Error adding vector to database", error);
        }
    }
    

    getVectorByText(text) {
        const selectQuery = `SELECT * FROM vectors WHERE text = ?`;
        try {
            return this.db.prepare(selectQuery).get(text);
        } catch (error) {
            console.error("Error retrieving vector by text", error);
            return null;
        }
    }

    getAllVectors() {
        const selectAllQuery = `SELECT * FROM vectors`;
        try {
            return this.db.prepare(selectAllQuery).all();
        } catch (error) {
            console.error("Error retrieving all vectors", error);
            return [];
        }
    }

    updateClusterID(vectorID, newClusterID) {
        const updateQuery = `UPDATE vectors SET clusterID = ? WHERE id = ?`;
        try {
            this.db.prepare(updateQuery).run(newClusterID, vectorID);
        } catch (error) {
            console.error("Error updating cluster ID", error);
        }
    }

    deleteVector(text) {
        const deleteQuery = `DELETE FROM vectors WHERE text = ?`;
        try {
            this.db.prepare(deleteQuery).run(text);
        } catch (error) {
            console.error("Error deleting vector", error);
        }
    }

    getCentroids() {
        const selectQuery = `SELECT * FROM centroids`;
        try {
            return this.db.prepare(selectQuery).all();
        } catch (error) {
            console.error("Error retrieving centroids", error);
            return [];
        }
    }

    makeCentroids(vector){
        if(!Array.isArray(vector)) vector = vector.arraySync()
        const centroid = calculateCentroid(vector);
        return centroid;
    }

    addCentroid(centroid) {
        const insertQuery = `INSERT INTO centroids (centroid) VALUES (?)`;
        try {
            this.db.prepare(insertQuery).run(centroid);
        } catch (error) {
            console.error("Error adding centroid", error);
        }
    }

    clearCentroids() {
        const clearQuery = `DELETE FROM centroids`;
        try {
            this.db.prepare(clearQuery).run();
        } catch (error) {
            console.error("Error clearing centroids", error);
        }
    }

    async clearDatabase() {
        // Clear vectors table
        this.dbOperations.clearTable('vectors');
    
        // Clear centroids table
        this.dbOperations.clearTable('centroids');
    
    }
    deleteEntireDatabase() {
        const dbFilePath = this.dbOperations.getDBFilePath();
        if (fs.existsSync(dbFilePath)) {
            fs.unlinkSync(dbFilePath); // Deletes the database file
        }
    }

    clearTable(tableName) {
        const clearQuery = `DELETE FROM ${tableName}`;
        try {
            this.db.prepare(clearQuery).run();
        } catch (error) {
            console.error(`Error clearing table ${tableName}`, error);
        }

        
    }
    getDBFilePath() {
        return this.db.name; // Assuming 'name' property contains the file path
    }

    async getVectorsForCluster(clusterID) {
        try {

          const selectQuery = `SELECT vector FROM vectors WHERE clusterID = ?`;
          const rows = this.db.prepare(selectQuery).all(clusterID);
          console.log(" getAllVectors()",clusterID,this.getAllVectors())
          console.log("ROWS", rows )
          return rows.map((row) => jsonToTensor(JSON.parse(row.vector)));
        } catch (error) {
          console.error("Error retrieving vectors by cluster ID", error);
        }
      }
    
    
    async getAllClusterIDs() {
        try {
          const selectQuery = `SELECT DISTINCT clusterID FROM vectors`;
          const rows = this.db.prepare(selectQuery).all();
          return rows.map((row) => parseFloat(row.clusterID));
        } catch (error) {
          console.error("Error retrieving all clusterIDs", error);
        }
      }

      async searchVectorsInCluster(clusterID, k=3) {
        const allClusterIDs = await this.getAllClusterIDs();
      
        const target = clusterID;
      
        // Create an array of objects where each object contains a clusterID and its corresponding difference
        const differences = allClusterIDs.map(id => ({ clusterID: id, difference: Math.abs(id - target) }));
      
        // Sort the array by the difference
        const sortedDifferences = differences.sort((a, b) => a.difference - b.difference);
        console.log("sortedDifferences", sortedDifferences)
        // Extract the k clusterIDs with the smallest differences
        const closestClusters = sortedDifferences.slice(0, k).map(obj => obj.clusterID);
        console.log("closestClusters", closestClusters)
        // Retrieve the vectors for each of the k closest clusterIDs
        const vectors = [];
        for (const cluster of closestClusters) {
          const clusterVectors = await this.getVectorsForCluster(cluster.toString());
          vectors.push(...clusterVectors);
        }
      
        return vectors;
      }
      
      async getClusterIDForVector(vector) {
        let centroids = await this.getCentroids();
        if (!centroids || centroids === -1 || centroids.length === 0) {
          centroids = this.makeCentroids(vector);
        }
      
        // let minDistance = Infinity;
        let clusterID = -1;
      
        // // Calculate the distance to each centroid
        // for (let i = 0; i < centroids.length; i++) {
        //   const distance = calculateDistance(vector, centroids[i]);
        //   if (distance < minDistance) {
        //     minDistance = distance;
        //     clusterID = i;
        //   }
        // }
        clusterID = calculateCentroid(vector)
      
        return clusterID.toString();
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

  async searchSimilarVectorsKCentroid(centroid, k=3) {

    let clusterVectors = await this.searchVectorsInCluster(centroid.toString());
  
    // Calculate similarity or distance to each vector in the cluster
    const similarities = clusterVectors.map((clusterVector) => {
      return {
        vector: clusterVector,
        similarity: calculateSimilarity(clusterVector, centroid),
      };
    });
  
    // Sort by similarity (or distance)
    similarities.sort((a, b) => b.similarity - a.similarity);
  
    // If k is defined and less than the number of vectors, return only the first k vectors
    if (k && k < similarities.length) {
      return similarities.slice(0, k);
    }
  
    // Otherwise, return all vectors
    return similarities;
  }

  async getRecordsForVectors(vectorList) {
    const records = [];
    // console.log("vectorList", vectorList)
    for (const vector of vectorList) {
      const selectQuery = `SELECT * FROM vectors WHERE vector = ?`;
      const stmt = this.db.prepare(selectQuery);
      console.log("vector1------------", vector)
      // const arr = vector.vector.dataSync()
      const serialized = await tensorToSerializable(vector.vector);
      // const serialized = {data: arr, shape: arr.length}
      const row = stmt.get(JSON.stringify(serialized));
      console.log("row", row)
      if (row) {
        records.push(row);
      }
    }
    return records;
  }
}
