const { kmeans } = require('ml-kmeans');
// Rest of your code
const numClusters = 1



function quantize(vectors, numClusters = Math.floor(Math.sqrt(vectors.length / 2))) {
    let result = kmeans(vectors, numClusters);
    let quantizedVectors = result.clusters;
    return quantizedVectors;
}


function centroids(vectors) { //}, numClusters = Math.floor(Math.sqrt(vectors.length / 2))) {
    // if (numClusters===0) numClusters = 1
    let result = kmeans(vectors, numClusters);
    let centroids = result.centroids[0];
    return centroids 
}

function calculateCentroid(vector) {
    // Initialize a new vector with the same length as the vectors in the cluster
    // let centroid = Array(cluster[0].length).fill(0);
  console.log("calculateCentroid i am vector", vector)
 // Calculate the sum of the centroid array
 let sum = vector.reduce((a, b) => a + b, 0);

 // Calculate the mean of the centroid array
 let mean = sum / vector.length;

//  mean = Math.floor(mean)

 clusterID = mean

   return clusterID;
    }

// Usage
// let vectors = Array.from({length: 10000}, () => [Math.random(), Math.random(), Math.random()]);
// let numClusters = 10;
// console.log(vectors)
// let quantizedVectors = quantize(vectors, numClusters);

// console.log(quantizedVectors);

// let centroids = centroids(vectors, numClusters);
// console.log(centroids);


module.exports = { quantize, centroids, calculateCentroid };
