import {
  createEmptyGlyphs, starterGlyphs, isValidGlyphs, encodeGlyphs, encodeGlyphs1bpp, decodeGlyphs, glyphLabel,
} from '@/utils/font';
import { exportFontRGBDS, exportFontC } from '@/utils/fontExport';
import { STARTER_FONT } from '@/utils/starterFont';

describe('font utils', () => {
  it('has 96 starter glyphs of 8 bytes each', () => {
    expect(STARTER_FONT).toHaveLength(96 * 8);
    expect(starterGlyphs()).toHaveLength(96);
    expect(createEmptyGlyphs().every((g) => g.flat().every((v) => v === 0))).toBe(true);
  });

  it('converts starter bytes to shade 3 pixels, MSB leftmost', () => {
    const g = starterGlyphs();
    expect(g[0].flat().every((v) => v === 0)).toBe(true); // space
    // '!' (index 1): rows 1-4 have bit 0x10 -> x = 3
    expect(g[1][1][3]).toBe(3);
    expect(g[1][1][2]).toBe(0);
    expect(g[1][0].every((v) => v === 0)).toBe(true);
    expect(g.flat(2).every((v) => v === 0 || v === 3)).toBe(true);
  });

  it('validates glyph sets', () => {
    expect(isValidGlyphs(starterGlyphs())).toBe(true);
    expect(isValidGlyphs(starterGlyphs().slice(1))).toBe(false);
    expect(isValidGlyphs('x')).toBe(false);
    const bad = starterGlyphs();
    bad[5][0][0] = 9;
    expect(isValidGlyphs(bad)).toBe(false);
  });

  it('encodes 2bpp (1536 bytes) and 1bpp (768 bytes)', () => {
    const g = createEmptyGlyphs();
    g[0][0][0] = 3;
    g[0][0][1] = 2;
    g[0][0][2] = 1; // shade 1 is not set in 1bpp
    const bpp2 = encodeGlyphs(g);
    expect(bpp2).toHaveLength(1536);
    expect(Array.from(bpp2.slice(0, 2))).toEqual([0x80 | 0x20, 0x80 | 0x40]);
    const bpp1 = encodeGlyphs1bpp(g);
    expect(bpp1).toHaveLength(768);
    expect(bpp1[0]).toBe(0xc0);
  });

  it('round-trips 2bpp decode, padding short fonts with blank glyphs', () => {
    const g = starterGlyphs();
    expect(decodeGlyphs(encodeGlyphs(g))).toEqual(g);
    const short = decodeGlyphs(encodeGlyphs(g).slice(0, 16 * 3))!;
    expect(short).toHaveLength(96);
    expect(short[2]).toEqual(g[2]);
    expect(short[3].flat().every((v) => v === 0)).toBe(true);
  });

  it('rejects invalid 2bpp sizes', () => {
    expect(decodeGlyphs(new Uint8Array(0))).toBeNull();
    expect(decodeGlyphs(new Uint8Array(17))).toBeNull();
    expect(decodeGlyphs(new Uint8Array(16 * 97))).toBeNull();
  });

  it('labels glyphs safely for comments', () => {
    expect(glyphLabel(0)).toBe('SPACE');
    expect(glyphLabel(33)).toBe('A');
    expect(glyphLabel(92 - 32)).toBe('backslash');
    expect(glyphLabel(95)).toBe('DEL');
  });
});

describe('font export', () => {
  const data = encodeGlyphs(starterGlyphs());

  it('writes RGBDS with all 96 glyphs', () => {
    const out = exportFontRGBDS('my font', data);
    expect(out).toContain('DEF MY_FONT_FIRST_CHAR EQU 32');
    expect(out).toContain('DEF MY_FONT_GLYPH_COUNT EQU 96');
    expect(out).toContain('my_font_font::');
    expect(out).toContain('my_font_font_end::');
    expect(out.match(/^\s+db /gm)).toHaveLength(96);
    expect(out).toContain('; $20 SPACE');
    expect(out).toContain('; $41 A');
    expect(out).toContain('; $5C backslash');
    expect(out).toContain('; $7F DEL');
  });

  it('writes C without a trailing comma on the last glyph', () => {
    const out = exportFontC('f', data);
    expect(out).toContain('#define F_GLYPH_COUNT 96');
    expect(out).toContain('const unsigned char f_font[] = {');
    expect(out).toMatch(/\/\/ 0x7E ~\n/);
    expect(out).toMatch(/[0-9A-F]{2} \/\/ 0x7F DEL\n};/); // no comma after the last row
    expect(out).not.toMatch(/\\\s*\n/); // no line-continuation hazards in comments
  });
});
