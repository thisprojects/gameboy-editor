import { Metatile } from '@/types/metatile';
import { Tile } from '@/types/map';
import { METATILE_SIZES, MAX_METATILES, maxLevelMetatiles } from '@/constants/level';
import { createBlankTile, createSolidTile, isValidTileset } from '@/utils/map';
import { resizeGrid } from '@/utils/grid';

export function createMetatile(size: number, fill = 0, solid = false): Metatile {
  return { tiles: resizeGrid([], size, size, fill), solid };
}

/** A starter library: an empty metatile and a solid one. */
export function defaultLibrary(): { size: number; tiles: Tile[]; metatiles: Metatile[] } {
  return {
    size: 2,
    tiles: [createBlankTile(), createSolidTile(3)],
    metatiles: [createMetatile(2, 0), createMetatile(2, 1, true)],
  };
}

export const resizeMetatile = (m: Metatile, size: number): Metatile => ({
  ...m,
  tiles: resizeGrid(m.tiles, size, size, 0),
});

/** Replace tile references that no longer exist with tile 0. */
export function clampMetatiles(metatiles: Metatile[], tileCount: number): Metatile[] {
  return metatiles.map((m) => ({
    ...m,
    tiles: m.tiles.map((row) => row.map((t) => (t < tileCount ? t : 0))),
  }));
}

export function isValidLibrary(size: unknown, tiles: unknown, metatiles: unknown): boolean {
  if (typeof size !== 'number' || !METATILE_SIZES.includes(size) || !isValidTileset(tiles)) return false;
  if (!Array.isArray(metatiles) || metatiles.length < 1 || metatiles.length > MAX_METATILES) return false;
  return metatiles.every(
    (m) =>
      typeof m?.solid === 'boolean' &&
      Array.isArray(m.tiles) &&
      m.tiles.length === size &&
      m.tiles.every(
        (row: unknown) =>
          Array.isArray(row) && row.length === size && row.every((t) => Number.isInteger(t) && t >= 0 && t < tiles.length)
      )
  );
}

export function isValidLevelMap(map: unknown, size: number, metatileCount: number): map is number[][] {
  const max = maxLevelMetatiles(size);
  if (!Array.isArray(map) || map.length < 1 || map.length > max || !Array.isArray(map[0])) return false;
  const width = map[0].length;
  return (
    width >= 1 &&
    width <= max &&
    map.every((row) => Array.isArray(row) && row.length === width && row.every((t) => Number.isInteger(t) && t >= 0 && t < metatileCount))
  );
}

/** Metatile table: size*size tile indices per metatile, row-major. */
export const metatileBytes = (metatiles: Metatile[]): Uint8Array => Uint8Array.from(metatiles.flatMap((m) => m.tiles.flat()));

export const collisionBytes = (metatiles: Metatile[]): Uint8Array => Uint8Array.from(metatiles.map((m) => (m.solid ? 1 : 0)));

/** Highest tileset index referenced by the metatiles. */
export const maxTileIndex = (metatiles: Metatile[]): number =>
  metatiles.reduce((max, m) => Math.max(max, ...m.tiles.flat()), 0);

/** Expand a metatile map to a plain tile index map (width*size x height*size). */
export function expandMap(map: number[][], metatiles: Metatile[], size: number): number[][] {
  const out: number[][] = [];
  for (const row of map) {
    for (let ty = 0; ty < size; ty++) {
      out.push(row.flatMap((idx) => metatiles[idx].tiles[ty]));
    }
  }
  return out;
}

export const maxMetatileIndex = (map: number[][]): number => map.reduce((m, row) => Math.max(m, ...row), 0);
