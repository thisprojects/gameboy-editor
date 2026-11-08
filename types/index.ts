export type Tool = 'pencil' | 'line' | 'rubber' | 'bucket' | 'pan';

export interface Point {
  x: number;
  y: number;
}


export interface TilesetProject {
  version: 1;
  type: 'tileset';
  tilesWidth: number;
  tilesHeight: number;
  /** pixels[y][x] = shade index 0-3 */
  pixels: number[][];
}
