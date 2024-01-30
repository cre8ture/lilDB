import * as tf from '@tensorflow/tfjs';
import { NodeStorage } from './nodeDB';

async function main() {
    const nodeStorage = new NodeStorage();

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
}

main().catch(console.error);
