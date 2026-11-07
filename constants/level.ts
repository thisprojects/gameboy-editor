export const METATILE_SIZES = [2, 4]; // tiles per metatile edge (16 or 32 px)
export const MAX_METATILES = 256; // a metatile index is one byte
export const MAX_LEVEL_TILES = 256; // a level is at most 256x256 tiles
export const DEFAULT_LEVEL_SIZE = 16; // metatiles
export const DEFAULT_METATILE_ZOOM = 8; // screen px per tile pixel in the metatile editor
export const DEFAULT_LEVEL_ZOOM = 2; // screen px per tile pixel in the level editor

/** Largest level edge in metatiles for a given metatile size. */
export const maxLevelMetatiles = (size: number) => Math.floor(MAX_LEVEL_TILES / size);
