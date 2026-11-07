import { BYTES_PER_TILE } from '@/constants';
import { SpriteLayout, oamAttr } from '@/utils/sprite';
import { toIdentifier } from '@/utils/export';

export interface SpriteExportInput {
  layout: SpriteLayout;
  /** Per-frame durations in 1/60 s ticks */
  durations: number[];
  palette: 0 | 1;
  priority: boolean;
}

const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');
const chunk = (data: Uint8Array, t: number) => data.slice(t * BYTES_PER_TILE, (t + 1) * BYTES_PER_TILE);

/** RGBDS: tile data, per-frame OAM lists (count, then dy,dx,tile,attr per entry), frame table and durations. */
export function exportSpriteRGBDS(name: string, { layout, durations, palette, priority }: SpriteExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const n = layout.frames.length;
  const attr = `$${hex(oamAttr(palette, priority))}`;
  const lines = [
    `; ${id} - ${n} frame(s), ${layout.tileCount} tile(s)`,
    `; Each frame: db entry_count, then per entry: db y_offset, x_offset, tile, attr`,
    `; Add 16 to Y and 8 to X (plus your position) when writing to OAM. Tile indices are relative to`,
    `; the first tile you load. Flip flags can be OR-ed into attr at runtime. Durations are in 1/60 s ticks.`,
    ``,
    `DEF ${up}_FRAME_COUNT EQU ${n}`,
    `DEF ${up}_TILE_COUNT EQU ${layout.tileCount}`,
    ``,
    `SECTION "${id}_sprite", ROM0`,
    ``,
    `${id}_tiles::`,
  ];
  for (let t = 0; t < layout.tileCount; t++) {
    lines.push(`    db ${Array.from(chunk(layout.data, t), (b) => `$${hex(b)}`).join(', ')} ; tile ${t}`);
  }
  lines.push(`${id}_tiles_end::`, ``, `${id}_frames::`);
  for (let f = 0; f < n; f++) lines.push(`    dw ${id}_frame${f}`);
  lines.push(``, `${id}_durations::`, `    db ${durations.join(', ')}`, ``);
  layout.frames.forEach((fl, f) => {
    lines.push(`${id}_frame${f}:`, `    db ${fl.entries.length}`);
    for (const e of fl.entries) lines.push(`    db ${e.dy}, ${e.dx}, ${e.tile + layout.baseTiles[f]}, ${attr}`);
  });
  lines.push(``);
  return lines.join('\n');
}

/** GBDK-2020 header equivalent of exportSpriteRGBDS. */
export function exportSpriteC(name: string, { layout, durations, palette, priority }: SpriteExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const n = layout.frames.length;
  const attr = `0x${hex(oamAttr(palette, priority))}`;
  const lines = [
    `// ${id} - ${n} frame(s), ${layout.tileCount} tile(s)`,
    `// Usage: set_sprite_data(0, ${up}_TILE_COUNT, ${id}_tiles);`,
    `// Each frame array: { entry_count, then per entry: y_offset, x_offset, tile, attr }`,
    `// Durations are in 1/60 s ticks.`,
    `#ifndef ${up}_H`,
    `#define ${up}_H`,
    ``,
    `#define ${up}_FRAME_COUNT ${n}`,
    `#define ${up}_TILE_COUNT ${layout.tileCount}`,
    ``,
    `const unsigned char ${id}_tiles[] = {`,
  ];
  for (let t = 0; t < layout.tileCount; t++) {
    const row = Array.from(chunk(layout.data, t), (b) => `0x${hex(b)}`).join(',');
    lines.push(`    ${row}${t < layout.tileCount - 1 ? ',' : ''} // tile ${t}`);
  }
  lines.push(`};`, ``);
  layout.frames.forEach((fl, f) => {
    const vals = [String(fl.entries.length)];
    for (const e of fl.entries) vals.push(String(e.dy), String(e.dx), String(e.tile + layout.baseTiles[f]), attr);
    lines.push(`const unsigned char ${id}_frame${f}[] = { ${vals.join(', ')} };`);
  });
  lines.push(``, `const unsigned char * const ${id}_frames[] = { ${layout.frames.map((_, f) => `${id}_frame${f}`).join(', ')} };`);
  lines.push(`const unsigned char ${id}_durations[] = { ${durations.join(', ')} };`, ``, `#endif`, ``);
  return lines.join('\n');
}
