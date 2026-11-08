import { TILE_SIZE } from '@/constants';
import { MAP_SIZE, MAX_MAP_TILES, ExportArea } from '@/constants/map';
import { Tile } from '@/types/map';
import { createEmptyPixels } from '@/utils/drawing';
import { encodeTile } from '@/utils/encode';

export const createEmptyMap = (): number[][] => createEmptyPixels(MAP_SIZE, MAP_SIZE);

export const createBlankTile = (): Tile => createEmptyPixels(TILE_SIZE, TILE_SIZE);

export function createSolidTile(shade: number): Tile {
  return createBlankTile().map((row) => row.map(() => shade));
}

/** Split a pixel grid (tilesWidth x tilesHeight tiles, row-major) into tiles. */
export function tilesFromPixels(pixels: number[][], tilesWidth: number, tilesHeight: number): Tile[] {
  const tiles: Tile[] = [];
  for (let ty = 0; ty < tilesHeight; ty++) {
    for (let tx = 0; tx < tilesWidth; tx++) {
      tiles.push(
        Array.from({ length: TILE_SIZE }, (_, y) =>
          Array.from({ length: TILE_SIZE }, (_, x) => pixels[ty * TILE_SIZE + y]?.[tx * TILE_SIZE + x] ?? 0)
        )
      );
    }
  }
  return tiles;
}

/** Drop trailing blank tiles (keeping at least one). */
export function trimTiles(tiles: Tile[]): Tile[] {
  let n = tiles.length;
  while (n > 1 && encodeTile(tiles[n - 1], 0, 0).every((b) => b === 0)) n--;
  return tiles.slice(0, n);
}

/** Encode tiles as raw 2bpp. */
export function encodeTiles(tiles: Tile[]): Uint8Array {
  return Uint8Array.from(tiles.flatMap((t) => encodeTile(t, 0, 0)));
}

export function isValidTile(t: unknown): t is Tile {
  return (
    Array.isArray(t) &&
    t.length === TILE_SIZE &&
    t.every((row) => Array.isArray(row) && row.length === TILE_SIZE && row.every((v) => Number.isInteger(v) && v >= 0 && v <= 3))
  );
}

export function isValidTileset(tiles: unknown): tiles is Tile[] {
  return Array.isArray(tiles) && tiles.length >= 1 && tiles.length <= MAX_MAP_TILES && tiles.every(isValidTile);
}

/** Replace any map entry that no longer has a tile with tile 0. */
export function clampMap(map: number[][], tileCount: number): number[][] {
  return map.map((row) => row.map((t) => (t < tileCount ? t : 0)));
}

/** Highest tile index used by the map. */
export function maxUsedIndex(map: number[][]): number {
  return map.reduce((m, row) => Math.max(m, ...row), 0);
}

/** Crop the map for export. `used` is the box around every cell that is not tile 0 (tile 0 counts as empty). `viewport` is the 20x18 screen at (scx, scy) tiles, wrapping like the hardware. */
export function cropMap(map: number[][], area: ExportArea, scx = 0, scy = 0, screenW = 20, screenH = 18): number[][] {
  if (area === 'full') return map.map((r) => [...r]);
  if (area === 'viewport') {
    return Array.from({ length: screenH }, (_, y) =>
      Array.from({ length: screenW }, (_, x) => map[(scy + y) % MAP_SIZE][(scx + x) % MAP_SIZE])
    );
  }
  let minX = MAP_SIZE, minY = MAP_SIZE, maxX = -1, maxY = -1;
  map.forEach((row, y) =>
    row.forEach((t, x) => {
      if (t !== 0) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    })
  );
  if (maxX < 0) return map.map((r) => [...r]); // nothing but tile 0: there is no box to crop to, so export it all
  return map.slice(minY, maxY + 1).map((row) => row.slice(minX, maxX + 1));
}

export const mapBytes = (map: number[][]): Uint8Array => Uint8Array.from(map.flat());

