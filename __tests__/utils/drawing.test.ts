import { getLinePoints, createEmptyPixels, floodFill } from '@/utils/drawing';

describe('drawing utils', () => {
  it('creates an empty grid', () => {
    const g = createEmptyPixels(3, 2);
    expect(g).toEqual([[0, 0, 0], [0, 0, 0]]);
  });

  it('draws horizontal, vertical, diagonal and reversed lines', () => {
    expect(getLinePoints(0, 0, 2, 0)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
    expect(getLinePoints(1, 0, 1, 2).map((p) => p.y)).toEqual([0, 1, 2]);
    expect(getLinePoints(2, 2, 0, 0)).toHaveLength(3);
    expect(getLinePoints(0, 0, 0, 0)).toEqual([{ x: 0, y: 0 }]);
  });

  it('flood fills a contiguous region only', () => {
    const g = [
      [0, 0, 1],
      [0, 1, 1],
      [0, 0, 0],
    ];
    const r = floodFill(g, 0, 0, 2);
    expect(r).toEqual([
      [2, 2, 1],
      [2, 1, 1],
      [2, 2, 2],
    ]);
    expect(g[0][0]).toBe(0); // input untouched
  });

  it('returns the same grid for a no-op or out-of-range fill', () => {
    const g = [[1]];
    expect(floodFill(g, 0, 0, 1)).toBe(g);
    expect(floodFill(g, 5, 5, 2)).toBe(g);
  });
});
