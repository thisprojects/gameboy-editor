import { exportMusicRGBDS, exportMusicC, patternStream, streamBytes } from '@/utils/musicExport';
import { createPattern, rowWrites } from '@/utils/gbMusic';
import { PRESET_INSTRUMENTS } from '@/constants/musicPresets';

const instruments = PRESET_INSTRUMENTS.map((p, i) => ({ id: `i${i}`, ...p }));

function song() {
  const a = createPattern('p0', 'P0', 4);
  const b = createPattern('p1', 'P1', 4);
  a.cells[0][0] = { note: 'C', octave: 4, instrument: 0, volume: null };
  a.cells[0][2] = { note: 'OFF', octave: 4, instrument: null, volume: null };
  a.cells[3][1] = { note: 'C', octave: 4, instrument: 7, volume: null };
  b.cells[1][0] = { note: 'G', octave: 3, instrument: 3, volume: 9 };
  return { patterns: [a, b], instruments, orderList: [0, 1, 0], ticksPerRow: 5 };
}

/** Decode the stream exactly like the SM83 / C players do. */
function decode(bytes: number[]): { rows: number; writes: { reg: number; value: number }[][] } {
  const rows = bytes[0];
  let p = 1;
  const writes = [];
  for (let r = 0; r < rows; r++) {
    const n = bytes[p++];
    const row = [];
    for (let i = 0; i < n; i++) {
      row.push({ reg: bytes[p], value: bytes[p + 1] });
      p += 2;
    }
    writes.push(row);
  }
  expect(p).toBe(bytes.length); // nothing left over
  return { rows, writes };
}

describe('music export', () => {
  it('encodes each pattern as rows, then a count and (register, value) pairs per row', () => {
    const s = song();
    const stream = patternStream(s.patterns[0], instruments);
    const bytes = streamBytes(stream);
    const decoded = decode(bytes);
    expect(decoded.rows).toBe(4);
    for (let r = 0; r < 4; r++) {
      expect(decoded.writes[r]).toEqual(rowWrites(s.patterns[0], r, instruments).map((w) => ({ reg: w.addr & 0xff, value: w.value })));
    }
    expect(decoded.writes[0].length).toBe(5); // pulse 1 trigger
    expect(decoded.writes[2]).toEqual([{ reg: 0x12, value: 0 }]); // note off on pulse 1
    expect(decoded.writes[3]).toEqual([]);
  });

  it('writes the RGBDS data and player', () => {
    const out = exportMusicRGBDS('my song', song());
    expect(out).toContain('DEF MY_SONG_TICKS_PER_ROW EQU 5');
    expect(out).toContain('DEF MY_SONG_ORDER_LENGTH EQU 3');
    expect(out).toContain('DEF MY_SONG_PATTERN_COUNT EQU 2');
    for (const label of ['my_song_init::', 'my_song_update::', 'my_song_stop::', 'my_song_order::', 'my_song_patterns::', 'my_song_pattern0:', 'my_song_pattern1:']) {
      expect(out).toContain(label);
    }
    expect(out).toContain('db 0, 1, 0');
    expect(out).toContain('dw my_song_pattern0\n    dw my_song_pattern1');
    expect(out).toContain('db $14, $86 ; NR14'); // C-4 pulse period 1547 -> trigger + high bits 6
    expect(out).toContain('; NR12');
    expect(out).toContain('; NR43');
    expect(out).toContain('ldh [c], a');
    expect(out).toContain('ldh [$FF26], a ; NR52');
    expect(out).toContain('ldh [$FF1A], a ; NR30');
  });

  it('names wave RAM writes and unknown registers in comments', () => {
    const s = song();
    s.patterns[0].cells[2][0] = { note: 'A', octave: 3, instrument: 4, volume: null };
    const out = exportMusicRGBDS('s', s);
    expect(out).toContain('; wave RAM 0');
    expect(out).toContain('; wave RAM 15');
  });

  it('writes the C data and player', () => {
    const out = exportMusicC('my song', song());
    expect(out).toContain('#define MY_SONG_TICKS_PER_ROW 5');
    expect(out).toContain('#define MY_SONG_ORDER_LENGTH 3');
    expect(out).toContain('const unsigned char my_song_pattern0[] = {');
    expect(out).toContain('my_song_patterns[] = { my_song_pattern0, my_song_pattern1 };');
    expect(out).toContain('my_song_order[] = { 0, 1, 0 };');
    expect(out).toContain('static void my_song_update(void)');
    expect(out).toContain('static void my_song_init(void)');
    expect(out).toContain('static void my_song_stop(void)');
    expect(out).toContain('*(volatile unsigned char *)(0xFF00u + p[0]) = p[1];');
    expect(out).toContain('0x12, 0x00, // NR12');
    expect(out).toMatch(/#endif\n$/);
  });
});
