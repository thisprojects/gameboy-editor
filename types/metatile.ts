import { Tile } from '@/types/map';

export type MetatileTool = 'stamp' | 'fill' | 'pick' | 'rubber';

export interface Metatile {
  /** tiles[y][x] = tileset index, size x size */
  tiles: number[][];
  /** Collision flag for the level's collision table */
  solid: boolean;
}

export interface MetatileProject {
  version: 1;
  type: 'metatiles';
  /** Metatile edge length in tiles (2 or 4) */
  size: number;
  tiles: Tile[];
  metatiles: Metatile[];
}

export interface LevelProject {
  version: 1;
  type: 'level';
  size: number;
  tiles: Tile[];
  metatiles: Metatile[];
  /** map[y][x] = metatile index */
  map: number[][];
}
