import { encodeTile, isTileEmpty, countUsedTiles, encodeTileset, decodeTileset } from '@/utils/encode';
import { createEmptyPixels } from '@/utils/drawing';

describe('2bpp encoding', () => {
  it('encodes a row with known bit patterns', () => {
    const px = createEmptyPixels(8, 8);
    // row 0: shades 0,1,2,3,0,1,2,3
    [0, 1, 2, 3, 0, 1, 2, 3].forEach((v, i) => (px[0][i] = v));
    const bytes = encodeTile(px, 0, 0);
    expect(bytes).toHaveLength(16);
    // low plane: shades 1,3 -> bits at x=1,3,5,7 -> 0b01010101
    expect(bytes[0]).toBe(0x55);
    // high plane: shades 2,3 -> bits at x=2,3,6,7 -> 0b00110011
    expect(bytes[1]).toBe(0x33);
    expect(bytes.slice(2).every((b) => b === 0)).toBe(true);
  });

  it('leftmost pixel is bit 7', () => {
    const px = createEmptyPixels(8, 8);
    px[0][0] = 3;
    expect(encodeTile(px, 0, 0).slice(0, 2)).toEqual([0x80, 0x80]);
  });

  it('detects empty tiles and counts used tiles', () => {
    const px = createEmptyPixels(16, 16); // 2x2 tiles
    expect(isTileEmpty(px, 0, 0)).toBe(true);
    expect(countUsedTiles(px, 2, 2)).toBe(0);
    px[9][9] = 1; // tile (1,1) => index 3
    expect(isTileEmpty(px, 1, 1)).toBe(false);
    expect(countUsedTiles(px, 2, 2)).toBe(4);
    px[9][9] = 0;
    px[0][8] = 2; // tile (1,0) => index 1
    expect(countUsedTiles(px, 2, 2)).toBe(2);
  });

  it('encodes tiles in row-major order', () => {
    const px = createEmptyPixels(16, 8);
    px[0][8] = 3; // second tile
    const data = encodeTileset(px, 2, 2);
    expect(data).toHaveLength(32);
    expect(data[0]).toBe(0);
    expect(data[16]).toBe(0x80);
  });

  it('round-trips encode/decode', () => {
    const px = createEmptyPixels(24, 16); // 3x2 tiles
    for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) px[y][x] = (x * 3 + y) % 4;
    const data = encodeTileset(px, 3, 6);
    const decoded = decodeTileset(data, 3)!;
    expect(decoded.tilesWidth).toBe(3);
    expect(decoded.tilesHeight).toBe(2);
    expect(decoded.pixels).toEqual(px);
  });

  it('clamps width to the tile count and rounds height up', () => {
    const d = decodeTileset(new Uint8Array(16 * 3), 16)!;
    expect(d.tilesWidth).toBe(3);
    expect(d.tilesHeight).toBe(1);
    const d2 = decodeTileset(new Uint8Array(16 * 5), 2)!;
    expect(d2.tilesHeight).toBe(3);
  });

  it('rejects invalid lengths', () => {
    expect(decodeTileset(new Uint8Array(0), 16)).toBeNull();
    expect(decodeTileset(new Uint8Array(15), 16)).toBeNull();
    expect(decodeTileset(new Uint8Array(16), 0)).toBeNull();
  });
});
