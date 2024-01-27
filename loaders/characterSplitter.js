export class CustomTextSplitter {
    constructor(interval, overlap, charToSplit='\n\n') {
      this.interval = interval;
      this.overlap = overlap;
      this.charToSplit = charToSplit
    }
  
    split(text) {
      const result = [];
      const lines = text.split(this.charToSplit);
      for (const line of lines) {
        for (let i = 0; i < line.length; i += this.interval - this.overlap) {
          const chunk = line.substring(i, i + this.interval);
          result.push(chunk);
          if (chunk.length < this.interval) {
            break;
          }
        }
      }
      return result;
    }
  }