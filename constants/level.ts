export const MAX_METATILE_EDGE = 16; // a metatile is any width x height from 1x1 up to 16x16 tiles
export const DEFAULT_METATILE_EDGE = 2;
export const MAX_METATILES = 256; // a metatile index is one byte
const MAX_LEVEL_TILES = 256; // a level is at most 256x256 tiles
export const DEFAULT_LEVEL_SIZE = 16; // metatiles
export const DEFAULT_METATILE_ZOOM = 8; // screen px per tile pixel in the metatile editor
export const DEFAULT_LEVEL_ZOOM = 2; // screen px per tile pixel in the level editor

/** Largest level extent in metatiles along one axis, for a metatile that is `edge` tiles long on that axis. */
export const maxLevelMetatiles = (edge: number) => Math.floor(MAX_LEVEL_TILES / edge);
