import { Metatile } from '@/types/metatile';
import { Tile } from '@/types/map';
import { MAX_METATILES, MAX_METATILE_EDGE, DEFAULT_METATILE_EDGE, maxLevelMetatiles } from '@/constants/level';
import { createBlankTile, createSolidTile, isValidTileset } from '@/utils/map';
import { resizeGrid } from '@/utils/grid';

/** Metatile dimensions in tiles. */
export interface MetaDims {
  mw: number;
  mh: number;
}

export const isValidEdge = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_METATILE_EDGE;

/** Read the dimensions from a project file: `size` (square) or `metatileWidth` + `metatileHeight`. Null if invalid. */
export function readDims(d: { size?: unknown; metatileWidth?: unknown; metatileHeight?: unknown } | null | undefined): MetaDims | null {
  if (!d) return null;
  if (d.metatileWidth !== undefined || d.metatileHeight !== undefined) {
    return isValidEdge(d.metatileWidth) && isValidEdge(d.metatileHeight) ? { mw: d.metatileWidth, mh: d.metatileHeight } : null;
  }
  return isValidEdge(d.size) ? { mw: d.size, mh: d.size } : null;
}

/** The project-file fields for these dimensions (`size` when square, so square files look as they always did). */
export const dimsFields = ({ mw, mh }: MetaDims): { size: number } | { metatileWidth: number; metatileHeight: number } =>
  mw === mh ? { size: mw } : { metatileWidth: mw, metatileHeight: mh };

export function createMetatile(mw: number, mh: number, fill = 0, solid = false): Metatile {
  return { tiles: resizeGrid([], mw, mh, fill), solid };
}

/** A starter library: an empty metatile and a solid one. */
export function defaultLibrary(): MetaDims & { tiles: Tile[]; metatiles: Metatile[] } {
  const e = DEFAULT_METATILE_EDGE;
  return {
    mw: e,
    mh: e,
    tiles: [createBlankTile(), createSolidTile(3)],
    metatiles: [createMetatile(e, e, 0), createMetatile(e, e, 1, true)],
  };
}

export const resizeMetatile = (m: Metatile, mw: number, mh: number): Metatile => ({
  ...m,
  tiles: resizeGrid(m.tiles, mw, mh, 0),
});

/** Replace tile references that no longer exist with tile 0. */
export function clampMetatiles(metatiles: Metatile[], tileCount: number): Metatile[] {
  return metatiles.map((m) => ({
    ...m,
    tiles: m.tiles.map((row) => row.map((t) => (t < tileCount ? t : 0))),
  }));
}

export function isValidLibrary(dims: MetaDims | null, tiles: unknown, metatiles: unknown): boolean {
  if (!dims || !isValidTileset(tiles)) return false;
  const { mw, mh } = dims;
  if (!Array.isArray(metatiles) || metatiles.length < 1 || metatiles.length > MAX_METATILES) return false;
  return metatiles.every(
    (m) =>
      typeof m?.solid === 'boolean' &&
      Array.isArray(m.tiles) &&
      m.tiles.length === mh &&
      m.tiles.every(
        (row: unknown) =>
          Array.isArray(row) && row.length === mw && row.every((t) => Number.isInteger(t) && t >= 0 && t < tiles.length)
      )
  );
}

export function isValidLevelMap(map: unknown, { mw, mh }: MetaDims, metatileCount: number): map is number[][] {
  const maxW = maxLevelMetatiles(mw);
  const maxH = maxLevelMetatiles(mh);
  if (!Array.isArray(map) || map.length < 1 || map.length > maxH || !Array.isArray(map[0])) return false;
  const width = map[0].length;
  return (
    width >= 1 &&
    width <= maxW &&
    map.every((row) => Array.isArray(row) && row.length === width && row.every((t) => Number.isInteger(t) && t >= 0 && t < metatileCount))
  );
}

/** Metatile table: width*height tile indices per metatile, row-major. */
export const metatileBytes = (metatiles: Metatile[]): Uint8Array => Uint8Array.from(metatiles.flatMap((m) => m.tiles.flat()));

export const collisionBytes = (metatiles: Metatile[]): Uint8Array => Uint8Array.from(metatiles.map((m) => (m.solid ? 1 : 0)));

/** Highest tileset index referenced by the metatiles. */
export const maxTileIndex = (metatiles: Metatile[]): number =>
  metatiles.reduce((max, m) => Math.max(max, ...m.tiles.flat()), 0);

/** Expand a metatile map to a plain tile index map (level width * metatile width x level height * metatile height). */
export function expandMap(map: number[][], metatiles: Metatile[], mh: number): number[][] {
  const out: number[][] = [];
  for (const row of map) {
    for (let ty = 0; ty < mh; ty++) {
      out.push(row.flatMap((idx) => metatiles[idx].tiles[ty]));
    }
  }
  return out;
}

export const maxMetatileIndex = (map: number[][]): number => map.reduce((m, row) => Math.max(m, ...row), 0);
