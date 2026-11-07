export type MapTool = 'stamp' | 'rect' | 'fill' | 'pick' | 'rubber' | 'pan';

/** One 8x8 tile: tile[y][x] = colour index 0-3. */
export type Tile = number[][];

export interface MapProject {
  version: 1;
  type: 'map';
  /** map[y][x] = tile index, 32x32 */
  map: number[][];
  tiles: Tile[];
}
