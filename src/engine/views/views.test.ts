import { describe, expect, it } from 'vitest';
import { GLIDER, generations, lifeStep, seed } from './lifeStack';
import { project4, tesseractEdges, tesseractVertices } from './tesseract';

describe('tesseract', () => {
  it('has 16 vertices and 32 edges, each vertex of degree 4', () => {
    const vertices = tesseractVertices();
    const edges = tesseractEdges();
    expect(vertices).toHaveLength(16);
    expect(edges).toHaveLength(32);
    const degree = new Array(16).fill(0);
    for (const [a, b] of edges) {
      degree[a]++;
      degree[b]++;
      const differing = vertices[a].filter((value, axis) => value !== vertices[b][axis]).length;
      expect(differing).toBe(1);
    }
    expect(degree.every((d) => d === 4)).toBe(true);
  });

  it('projects with perspective along W', () => {
    const none = { xw: 0, yw: 0, zw: 0 };
    expect(project4([1, 1, 1, 1], none, 3)).toEqual([1.5, 1.5, 1.5]);
    expect(project4([1, 1, 1, -1], none, 3)).toEqual([0.75, 0.75, 0.75]);
  });
});

describe('Game of Life', () => {
  it('a glider moves by (1, 1) every 4 generations', () => {
    const size = 12;
    const start = seed(size, GLIDER, 2, 2);
    const later = generations(start, size, 5)[4];
    expect(Array.from(later)).toEqual(Array.from(seed(size, GLIDER, 3, 3)));
  });

  it('a 2×2 block is stable', () => {
    const size = 6;
    const block = seed(size, [[0, 0], [1, 0], [0, 1], [1, 1]], 2, 2);
    expect(Array.from(lifeStep(block, size))).toEqual(Array.from(block));
  });
});
