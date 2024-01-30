import * as tf from "@tensorflow/tfjs";

export async function tensorToSerializable(tensorOrPromise) {
  // If tensorOrPromise is a Promise, await it to get the Tensor
  const tensor =
    tensorOrPromise instanceof Promise
      ? await tensorOrPromise
      : tensorOrPromise;
  console.log("i am tensor to serialize", tensor);

  // If tensor.data is a function, call it to get the data
  const data = tensor.dataSync
    ? tensor.dataSync()
    : Float32Array.from(tensor.data);
  // Access the shape property directly
  const shape = tensor.shape || tensor.dims;

  return { data, shape };
}
export function jsonToTensor(serializable) {
  // Convert the data object to an array
  const data = Object.values(serializable.data);

  // Create a tensor from the data and shape
  const tensor = tf.tensor(data, serializable.shape);

  return tensor;
}

export async function serializableToTensor(serializable) {
  let dataArray;
  if (!ArrayBuffer.isView(serializable.data)) {
    console.log("i am UN serializable to tensor", serializable);
    // dataArray = serializable.data instanceof Promise ? await serializable.data : serializable.data;
    console.error("serializable.data must be a TypedArray", dataArray);
    return serializable;
  } else {
    dataArray = serializable.data;
  }

  let shape = serializable.shape;
  if (!shape) {
    if (serializable.size) {
      shape = [serializable.size];
    } else if (dataArray.length) {
      shape = [dataArray.length];
    } else {
      throw new Error("Could not determine shape of tensor");
    }
  }

  console.log(dataArray, "AND", serializable);
  return tf.tensor(dataArray, shape);
}

export function calculateEuclideanDistance(vector1, vector2) {
  return Math.sqrt(
    vector1.reduce(
      (sum, value, index) => sum + Math.pow(value - vector2[index], 2),
      0
    )
  );
}

export function calculateSimilarity(vector1, vector2) {
  // Implement the similarity calculation here
  // For example, using Euclidean distance
  const diff = vector1.sub(vector2);
  return diff.norm().dataSync()[0];
}

export function findClusterIDForVector(vector, centroids) {
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

export function calculateDistance(centroid, vector) {
  // Implement the distance calculation between two tensors
  // Assuming centroid and vector are TensorFlow.js tensors
  const diff = centroid.sub(vector);
  return diff.norm().dataSync()[0];
}
