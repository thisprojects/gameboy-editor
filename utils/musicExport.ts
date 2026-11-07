import { MusicInstrument, MusicPattern, RegWrite } from '@/types/music';
import { REG } from '@/constants/music';
import { rowWrites } from '@/utils/gbMusic';
import { toIdentifier } from '@/utils/export';

export interface MusicExportInput {
  patterns: MusicPattern[];
  instruments: MusicInstrument[];
  orderList: number[];
  ticksPerRow: number;
}

const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');

const REG_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(REG)
    .filter(([name]) => name !== 'WAVE_RAM')
    .map(([name, addr]) => [addr, name])
);

function regName(addr: number): string {
  if (addr >= REG.WAVE_RAM && addr < REG.WAVE_RAM + 16) return `wave RAM ${addr - REG.WAVE_RAM}`;
  return REG_NAMES[addr] ?? `$${addr.toString(16).toUpperCase()}`;
}

/** Per pattern: the row count, then for each row a write count and (register low byte, value) pairs. */
export interface PatternStream {
  rows: number;
  /** rows[i] = register writes performed when row i starts */
  writes: RegWrite[][];
}

export function patternStream(pattern: MusicPattern, instruments: MusicInstrument[]): PatternStream {
  return {
    rows: pattern.rows,
    writes: Array.from({ length: pattern.rows }, (_, row) => rowWrites(pattern, row, instruments)),
  };
}

/** The exact byte stream the players consume for one pattern. */
export function streamBytes(stream: PatternStream): number[] {
  return [stream.rows, ...stream.writes.flatMap((w) => [w.length, ...w.flatMap((r) => [r.addr & 0xff, r.value])])];
}

/** RGBDS source: pattern data plus an SM83 player (init / update / stop). Needs RGBDS 0.5.0 or later. */
export function exportMusicRGBDS(name: string, input: MusicExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const streams = input.patterns.map((p) => patternStream(p, input.instruments));

  const lines = [
    `; ${id} - ${input.patterns.length} pattern(s), order length ${input.orderList.length}, ${input.ticksPerRow} frame(s) per row`,
    `;`,
    `; Usage: call ${id}_init once, then call ${id}_update once per frame (for example from your VBlank`,
    `; handler). Call ${id}_stop to silence the sound chip. The song loops. Needs RGBDS 0.5.0 or later.`,
    `;`,
    `; The data is a stream of sound register writes: per row a write count, then (register, value) pairs`,
    `; where the register is the low byte of $FF00+n. The player simply replays them.`,
    ``,
    `DEF ${up}_TICKS_PER_ROW EQU ${input.ticksPerRow}`,
    `DEF ${up}_ORDER_LENGTH EQU ${input.orderList.length}`,
    `DEF ${up}_PATTERN_COUNT EQU ${input.patterns.length}`,
    ``,
    `SECTION "${id}_music_ram", WRAM0`,
    `${id}_tick: db`,
    `${id}_rows_left: db`,
    `${id}_order_pos: db`,
    `${id}_row_ptr: dw`,
    ``,
    `SECTION "${id}_music_player", ROM0`,
    ``,
    `${id}_init::`,
    `    ld a, $80`,
    `    ldh [$FF26], a ; NR52: sound on`,
    `    ld a, $77`,
    `    ldh [$FF24], a ; NR50: master volume`,
    `    ld a, $FF`,
    `    ldh [$FF25], a ; NR51: all channels to both outputs`,
    `    xor a`,
    `    ld [${id}_tick], a`,
    `    ld [${id}_rows_left], a`,
    `    ld [${id}_order_pos], a`,
    `    ret`,
    ``,
    `${id}_stop::`,
    `    xor a`,
    `    ldh [$FF12], a ; NR12`,
    `    ldh [$FF17], a ; NR22`,
    `    ldh [$FF1A], a ; NR30`,
    `    ldh [$FF21], a ; NR42`,
    `    ret`,
    ``,
    `${id}_update::`,
    `    ld a, [${id}_tick]`,
    `    or a`,
    `    jr nz, .wait`,
    `    call ${id}_play_row`,
    `    ld a, ${up}_TICKS_PER_ROW`,
    `.wait:`,
    `    dec a`,
    `    ld [${id}_tick], a`,
    `    ret`,
    ``,
    `${id}_play_row:`,
    `    ld a, [${id}_rows_left]`,
    `    or a`,
    `    call z, ${id}_next_pattern`,
    `    ld a, [${id}_row_ptr]`,
    `    ld l, a`,
    `    ld a, [${id}_row_ptr + 1]`,
    `    ld h, a`,
    `    ld a, [hl+]`,
    `    or a`,
    `    jr z, .done`,
    `    ld b, a`,
    `.write:`,
    `    ld a, [hl+]`,
    `    ld c, a`,
    `    ld a, [hl+]`,
    `    ldh [c], a`,
    `    dec b`,
    `    jr nz, .write`,
    `.done:`,
    `    ld a, l`,
    `    ld [${id}_row_ptr], a`,
    `    ld a, h`,
    `    ld [${id}_row_ptr + 1], a`,
    `    ld hl, ${id}_rows_left`,
    `    dec [hl]`,
    `    ret`,
    ``,
    `${id}_next_pattern:`,
    `    ld a, [${id}_order_pos]`,
    `    ld e, a`,
    `    ld d, 0`,
    `    ld hl, ${id}_order`,
    `    add hl, de`,
    `    ld a, [hl]`,
    `    add a, a`,
    `    ld e, a`,
    `    ld d, 0`,
    `    ld hl, ${id}_patterns`,
    `    add hl, de`,
    `    ld a, [hl+]`,
    `    ld h, [hl]`,
    `    ld l, a`,
    `    ld a, [hl+]`,
    `    ld [${id}_rows_left], a`,
    `    ld a, l`,
    `    ld [${id}_row_ptr], a`,
    `    ld a, h`,
    `    ld [${id}_row_ptr + 1], a`,
    `    ld a, [${id}_order_pos]`,
    `    inc a`,
    `    cp ${up}_ORDER_LENGTH`,
    `    jr c, .store`,
    `    xor a`,
    `.store:`,
    `    ld [${id}_order_pos], a`,
    `    ret`,
    ``,
    `SECTION "${id}_music_data", ROM0`,
    ``,
    `${id}_order::`,
    `    db ${input.orderList.join(', ')}`,
    ``,
    `${id}_patterns::`,
    ...streams.map((_, i) => `    dw ${id}_pattern${i}`),
    ``,
  ];

  streams.forEach((s, i) => {
    lines.push(`${id}_pattern${i}:`, `    db ${s.rows} ; rows`);
    s.writes.forEach((writes, row) => {
      lines.push(`    db ${writes.length} ; row ${row}`);
      for (const w of writes) lines.push(`    db $${hex(w.addr & 0xff)}, $${hex(w.value)} ; ${regName(w.addr)}`);
    });
    lines.push(``);
  });
  return lines.join('\n');
}

/** GBDK-2020 header: pattern data plus a small C player (init / update / stop). */
export function exportMusicC(name: string, input: MusicExportInput): string {
  const id = toIdentifier(name);
  const up = id.toUpperCase();
  const streams = input.patterns.map((p) => patternStream(p, input.instruments));

  const lines = [
    `// ${id} - ${input.patterns.length} pattern(s), order length ${input.orderList.length}, ${input.ticksPerRow} frame(s) per row`,
    `//`,
    `// Usage: call ${id}_init() once, then ${id}_update() once per frame (for example from a VBL interrupt`,
    `// handler or after wait_vbl_done()). ${id}_stop() silences the sound chip. The song loops.`,
    `//`,
    `// The data is a stream of sound register writes: per row a write count, then (register, value) pairs`,
    `// where the register is the low byte of 0xFF00+n. Include this header from one .c file only.`,
    `#ifndef ${up}_H`,
    `#define ${up}_H`,
    ``,
    `#define ${up}_TICKS_PER_ROW ${input.ticksPerRow}`,
    `#define ${up}_ORDER_LENGTH ${input.orderList.length}`,
    `#define ${up}_PATTERN_COUNT ${input.patterns.length}`,
    ``,
  ];

  streams.forEach((s, i) => {
    lines.push(`const unsigned char ${id}_pattern${i}[] = {`, `    ${s.rows}, // rows`);
    s.writes.forEach((writes, row) => {
      lines.push(`    ${writes.length}, // row ${row}`);
      for (const w of writes) lines.push(`    0x${hex(w.addr & 0xff)}, 0x${hex(w.value)}, // ${regName(w.addr)}`);
    });
    lines.push(`};`, ``);
  });

  lines.push(
    `const unsigned char * const ${id}_patterns[] = { ${streams.map((_, i) => `${id}_pattern${i}`).join(', ')} };`,
    `const unsigned char ${id}_order[] = { ${input.orderList.join(', ')} };`,
    ``,
    `static const unsigned char *${id}_row_ptr;`,
    `static unsigned char ${id}_tick;`,
    `static unsigned char ${id}_rows_left;`,
    `static unsigned char ${id}_order_pos;`,
    ``,
    `static void ${id}_init(void) {`,
    `    *(volatile unsigned char *)0xFF26 = 0x80; /* NR52: sound on */`,
    `    *(volatile unsigned char *)0xFF24 = 0x77; /* NR50: master volume */`,
    `    *(volatile unsigned char *)0xFF25 = 0xFF; /* NR51: all channels to both outputs */`,
    `    ${id}_tick = 0;`,
    `    ${id}_rows_left = 0;`,
    `    ${id}_order_pos = 0;`,
    `}`,
    ``,
    `static void ${id}_stop(void) {`,
    `    *(volatile unsigned char *)0xFF12 = 0; /* NR12 */`,
    `    *(volatile unsigned char *)0xFF17 = 0; /* NR22 */`,
    `    *(volatile unsigned char *)0xFF1A = 0; /* NR30 */`,
    `    *(volatile unsigned char *)0xFF21 = 0; /* NR42 */`,
    `}`,
    ``,
    `static void ${id}_next_pattern(void) {`,
    `    const unsigned char *p = ${id}_patterns[${id}_order[${id}_order_pos]];`,
    `    ${id}_rows_left = *p++;`,
    `    ${id}_row_ptr = p;`,
    `    if (++${id}_order_pos >= ${up}_ORDER_LENGTH) ${id}_order_pos = 0;`,
    `}`,
    ``,
    `static void ${id}_update(void) {`,
    `    if (${id}_tick == 0) {`,
    `        const unsigned char *p;`,
    `        unsigned char n;`,
    `        if (${id}_rows_left == 0) ${id}_next_pattern();`,
    `        p = ${id}_row_ptr;`,
    `        n = *p++;`,
    `        while (n--) {`,
    `            *(volatile unsigned char *)(0xFF00u + p[0]) = p[1];`,
    `            p += 2;`,
    `        }`,
    `        ${id}_row_ptr = p;`,
    `        ${id}_rows_left--;`,
    `        ${id}_tick = ${up}_TICKS_PER_ROW;`,
    `    }`,
    `    ${id}_tick--;`,
    `}`,
    ``,
    `#endif`,
    ``
  );
  return lines.join('\n');
}
