import { BYTES_PER_TILE } from '@/constants';
import { GLYPH_COUNT, FIRST_CHAR } from '@/constants/font';
import { toIdentifier } from '@/utils/export';
import { glyphLabel } from '@/utils/font';

const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');

/** RGBDS: 96 glyph tiles, one `db` line each, commented with the ASCII code and character. */
export function exportFontRGBDS(name: string, data: Uint8Array): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const lines = [
    `; ${id} - ${GLYPH_COUNT} glyph font (ASCII ${FIRST_CHAR}-${FIRST_CHAR + GLYPH_COUNT - 1}), Game Boy 2bpp`,
    `; Load to VRAM, then print character c as tile (c - ${up}_FIRST_CHAR) + first font tile index.`,
    ``,
    `DEF ${up}_FIRST_CHAR EQU ${FIRST_CHAR}`,
    `DEF ${up}_GLYPH_COUNT EQU ${GLYPH_COUNT}`,
    ``,
    `SECTION "${id}_font", ROM0`,
    ``,
    `${id}_font::`,
  ];
  for (let g = 0; g < GLYPH_COUNT; g++) {
    const row = Array.from(data.slice(g * BYTES_PER_TILE, (g + 1) * BYTES_PER_TILE), (b) => `$${hex(b)}`).join(', ');
    lines.push(`    db ${row} ; $${hex(FIRST_CHAR + g)} ${glyphLabel(g)}`);
  }
  lines.push(`${id}_font_end::`, ``);
  return lines.join('\n');
}

/** GBDK-2020 header: a const array for `set_bkg_data` / `set_sprite_data`. */
export function exportFontC(name: string, data: Uint8Array): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const lines = [
    `// ${id} - ${GLYPH_COUNT} glyph font (ASCII ${FIRST_CHAR}-${FIRST_CHAR + GLYPH_COUNT - 1}), Game Boy 2bpp`,
    `// Usage: set_bkg_data(first_tile, ${up}_GLYPH_COUNT, ${id}_font);`,
    `//        character c is tile (c - ${up}_FIRST_CHAR) + first_tile`,
    `#ifndef ${up}_H`,
    `#define ${up}_H`,
    ``,
    `#define ${up}_FIRST_CHAR ${FIRST_CHAR}`,
    `#define ${up}_GLYPH_COUNT ${GLYPH_COUNT}`,
    ``,
    `const unsigned char ${id}_font[] = {`,
  ];
  for (let g = 0; g < GLYPH_COUNT; g++) {
    const row = Array.from(data.slice(g * BYTES_PER_TILE, (g + 1) * BYTES_PER_TILE), (b) => `0x${hex(b)}`).join(',');
    lines.push(`    ${row}${g < GLYPH_COUNT - 1 ? ',' : ''} // 0x${hex(FIRST_CHAR + g)} ${glyphLabel(g)}`);
  }
  lines.push(`};`, ``, `#endif`, ``);
  return lines.join('\n');
}
