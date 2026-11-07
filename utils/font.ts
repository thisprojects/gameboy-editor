import { TILE_SIZE, BYTES_PER_TILE } from '@/constants';
import { GLYPH_COUNT, FIRST_CHAR } from '@/constants/font';
import { Tile } from '@/types/map';
import { createBlankTile, isValidTile, tilesFromPixels } from '@/utils/map';
import { decodeTileset, encodeTile } from '@/utils/encode';
import { STARTER_FONT } from '@/utils/starterFont';

export const createEmptyGlyphs = (): Tile[] => Array.from({ length: GLYPH_COUNT }, createBlankTile);

/** The built-in starter font: every set pixel becomes shade 3. */
export function starterGlyphs(): Tile[] {
  return Array.from({ length: GLYPH_COUNT }, (_, i) =>
    Array.from({ length: TILE_SIZE }, (_, y) => {
      const byte = STARTER_FONT[i * TILE_SIZE + y];
      return Array.from({ length: TILE_SIZE }, (_, x) => (byte & (0x80 >> x) ? 3 : 0));
    })
  );
}

export function isValidGlyphs(g: unknown): g is Tile[] {
  return Array.isArray(g) && g.length === GLYPH_COUNT && g.every(isValidTile);
}

/** 96 glyphs as raw 2bpp (16 bytes each). */
export function encodeGlyphs(glyphs: Tile[]): Uint8Array {
  return Uint8Array.from(glyphs.flatMap((g) => encodeTile(g, 0, 0)));
}

/** 96 glyphs as 1bpp (8 bytes each); shades 2 and 3 become set pixels. */
export function encodeGlyphs1bpp(glyphs: Tile[]): Uint8Array {
  return Uint8Array.from(
    glyphs.flatMap((g) =>
      g.map((row) => row.reduce((byte, shade, x) => byte | (shade >= 2 ? 0x80 >> x : 0), 0))
    )
  );
}

/** Decode 1..96 raw 2bpp glyphs (missing glyphs are blank). Returns null for an invalid size. */
export function decodeGlyphs(bytes: Uint8Array): Tile[] | null {
  if (bytes.length === 0 || bytes.length % BYTES_PER_TILE !== 0 || bytes.length / BYTES_PER_TILE > GLYPH_COUNT) return null;
  const decoded = decodeTileset(bytes, 16)!;
  const tiles = tilesFromPixels(decoded.pixels, decoded.tilesWidth, decoded.tilesHeight).slice(0, bytes.length / BYTES_PER_TILE);
  return [...tiles, ...createEmptyGlyphs().slice(tiles.length)];
}

/** Human-readable name for a glyph, safe to put in assembler and C line comments. */
export function glyphLabel(index: number): string {
  const code = FIRST_CHAR + index;
  if (code === 32) return 'SPACE';
  if (code === 92) return 'backslash';
  if (code === 127) return 'DEL';
  return String.fromCharCode(code);
}
