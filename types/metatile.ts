import { Tile } from '@/types/map';

export type MetatileTool = 'stamp' | 'fill' | 'pick' | 'rubber';

export interface Metatile {
  /** tiles[y][x] = tileset index, metatile height x width */
  tiles: number[][];
  /** Collision flag for the level's collision table */
  solid: boolean;
}

export interface MetatileProject {
  version: 1;
  type: 'metatiles';
  /**
   * Metatile dimensions in tiles. A square library (2x2, 4x4...) stores just `size`, as older files did;
   * any other shape stores `metatileWidth` and `metatileHeight`. Read both with `readDims`.
   */
  size?: number;
  metatileWidth?: number;
  metatileHeight?: number;
  tiles: Tile[];
  metatiles: Metatile[];
}

export interface LevelProject {
  version: 1;
  type: 'level';
  /** Metatile dimensions, stored as in MetatileProject */
  size?: number;
  metatileWidth?: number;
  metatileHeight?: number;
  tiles: Tile[];
  metatiles: Metatile[];
  /** map[y][x] = metatile index */
  map: number[][];
}
