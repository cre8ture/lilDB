import { quantize } from '../database/quantizer';
import KMeans from 'ml-kmeans';

jest.mock('ml-kmeans');

describe('quantize', () => {
    it('should return quantized vectors', () => {
        // Arrange
        const vectors = [[1, 2], [3, 4], [5, 6]];
        const numClusters = 2;
        const expectedQuantizedVectors = [0, 1, 0];
        KMeans.mockReturnValue({ clusters: expectedQuantizedVectors });

        // Act
        const result = quantize(vectors, numClusters);

        // Assert
        expect(result).toEqual(expectedQuantizedVectors);
        expect(KMeans).toHaveBeenCalledWith(vectors, numClusters);
    });
});