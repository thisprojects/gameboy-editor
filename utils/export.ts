import { BYTES_PER_TILE } from '@/constants';

/** Turn a file name into a valid assembler/C identifier. */
export function toIdentifier(name: string): string {
  const id = name.trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!id) return 'tiles';
  return /^[0-9]/.test(id) ? `_${id}` : id;
}

const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');

/** RGBDS assembly: one `db` line per tile (16 bytes). */
export function exportTilesRGBDS(name: string, data: Uint8Array): string {
  const id = toIdentifier(name);
  const count = data.length / BYTES_PER_TILE;
  const lines = [
    `; ${id} - ${count} tile(s), Game Boy 2bpp`,
    `; Copy to VRAM with e.g. a memcpy to $8000 (sprites/BG) or $9000 (BG signed)`,
    ``,
    `DEF ${id.toUpperCase()}_TILE_COUNT EQU ${count}`,
    ``,
    `SECTION "${id}_tiles", ROM0`,
    ``,
    `${id}_tiles::`,
  ];
  for (let t = 0; t < count; t++) {
    const row = Array.from(data.slice(t * BYTES_PER_TILE, (t + 1) * BYTES_PER_TILE), (b) => `$${hex(b)}`);
    lines.push(`    db ${row.join(', ')} ; tile ${t}`);
  }
  lines.push(`${id}_tiles_end::`, ``);
  return lines.join('\n');
}

/** GBDK-2020 C header with a const array and tile count. */
export function exportTilesC(name: string, data: Uint8Array): string {
  const id = toIdentifier(name);
  const count = data.length / BYTES_PER_TILE;
  const lines = [
    `// ${id} - ${count} tile(s), Game Boy 2bpp`,
    `// Usage: set_bkg_data(0, ${id.toUpperCase()}_TILE_COUNT, ${id}_tiles);  // or set_sprite_data`,
    `#ifndef ${id.toUpperCase()}_H`,
    `#define ${id.toUpperCase()}_H`,
    ``,
    `#define ${id.toUpperCase()}_TILE_COUNT ${count}`,
    ``,
    `const unsigned char ${id}_tiles[] = {`,
  ];
  for (let t = 0; t < count; t++) {
    const row = Array.from(data.slice(t * BYTES_PER_TILE, (t + 1) * BYTES_PER_TILE), (b) => `0x${hex(b)}`);
    lines.push(`    ${row.join(',')}${t < count - 1 ? ',' : ''} // tile ${t}`);
  }
  lines.push(`};`, ``, `#endif`, ``);
  return lines.join('\n');
}
