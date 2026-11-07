export type Tool = 'pencil' | 'line' | 'rubber' | 'bucket' | 'pan';

export interface Point {
  x: number;
  y: number;
}

/** Shade index 0 (lightest) .. 3 (darkest). */
export type Shade = 0 | 1 | 2 | 3;

export interface TilesetProject {
  version: 1;
  type: 'tileset';
  tilesWidth: number;
  tilesHeight: number;
  /** pixels[y][x] = shade index 0-3 */
  pixels: number[][];
}
