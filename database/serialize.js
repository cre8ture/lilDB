import * as tf from '@tensorflow/tfjs';


export async function tensorToSerializable(tensorOrPromise) {
  // If tensorOrPromise is a Promise, await it to get the Tensor
  const tensor = tensorOrPromise instanceof Promise ? await tensorOrPromise : tensorOrPromise;
  console.log("i am tensor to serialize", tensor)
  
  // If tensor.data is a function, call it to get the data
  const data = tensor.dataSync ? tensor.dataSync() : Float32Array.from(tensor.data);
  // Access the shape property directly
  const shape = tensor.shape || tensor.dims;
  
  return { data, shape };
}

  export async function serializableToTensor(serializable) {
    let dataArray;
    if (!ArrayBuffer.isView(serializable.data)) {
        console.log("i am UN serializable to tensor", serializable);
        // dataArray = serializable.data instanceof Promise ? await serializable.data : serializable.data;
        console.error('serializable.data must be a TypedArray', dataArray);
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
            throw new Error('Could not determine shape of tensor');
        }
    }
  
    console.log(dataArray, "AND", serializable);
    return tf.tensor(dataArray, shape);
  }