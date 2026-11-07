import { Point } from '@/types';

/** Bresenham's line algorithm. */
export function getLinePoints(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

/** Create a pixel grid filled with shade 0. */
export function createEmptyPixels(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array<number>(width).fill(0));
}

/** 4-way flood fill of the contiguous region sharing the start pixel's shade. Returns a new grid. */
export function floodFill(pixels: number[][], x: number, y: number, shade: number): number[][] {
  const target = pixels[y]?.[x];
  if (target === undefined || target === shade) return pixels;
  const result = pixels.map((row) => [...row]);
  const stack: Point[] = [{ x, y }];
  while (stack.length) {
    const p = stack.pop()!;
    if (result[p.y]?.[p.x] !== target) continue;
    result[p.y][p.x] = shade;
    stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
  }
  return result;
}
