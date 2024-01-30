
// Factory function
export function createStorage() {
    const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
    
    if (isNode) {
      return new NodeStorage();
    } else {
      return new IndexedDBStorage();
    }
  }
  