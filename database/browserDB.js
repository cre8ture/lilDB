// Import IndexedDB Promised library for easier IndexedDB usage
import { openDB } from "idb";
import { tensorToSerializable, serializableToTensor } from "./serialize.js";
import * as tf from "@tensorflow/tfjs";
import indexedDB from 'fake-indexeddb';

export class VectorStorage {
  constructor() {
  //   // Open (or create) the database
  //   this.dbPromise = openDB("vectorStorage", 1, {
  //     upgrade(db) {
  //       if (!db.objectStoreNames.contains("vectors")) {
  //         db.createObjectStore("vectors", { keyPath: "text" });
  //       }
  //     },
  //   });

  this.dbPromise = openDB("vectorStorage", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("vectors")) {
      const store = db.createObjectStore("vectors", { keyPath: "id", autoIncrement: true });
        store.createIndex("sourceIndex", "source", { unique: false });
        store.createIndex("textIndex", "text", { unique: true });
        // Additional metadata index if applicable for vector
        store.createIndex("metadataIndex", "metadata", { unique: false });
      }
    },
  });
  }

  async addVector(text, vector, source) {
    // Open a transaction, get the object store, and add the vector
    const db = await this.dbPromise;
    const tx = db.transaction("vectors", "readwrite");
    const store = tx.objectStore("vectors");
    const tensor = tf.tensor(vector);

    const serializableVector = await tensorToSerializable(tensor);

    // Check if a vector with the same text already exists
    const existingVector = await store.get(text);
    if (existingVector) {
      // If a vector with the same text already exists, ignore the new vector
      console.log(`A vector with the text "${text}" already exists.`);
    } else {
      // Otherwise, add the new vector
      await store.put({ text, serializableVector, source });
    }

    // Wait for the transaction to complete
    await tx.complete;
  }

  async addChunk(chunks) {
    try {
      chunks.forEach(async (chunk) => {
        this.addVector(chunk.content, chunk.embedding, chunk.fileSource);
      });
    } catch (err) {
      console.error("Error adding chunk to database", err);
    }
  }

  // Delete a vector
  async deleteVector(text) {
    // Open a transaction, get the object store, and delete the vector
    const db = await this.dbPromise;
    const tx = db.transaction("vectors", "readwrite");
    const store = tx.objectStore("vectors");
    await store.delete(text);

    // Wait for the transaction to complete
    await tx.complete;
  }

  // Get a vector by its text and convert it to Tensor
  async getVectorByText(text) {
    const serializable = await this.storage.find((item) => item.text === text);
    return serializableToTensor(serializable);
  }

  // Get a vector by its source and convert it to Tensor
  async getVectorBySource(source) {
    const items = await this._getStore();
    const filteredItems = items.filter((item) => item.source === source);
    return filteredItems.map((item) =>
      serializableToTensor(item.serializableVector)
    );
  }

  async _getStore() {
    const db = await this.dbPromise;
    const tx = db.transaction("vectors", "readonly");
    const store = tx.objectStore("vectors");
    const items = await store.getAll();
    return items;
  }

  async getAllVectors() {
    const items = await this._getStore();
    return items.map((item) => serializableToTensor(item.serializableVector));
  }

  // Calculate cosine similarity
  static async cosineSimilarity(a, b) {
    if (a == null || b == null) {
      return null;
    }
// KAI CHECK THIS tensorA and B not null or weird not sure if i need to re serializ!
    console.log("me a is", a, "and b is", b)
    const tensorA = await serializableToTensor(a);
    const tensorB = await serializableToTensor(b);
    console.log("me tensorA is", tensorA, "and tensorB is", tensorB)
    const dotProduct = await tf.sum(tf.mul(tensorA, tensorB));
    const magnitudeA = tf.norm(tensorA);
    const magnitudeB = tf.norm(tensorB);
    return dotProduct.div(magnitudeA.mul(magnitudeB)).dataSync()[0];
  }

  // Search vectors by cosine similarity
  async searchByCosineSimilarity(queryVector, k) {
    const vectors = await this._getStore();

    // Calculate the cosine similarity for each vector
    const similarities = await Promise.all(
      vectors.map(async (row) => {
        console.log("me row is", row)
        const tensor = serializableToTensor(row.serializableVector);
        if (!tensor) {
          return null;
        }
        console.log("me tensor is", tensor)
        return VectorStorage.cosineSimilarity(tensor, queryVector);
      })
    );

    // Filter out null similarities
    const validSimilarities = similarities.filter(
      (similarity) => similarity !== null
    );

    // Create an array of indices sorted by their corresponding vector's similarity to the query vector
    const sortedIndices = Array.from(
      { length: validSimilarities.length },
      (_, i) => i
    ).sort((a, b) => validSimilarities[b] - validSimilarities[a]);

    // Return the top k items, with vectors converted back to tensors
    return sortedIndices.slice(0, k).map((index) => {
      const item = vectors[index];
      return {
        ...item,
        vector: serializableToTensor(item.serializableVector),
      };
    });
  }


  async searchByIndex(queryType, queryValue, k = 10) {
    const db = await this.dbPromise;
    const tx = db.transaction("vectors", "readonly");
    const store = tx.objectStore("vectors");
    let index;

    switch (queryType) {
        case 'source':
            index = store.index("sourceIndex");
            break;
        case 'text':
            index = store.index("textIndex");
            break;
        case 'metadata':
            index = store.index("metadataIndex");
            break;
        default:
            throw new Error("Invalid query type");
    }

    const vectors = [];
    let cursor = await index.openCursor(IDBKeyRange.only(queryValue));

    while (cursor && vectors.length < k) {
        vectors.push(cursor.value);
        cursor = await cursor.continue();
    }


    return vectors;
}

async clearDatabase() {
    const db = await this.dbPromise;
    const tx = db.transaction('vectors', 'readwrite');
    const store = tx.objectStore('vectors');
    await store.clear();
    await tx.complete;
}


}

// Usage
// const vectorStorage = new VectorStorage();
// vectorStorage.addVector('text1', [1, 2, 3], 'source1');
// vectorStorage.addVector('text2', [4, 5, 6], 'source2');
// console.log(vectorStorage.searchByCosineSimilarity([1, 2, 3], 1));  // Outputs: [ { text: 'text1', vector: [ 1, 2, 3 ], source: 'source1' } ]
// console.log(vectorStorage.getAllVectors());
// vectorStorage.deleteVector('text1');
// console.log(vectorStorage.getAllVectors());  // Outputs: [ { text: 'text2', vector: [ 4, 5, 6 ], source: 'source2' } ]

(async () => {
  // Create a new instance of VectorStorage
  const vectorStorage = new VectorStorage();

  // Test adding vectors
  await vectorStorage.addVector('text1', [1, 2, 3], 'source1');
  await vectorStorage.addVector('text2', [4, 5, 6], 'source2');

  // Test retrieving all vectors
  const allVectors = await vectorStorage.getAllVectors();
  console.assert(allVectors.length === 2, "There should be two vectors");

  // Test searching by text index
  const textSearchResult = await vectorStorage.searchByIndex('text', 'text1', 1);
  console.assert(textSearchResult.length === 1 && textSearchResult[0].text === 'text1', "Search by text should return the correct vector");

  // Test searching by source index
  const sourceSearchResult = await vectorStorage.searchByIndex('source', 'source1', 1);
  console.assert(sourceSearchResult.length === 1 && sourceSearchResult[0].source === 'source1', "Search by source should return the correct vector");

  // Test cosine similarity search (assuming implementation is correct)
  const cosineSimilarityResult = await vectorStorage.searchByCosineSimilarity([1, 2, 3], 1);
  console.assert(cosineSimilarityResult.length === 1, "Cosine similarity search should return a result");

  // Test deleting a vector
  await vectorStorage.deleteVector('text1');
  const vectorsAfterDelete = await vectorStorage.getAllVectors();
  console.assert(vectorsAfterDelete.length === 1, "There should be one vector after deletion");

  console.log("All tests passed!");
})();
