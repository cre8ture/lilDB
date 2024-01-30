// Check if running in Node.js
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

export class AbstractStorage {
    async addVector(text, vector, source) { /* implementation */ }
    async deleteVector(text) { /* implementation */ }
    async getVectorByText(text) { /* implementation */ }
    async getAllVectors() { /* implementation */ }
    // ... other methods
  }