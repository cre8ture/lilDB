# lilDB

lilDB is a compact vector database implemented in JavaScript. It allows for the storage and retrieval of vectors, and provides functionality for searching vectors based on cosine similarity.

## Getting Started

To get started with lilDB, you need to have Node.js and npm installed on your machine. Once you have those, follow these steps:

1. **Clone the repository**: Clone the lilDB repository to your local machine using the command `git clone <repository-url>`.

2. **Install dependencies**: Navigate to the root directory of the project and run `npm install` to install all the necessary dependencies.

3. **Build the project**: lilDB uses webpack for bundling its source code. You can build the project by running `npm run build`. This will create a `dist` directory with the bundled code.

4. **Run the project**: After building the project, you can run it using Node.js. The entry point of the application is specified in the `main` field of the `package.json` file. You can run the application with the command `node <entry-point>`. Replace `<entry-point>` with the value specified in the `main` field of the `package.json` file.

Please note that these instructions assume that you have the necessary permissions to install packages and run commands on your machine. If you encounter any issues, please check your permissions or contact your system administrator.

## How it works

lilDB stores vectors in a serializable format. It provides two main functionalities:

1. **Storing vectors**: Vectors are stored in a serializable format. This allows for easy storage and retrieval of vectors.

2. **Searching vectors**: lilDB provides a method to search for vectors based on cosine similarity. Given a query vector and a number `k`, it returns the `k` most similar vectors in the database.

The cosine similarity between two vectors is calculated as the dot product of the vectors divided by the product of their magnitudes. This value ranges from -1 to 1, with 1 indicating that the vectors are identical, -1 indicating that they are diametrically opposed, and 0 indicating that they are orthogonal.

## Effectiveness

lilDB is effective for simple use cases where the number of vectors is relatively small and the vectors are static. It provides a simple and intuitive API for storing and retrieving vectors, and the cosine similarity search functionality is a powerful tool for finding similar vectors.

## Shortcomings

lilDB has a few shortcomings:

1. **Scalability**: lilDB loads all vectors into memory when performing a search. This can be a problem when dealing with large datasets.

2. **Performance**: The cosine similarity search is performed in JavaScript, which may not be as fast as native implementations in lower-level languages.

3. **Lack of indexing**: lilDB does not provide any indexing functionality. This means that search operations are O(n), where n is the number of vectors in the database.

## Ways to improve

Here are a few ways lilDB could be improved:

1. **Implement indexing**: Implementing an indexing scheme, such as a KD-tree or a ball tree, could significantly improve the performance of search operations.

2. **Optimize for large datasets**: Currently, all vectors are loaded into memory when performing a search. This could be optimized by implementing a disk-based storage system or by using a database that supports vector operations natively.

3. **Use a faster language for computation**: The cosine similarity computation could be implemented in a lower-level language for better performance.

SOURCE
check out this for knn
https://github.com/mljs/ml


TO DO!
I need to fix the addVector