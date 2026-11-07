import { Point } from '@/types';

/** Fill the inclusive rectangle between two cells (any corner order). Returns a new grid. */
export function fillRectGrid(grid: number[][], a: Point, b: Point, value: number): number[][] {
  const next = grid.map((row) => [...row]);
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
      if (next[y]?.[x] !== undefined) next[y][x] = value;
    }
  }
  return next;
}

/** Resize a grid, keeping content from the top-left and filling new cells with `fill`. */
export function resizeGrid(grid: number[][], width: number, height: number, fill = 0): number[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => grid[y]?.[x] ?? fill)
  );
}
