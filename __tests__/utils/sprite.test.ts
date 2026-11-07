import { layoutFrame, layoutSprite, oamAttr } from '@/utils/sprite';
import { exportSpriteRGBDS, exportSpriteC } from '@/utils/spriteExport';
import { createEmptyPixels } from '@/utils/drawing';
import { applyPaletteRegister, OBP_PRESETS } from '@/constants/sprite';
import { PALETTE_PRESETS } from '@/constants';

describe('sprite layout', () => {
  it('8x8: one entry per non-empty tile, skipping empty ones', () => {
    const px = createEmptyPixels(16, 16); // 2x2 tiles
    px[0][0] = 3; // tile (0,0)
    px[8][8] = 1; // tile (1,1)
    const l = layoutFrame(px, 2, 2, '8x8');
    expect(l.entries).toEqual([
      { dx: 0, dy: 0, tile: 0 },
      { dx: 8, dy: 8, tile: 1 },
    ]);
    expect(l.data).toHaveLength(32);
  });

  it('8x16: entries cover tile pairs with consecutive tiles', () => {
    const px = createEmptyPixels(16, 16);
    px[12][9] = 2; // bottom half of column 1 only
    const l = layoutFrame(px, 2, 2, '8x16');
    expect(l.entries).toEqual([{ dx: 8, dy: 0, tile: 0 }]);
    expect(l.data).toHaveLength(32); // both tiles of the pair
    expect(l.data.slice(0, 16).every((b) => b === 0)).toBe(true); // top tile empty
    expect(l.data.slice(16).some((b) => b !== 0)).toBe(true);
  });

  it('8x16 stacks multiple cells vertically', () => {
    const px = createEmptyPixels(8, 32);
    px[0][0] = 1;
    px[16][0] = 1;
    const l = layoutFrame(px, 1, 4, '8x16');
    expect(l.entries.map((e) => [e.dy, e.tile])).toEqual([[0, 0], [16, 2]]);
  });

  it('combines frames with base tile offsets', () => {
    const a = createEmptyPixels(8, 8);
    a[0][0] = 3;
    const b = createEmptyPixels(8, 8);
    const c = createEmptyPixels(8, 8);
    c[1][1] = 2;
    const l = layoutSprite([{ pixels: a }, { pixels: b }, { pixels: c }], 1, 1, '8x8');
    expect(l.baseTiles).toEqual([0, 1, 1]);
    expect(l.tileCount).toBe(2);
    expect(l.data).toHaveLength(32);
    expect(l.frames[1].entries).toEqual([]);
  });

  it('builds the OAM attribute byte', () => {
    expect(oamAttr(0, false)).toBe(0);
    expect(oamAttr(1, false)).toBe(0x10);
    expect(oamAttr(0, true)).toBe(0x80);
    expect(oamAttr(1, true)).toBe(0x90);
  });

  it('remaps colours through a palette register', () => {
    const p = PALETTE_PRESETS[1];
    expect(applyPaletteRegister(p, OBP_PRESETS[0].value).colours).toEqual(p.colours);
    expect(applyPaletteRegister(p, OBP_PRESETS[1].value).colours).toEqual([...p.colours].reverse());
  });
});

describe('sprite export', () => {
  const a = createEmptyPixels(8, 8);
  a[0][0] = 3;
  const c = createEmptyPixels(8, 8);
  c[0][7] = 1;
  const layout = layoutSprite([{ pixels: a }, { pixels: c }], 1, 1, '8x8');
  const input = { layout, durations: [6, 12], palette: 1 as const, priority: true };

  it('writes RGBDS with frame table, durations and OAM lists', () => {
    const out = exportSpriteRGBDS('hero', input);
    expect(out).toContain('DEF HERO_FRAME_COUNT EQU 2');
    expect(out).toContain('DEF HERO_TILE_COUNT EQU 2');
    expect(out).toContain('hero_tiles::');
    expect(out).toContain('db $80, $80'); // tile 0 first row
    expect(out).toContain('dw hero_frame0');
    expect(out).toContain('db 6, 12');
    expect(out).toContain('hero_frame1:\n    db 1\n    db 0, 0, 1, $90');
  });

  it('writes C arrays', () => {
    const out = exportSpriteC('hero', input);
    expect(out).toContain('#define HERO_FRAME_COUNT 2');
    expect(out).toContain('const unsigned char hero_frame0[] = { 1, 0, 0, 0, 0x90 };');
    expect(out).toContain('const unsigned char hero_frame1[] = { 1, 0, 0, 1, 0x90 };');
    expect(out).toContain('hero_frames[] = { hero_frame0, hero_frame1 }');
    expect(out).toContain('hero_durations[] = { 6, 12 }');
    expect(out).toMatch(/0x00 \/\/ tile 1/); // last tile row has no trailing comma
  });
});
