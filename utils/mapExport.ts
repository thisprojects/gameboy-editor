import { BYTES_PER_TILE } from '@/constants';
import { toIdentifier } from '@/utils/export';

export interface MapExportInput {
  /** Cropped map, map[y][x] = tile index */
  map: number[][];
  /** Raw 2bpp data for tiles 0..tileCount-1 */
  tileData: Uint8Array;
}

const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');
const tileRow = (data: Uint8Array, t: number) => data.slice(t * BYTES_PER_TILE, (t + 1) * BYTES_PER_TILE);

/** RGBDS: tile data followed by the map, one `db` line per map row. */
export function exportMapRGBDS(name: string, { map, tileData }: MapExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const count = tileData.length / BYTES_PER_TILE;
  const lines = [
    `; ${id} - ${map[0].length}x${map.length} tile map, ${count} tile(s)`,
    `; Load tiles to VRAM at $8000 (LCDC bit 4 = 1), copy the map rows to the BG map at $9800.`,
    ``,
    `DEF ${up}_TILE_COUNT EQU ${count}`,
    `DEF ${up}_MAP_WIDTH EQU ${map[0].length}`,
    `DEF ${up}_MAP_HEIGHT EQU ${map.length}`,
    ``,
    `SECTION "${id}_map", ROM0`,
    ``,
    `${id}_tiles::`,
  ];
  for (let t = 0; t < count; t++) {
    lines.push(`    db ${Array.from(tileRow(tileData, t), (b) => `$${hex(b)}`).join(', ')} ; tile ${t}`);
  }
  lines.push(`${id}_tiles_end::`, ``, `${id}_map::`);
  map.forEach((row, y) => lines.push(`    db ${row.map((t) => `$${hex(t)}`).join(', ')} ; row ${y}`));
  lines.push(`${id}_map_end::`, ``);
  return lines.join('\n');
}

/** GBDK-2020 header: `set_bkg_data` tiles array and `set_bkg_tiles` map array. */
export function exportMapC(name: string, { map, tileData }: MapExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const count = tileData.length / BYTES_PER_TILE;
  const w = map[0].length;
  const h = map.length;
  const lines = [
    `// ${id} - ${w}x${h} tile map, ${count} tile(s)`,
    `// Usage: set_bkg_data(0, ${up}_TILE_COUNT, ${id}_tiles);`,
    `//        set_bkg_tiles(0, 0, ${up}_MAP_WIDTH, ${up}_MAP_HEIGHT, ${id}_map);`,
    `#ifndef ${up}_H`,
    `#define ${up}_H`,
    ``,
    `#define ${up}_TILE_COUNT ${count}`,
    `#define ${up}_MAP_WIDTH ${w}`,
    `#define ${up}_MAP_HEIGHT ${h}`,
    ``,
    `const unsigned char ${id}_tiles[] = {`,
  ];
  for (let t = 0; t < count; t++) {
    const row = Array.from(tileRow(tileData, t), (b) => `0x${hex(b)}`).join(',');
    lines.push(`    ${row}${t < count - 1 ? ',' : ''} // tile ${t}`);
  }
  lines.push(`};`, ``, `const unsigned char ${id}_map[] = {`);
  map.forEach((row, y) => lines.push(`    ${row.map((t) => `0x${hex(t)}`).join(',')}${y < h - 1 ? ',' : ''}`));
  lines.push(`};`, ``, `#endif`, ``);
  return lines.join('\n');
}
