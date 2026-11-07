import { TILE_SIZE, BYTES_PER_TILE } from '@/constants';
import { createEmptyPixels } from '@/utils/drawing';

/**
 * Encode one 8x8 tile as 16 bytes of Game Boy 2bpp data.
 * Each row is two bytes: low bitplane then high bitplane; leftmost pixel is bit 7.
 */
export function encodeTile(pixels: number[][], tileX: number, tileY: number): number[] {
  const bytes: number[] = [];
  for (let row = 0; row < TILE_SIZE; row++) {
    let lo = 0;
    let hi = 0;
    for (let col = 0; col < TILE_SIZE; col++) {
      const shade = pixels[tileY * TILE_SIZE + row]?.[tileX * TILE_SIZE + col] ?? 0;
      const bit = 7 - col;
      lo |= (shade & 1) << bit;
      hi |= ((shade >> 1) & 1) << bit;
    }
    bytes.push(lo, hi);
  }
  return bytes;
}

/** True when every pixel of the tile is shade 0. */
export function isTileEmpty(pixels: number[][], tileX: number, tileY: number): boolean {
  return encodeTile(pixels, tileX, tileY).every((b) => b === 0);
}

/** Number of tiles (row-major) up to and including the last non-empty one. */
export function countUsedTiles(pixels: number[][], tilesWidth: number, tilesHeight: number): number {
  for (let i = tilesWidth * tilesHeight - 1; i >= 0; i--) {
    if (!isTileEmpty(pixels, i % tilesWidth, Math.floor(i / tilesWidth))) return i + 1;
  }
  return 0;
}

/** Encode the first `count` tiles in row-major order. */
export function encodeTileset(pixels: number[][], tilesWidth: number, count: number): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(...encodeTile(pixels, i % tilesWidth, Math.floor(i / tilesWidth)));
  }
  return Uint8Array.from(out);
}

export interface DecodedTileset {
  pixels: number[][];
  tilesWidth: number;
  tilesHeight: number;
}

/** Decode raw 2bpp data into a pixel grid laid out `tilesWidth` tiles wide. Returns null if the length is invalid. */
export function decodeTileset(bytes: Uint8Array, tilesWidth: number): DecodedTileset | null {
  if (bytes.length === 0 || bytes.length % BYTES_PER_TILE !== 0 || tilesWidth < 1) return null;
  const count = bytes.length / BYTES_PER_TILE;
  const width = Math.min(tilesWidth, count);
  const height = Math.ceil(count / width);
  const pixels = createEmptyPixels(width * TILE_SIZE, height * TILE_SIZE);
  for (let i = 0; i < count; i++) {
    const tx = i % width;
    const ty = Math.floor(i / width);
    for (let row = 0; row < TILE_SIZE; row++) {
      const lo = bytes[i * BYTES_PER_TILE + row * 2];
      const hi = bytes[i * BYTES_PER_TILE + row * 2 + 1];
      for (let col = 0; col < TILE_SIZE; col++) {
        const bit = 7 - col;
        pixels[ty * TILE_SIZE + row][tx * TILE_SIZE + col] = ((lo >> bit) & 1) | (((hi >> bit) & 1) << 1);
      }
    }
  }
  return { pixels, tilesWidth: width, tilesHeight: height };
}
