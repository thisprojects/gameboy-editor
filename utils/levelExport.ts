import { BYTES_PER_TILE } from '@/constants';
import { Metatile } from '@/types/metatile';
import { toIdentifier } from '@/utils/export';
import { collisionBytes } from '@/utils/metatile';

export interface MetatileExportInput {
  /** Raw 2bpp data for tiles 0..N-1 */
  tileData: Uint8Array;
  metatiles: Metatile[];
  /** Metatile width and height in tiles */
  mw: number;
  mh: number;
}

export interface LevelExportInput extends MetatileExportInput {
  /** map[y][x] = metatile index */
  map: number[][];
}

const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');
const tileBytes = (data: Uint8Array, t: number) => data.slice(t * BYTES_PER_TILE, (t + 1) * BYTES_PER_TILE);

/** RGBDS lines for tiles, metatile table and collision table. */
function rgbdsLibrary(id: string, { tileData, metatiles, mw, mh }: MetatileExportInput): string[] {
  const lines = [`${id}_tiles::`];
  for (let t = 0; t < tileData.length / BYTES_PER_TILE; t++) {
    lines.push(`    db ${Array.from(tileBytes(tileData, t), (b) => `$${hex(b)}`).join(', ')} ; tile ${t}`);
  }
  lines.push(`${id}_tiles_end::`, ``, `; ${mw * mh} tile indices per metatile (${mw} wide x ${mh} high), row-major`, `${id}_metatiles::`);
  metatiles.forEach((m, i) => lines.push(`    db ${m.tiles.flat().map((t) => `$${hex(t)}`).join(', ')} ; metatile ${i}`));
  lines.push(``, `; 1 = solid, one byte per metatile`, `${id}_collision::`);
  lines.push(`    db ${Array.from(collisionBytes(metatiles), (b) => `$${hex(b)}`).join(', ')}`);
  return lines;
}

function header(id: string, comment: string, input: MetatileExportInput): string[] {
  const up = id.toUpperCase();
  return [
    `; ${id} - ${comment}`,
    ``,
    `DEF ${up}_TILE_COUNT EQU ${input.tileData.length / BYTES_PER_TILE}`,
    `DEF ${up}_METATILE_COUNT EQU ${input.metatiles.length}`,
    `DEF ${up}_METATILE_WIDTH EQU ${input.mw}`,
    `DEF ${up}_METATILE_HEIGHT EQU ${input.mh}`,
    ...(input.mw === input.mh ? [`DEF ${up}_METATILE_SIZE EQU ${input.mw}`] : []),
  ];
}

/** RGBDS: tiles, metatile table and collision table. */
export function exportMetatilesRGBDS(name: string, input: MetatileExportInput): string {
  const id = toIdentifier(name);
  return [
    ...header(id, `${input.metatiles.length} metatile(s) of ${input.mw}x${input.mh} tiles`, input),
    ``,
    `SECTION "${id}_metatiles", ROM0`,
    ``,
    ...rgbdsLibrary(id, input),
    ``,
  ].join('\n');
}

/** RGBDS: tiles, metatile + collision tables and the level map (one metatile index per cell). */
export function exportLevelRGBDS(name: string, input: LevelExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const w = input.map[0].length;
  const h = input.map.length;
  const lines = [
    ...header(id, `${w}x${h} metatile level (${w * input.mw}x${h * input.mh} tiles)`, input),
    `DEF ${up}_WIDTH EQU ${w}`,
    `DEF ${up}_HEIGHT EQU ${h}`,
    ``,
    `SECTION "${id}_level", ROM0`,
    ``,
    ...rgbdsLibrary(id, input),
    ``,
    `; metatile index per cell, row-major`,
    `${id}_map::`,
  ];
  input.map.forEach((row, y) => lines.push(`    db ${row.map((t) => `$${hex(t)}`).join(', ')} ; row ${y}`));
  lines.push(`${id}_map_end::`, ``);
  return lines.join('\n');
}

function cLibrary(id: string, { tileData, metatiles }: MetatileExportInput): string[] {
  const count = tileData.length / BYTES_PER_TILE;
  const lines = [`const unsigned char ${id}_tiles[] = {`];
  for (let t = 0; t < count; t++) {
    lines.push(`    ${Array.from(tileBytes(tileData, t), (b) => `0x${hex(b)}`).join(',')}${t < count - 1 ? ',' : ''} // tile ${t}`);
  }
  lines.push(`};`, ``, `const unsigned char ${id}_metatiles[] = {`);
  metatiles.forEach((m, i) => lines.push(`    ${m.tiles.flat().map((t) => `0x${hex(t)}`).join(',')}${i < metatiles.length - 1 ? ',' : ''} // metatile ${i}`));
  lines.push(`};`, ``, `const unsigned char ${id}_collision[] = { ${Array.from(collisionBytes(metatiles)).join(', ')} };`);
  return lines;
}

function cDefines(id: string, input: MetatileExportInput): string[] {
  const up = id.toUpperCase();
  return [
    `#define ${up}_TILE_COUNT ${input.tileData.length / BYTES_PER_TILE}`,
    `#define ${up}_METATILE_COUNT ${input.metatiles.length}`,
    `#define ${up}_METATILE_WIDTH ${input.mw}`,
    `#define ${up}_METATILE_HEIGHT ${input.mh}`,
    ...(input.mw === input.mh ? [`#define ${up}_METATILE_SIZE ${input.mw}`] : []),
  ];
}

/** GBDK-2020 header: tiles, metatile table and collision table. */
export function exportMetatilesC(name: string, input: MetatileExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  return [
    `// ${id} - ${input.metatiles.length} metatile(s) of ${input.mw}x${input.mh} tiles`,
    `// Usage: set_bkg_data(0, ${up}_TILE_COUNT, ${id}_tiles); metatile m = ${id}_metatiles + m * (${up}_METATILE_WIDTH * ${up}_METATILE_HEIGHT)`,
    `#ifndef ${up}_H`,
    `#define ${up}_H`,
    ``,
    ...cDefines(id, input),
    ``,
    ...cLibrary(id, input),
    ``,
    `#endif`,
    ``,
  ].join('\n');
}

/** GBDK-2020 header: library plus the level map. */
export function exportLevelC(name: string, input: LevelExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const w = input.map[0].length;
  const h = input.map.length;
  const lines = [
    `// ${id} - ${w}x${h} metatile level (${w * input.mw}x${h * input.mh} tiles)`,
    `// Usage: set_bkg_data(0, ${up}_TILE_COUNT, ${id}_tiles); draw each ${id}_map cell's metatile with set_bkg_tiles`,
    `#ifndef ${up}_H`,
    `#define ${up}_H`,
    ``,
    ...cDefines(id, input),
    `#define ${up}_WIDTH ${w}`,
    `#define ${up}_HEIGHT ${h}`,
    ``,
    ...cLibrary(id, input),
    ``,
    `const unsigned char ${id}_map[] = {`,
  ];
  input.map.forEach((row, y) => lines.push(`    ${row.map((t) => `0x${hex(t)}`).join(',')}${y < h - 1 ? ',' : ''}`));
  lines.push(`};`, ``, `#endif`, ``);
  return lines.join('\n');
}
