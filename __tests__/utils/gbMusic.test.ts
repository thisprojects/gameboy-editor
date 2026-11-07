import {
  emptyCell, createPattern, createInstrument, noteIndex, noteFrequency, pulsePeriod, wavePeriod, noiseClock, noiseNr43,
  envelopeByte, sweepByte, waveRamBytes, offWrites, cellWrites, rowWrites, initWrites, silenceWrites,
  isValidInstrument, isValidPattern, isValidSong,
} from '@/utils/gbMusic';
import { PRESET_INSTRUMENTS, triangleWave, sawWave, squareWave, sineWave } from '@/constants/musicPresets';
import { REG, NOTE_COUNT } from '@/constants/music';
import { MusicCell, MusicInstrument, MusicProjectData } from '@/types/music';

const instruments: MusicInstrument[] = PRESET_INSTRUMENTS.map((p, i) => ({ id: `i${i}`, ...p }));
const idx = (name: string) => instruments.findIndex((i) => i.name === name);
const cell = (over: Partial<MusicCell>): MusicCell => ({ ...emptyCell(), ...over });

describe('pitch', () => {
  it('maps notes to indices 0..71', () => {
    expect(noteIndex('C', 2)).toBe(0);
    expect(noteIndex('B', 7)).toBe(NOTE_COUNT - 1);
    expect(noteIndex('A', 4)).toBe(33);
    expect(noteIndex('C', 1)).toBeNull();
    expect(noteIndex('C', 8)).toBeNull();
  });

  it('uses concert pitch', () => {
    expect(noteFrequency(noteIndex('A', 4)!)).toBeCloseTo(440, 6);
    expect(noteFrequency(noteIndex('A', 5)!)).toBeCloseTo(880, 6);
    expect(noteFrequency(0)).toBeCloseTo(65.406, 2);
  });

  it('computes pulse and wave periods from the hardware formulas', () => {
    const a4 = noteIndex('A', 4)!;
    expect(pulsePeriod(a4)).toBe(1750); // 2048 - 131072/440
    expect(wavePeriod(a4)).toBe(1899); // 2048 - 65536/440
    // round trip: frequency produced by the period is within a cent or so of the note
    expect(131072 / (2048 - pulsePeriod(a4))).toBeCloseTo(440, 0);
    expect(pulsePeriod(0)).toBeGreaterThan(0);
    expect(pulsePeriod(NOTE_COUNT - 1)).toBeLessThanOrEqual(2047);
    // periods increase with pitch
    for (let i = 1; i < NOTE_COUNT; i++) expect(pulsePeriod(i)).toBeGreaterThanOrEqual(pulsePeriod(i - 1));
  });

  it('computes noise clocks (divisor code 0 = 0.5)', () => {
    expect(noiseClock(0x00)).toBe(524288);
    expect(noiseClock(0x01)).toBe(262144);
    expect(noiseClock(0x42)).toBe(262144 / (2 * 16));
  });

  it('picks the noise register closest to the note, never using shifts 14-15', () => {
    for (let i = 0; i < NOTE_COUNT; i++) {
      const v = noiseNr43(i);
      expect(v >> 4).toBeLessThanOrEqual(13);
      expect(v & 8).toBe(0);
    }
    // higher notes give faster noise
    expect(noiseClock(noiseNr43(60))).toBeGreaterThan(noiseClock(noiseNr43(10)));
    // C4 target 2093 Hz: closest is within a semitone
    const c4 = noteIndex('C', 4)!;
    expect(Math.abs(Math.log2(noiseClock(noiseNr43(c4)) / (noteFrequency(c4) * 8)))).toBeLessThan(1 / 12);
  });
});

describe('register bytes', () => {
  it('builds envelope and sweep bytes', () => {
    expect(envelopeByte(15, 'down', 0)).toBe(0xf0);
    expect(envelopeByte(9, 'up', 3)).toBe(0x9b);
    expect(sweepByte({ ...instruments[0], sweepPeriod: 3, sweepDirection: 'down', sweepShift: 2 })).toBe(0x3a);
    expect(sweepByte({ ...instruments[0], sweepPeriod: 5, sweepDirection: 'up', sweepShift: 7 })).toBe(0x57);
  });

  it('packs wave RAM with the first sample in the high nibble', () => {
    const bytes = waveRamBytes(Array.from({ length: 32 }, (_, i) => i % 16));
    expect(bytes).toHaveLength(16);
    expect(bytes[0]).toBe(0x01);
    expect(bytes[7]).toBe(0xef);
    expect(waveRamBytes(squareWave())[0]).toBe(0xff);
    expect(waveRamBytes(squareWave())[15]).toBe(0x00);
  });

  it('has wave shape generators in range', () => {
    for (const f of [triangleWave, sawWave, squareWave, sineWave]) {
      const w = f();
      expect(w).toHaveLength(32);
      expect(w.every((s) => s >= 0 && s <= 15)).toBe(true);
    }
    expect(triangleWave()[15]).toBe(15);
    expect(triangleWave()[16]).toBe(15);
    expect(triangleWave()[31]).toBe(0);
  });
});

describe('cellWrites', () => {
  it('returns nothing for empty cells', () => {
    expect(cellWrites(0, emptyCell(), instruments)).toEqual([]);
  });

  it('silences each channel on note off', () => {
    const off = cell({ note: 'OFF' });
    expect(cellWrites(0, off, instruments)).toEqual([{ addr: REG.NR12, value: 0 }]);
    expect(cellWrites(1, off, instruments)).toEqual([{ addr: REG.NR22, value: 0 }]);
    expect(cellWrites(2, off, instruments)).toEqual([{ addr: REG.NR30, value: 0 }]);
    expect(cellWrites(3, off, instruments)).toEqual([{ addr: REG.NR42, value: 0 }]);
    expect(offWrites(9)).toEqual([{ addr: REG.NR42, value: 0 }]);
  });

  it('triggers pulse channel 1 with sweep, duty, envelope, period', () => {
    const w = cellWrites(0, cell({ note: 'A', octave: 4, instrument: idx('Zap') }), instruments);
    expect(w.map((x) => x.addr)).toEqual([REG.NR10, REG.NR11, REG.NR12, REG.NR13, REG.NR14]);
    expect(w[0].value).toBe(0x3a);
    expect(w[1].value).toBe(2 << 6);
    expect(w[2].value).toBe(0xf3);
    expect(w[3].value).toBe(1750 & 0xff);
    expect(w[4].value).toBe(0x80 | (1750 >> 8));
  });

  it('triggers pulse channel 2 without a sweep register', () => {
    const w = cellWrites(1, cell({ note: 'C', octave: 3, instrument: idx('Lead 25%') }), instruments);
    expect(w.map((x) => x.addr)).toEqual([REG.NR21, REG.NR22, REG.NR23, REG.NR24]);
    expect(w[0].value).toBe(1 << 6);
  });

  it('overrides the initial volume from the cell', () => {
    const w = cellWrites(1, cell({ note: 'C', octave: 4, instrument: idx('Pluck'), volume: 7 }), instruments);
    expect(w[1].value).toBe((7 << 4) | 2);
  });

  it('loads wave RAM with the DAC off, then triggers the wave channel', () => {
    const w = cellWrites(2, cell({ note: 'A', octave: 4, instrument: idx('Wave Bass') }), instruments);
    expect(w[0]).toEqual({ addr: REG.NR30, value: 0 });
    expect(w.slice(1, 17).map((x) => x.addr)).toEqual(Array.from({ length: 16 }, (_, i) => REG.WAVE_RAM + i));
    expect(w[17]).toEqual({ addr: REG.NR30, value: 0x80 });
    expect(w[18]).toEqual({ addr: REG.NR32, value: 1 << 5 });
    expect(w[19]).toEqual({ addr: REG.NR33, value: 1899 & 0xff });
    expect(w[20]).toEqual({ addr: REG.NR34, value: 0x80 | (1899 >> 8) });
    expect(w).toHaveLength(21);
  });

  it('triggers noise with the note-derived NR43 and the width bit', () => {
    const c4 = noteIndex('C', 4)!;
    const hat = cellWrites(3, cell({ note: 'C', octave: 4, instrument: idx('Hi-hat') }), instruments);
    expect(hat.map((x) => x.addr)).toEqual([REG.NR42, REG.NR43, REG.NR44]);
    expect(hat[1].value).toBe(noiseNr43(c4));
    expect(hat[2].value).toBe(0x80);
    const kick = cellWrites(3, cell({ note: 'C', octave: 4, instrument: idx('Kick') }), instruments);
    expect(kick[1].value).toBe(noiseNr43(c4) | 8);
  });

  it('produces nothing for a missing, wrong-kind or out-of-range instrument', () => {
    expect(cellWrites(0, cell({ note: 'C', instrument: null }), instruments)).toEqual([]);
    expect(cellWrites(0, cell({ note: 'C', instrument: 99 }), instruments)).toEqual([]);
    expect(cellWrites(0, cell({ note: 'C', instrument: idx('Wave Bass') }), instruments)).toEqual([]); // wave on a pulse channel
    expect(cellWrites(3, cell({ note: 'C', instrument: idx('Lead 50%') }), instruments)).toEqual([]);
    expect(cellWrites(0, cell({ note: 'C', octave: 9, instrument: 0 }), instruments)).toEqual([]);
  });
});

describe('rows, init and validation', () => {
  it('concatenates the channels of a row in order', () => {
    const p = createPattern('p', 'P', 4);
    p.cells[0][1] = cell({ note: 'C', instrument: idx('Lead 50%') });
    p.cells[3][1] = cell({ note: 'OFF' });
    const w = rowWrites(p, 1, instruments);
    expect(w).toHaveLength(5 + 1);
    expect(w[w.length - 1]).toEqual({ addr: REG.NR42, value: 0 });
    expect(rowWrites(p, 0, instruments)).toEqual([]);
  });

  it('powers on and silences', () => {
    expect(initWrites()).toEqual([
      { addr: REG.NR52, value: 0x80 }, { addr: REG.NR50, value: 0x77 }, { addr: REG.NR51, value: 0xff },
    ]);
    expect(silenceWrites().map((x) => x.addr)).toEqual([REG.NR12, REG.NR22, REG.NR30, REG.NR42]);
  });

  it('creates patterns and instruments of each kind', () => {
    const p = createPattern('p1', 'Pattern 1', 8);
    expect(p.cells).toHaveLength(4);
    expect(p.cells[2]).toHaveLength(8);
    expect(createInstrument('a', 'A', 'pulse').kind).toBe('pulse');
    const w = createInstrument('b', 'B', 'wave');
    expect(w.kind).toBe('wave');
    expect(w.wave).toEqual(triangleWave());
    expect(createInstrument('c', 'C', 'noise').kind).toBe('noise');
    expect(createInstrument('c', 'C', 'noise').wave).not.toBe(PRESET_INSTRUMENTS[0].wave);
  });

  describe('validation', () => {
    const song = (): MusicProjectData => ({
      version: 1, type: 'music', patterns: [createPattern('p0', 'P0', 8)], instruments: instruments.slice(0, 3),
      orderList: [0, 0], ticksPerRow: 6,
    });

    it('accepts a valid song, instrument and pattern', () => {
      expect(isValidSong(song())).toBe(true);
      expect(isValidInstrument(instruments[0])).toBe(true);
      expect(isValidPattern(song().patterns[0])).toBe(true);
    });

    it.each([
      ['null', null],
      ['wrong type', { ...song(), type: 'map' }],
      ['no patterns', { ...song(), patterns: [] }],
      ['too many patterns', { ...song(), patterns: Array(65).fill(song().patterns[0]) }],
      ['bad pattern rows', { ...song(), patterns: [{ ...song().patterns[0], rows: 2 }] }],
      ['no instruments', { ...song(), instruments: [] }],
      ['too many instruments', { ...song(), instruments: Array(33).fill(instruments[0]) }],
      ['bad instrument', { ...song(), instruments: [{ ...instruments[0], duty: 9 }] }],
      ['empty order', { ...song(), orderList: [] }],
      ['order out of range', { ...song(), orderList: [1] }],
      ['too long order', { ...song(), orderList: Array(129).fill(0) }],
      ['bad ticks', { ...song(), ticksPerRow: 0 }],
      ['ticks too high', { ...song(), ticksPerRow: 256 }],
      ['non-array order', { ...song(), orderList: 'x' }],
    ])('rejects a song with %s', (_n, data) => expect(isValidSong(data)).toBe(false));

    describe('notes must use an instrument that exists and that their channel can play', () => {
      const withCell = (channel: number, instrument: number | null) => {
        const song = (() => { const x = { version: 1, type: 'music', patterns: [createPattern('p0', 'P0', 8)], instruments: instruments.slice(0, 5), orderList: [0], ticksPerRow: 6 } as MusicProjectData; return x; })();
        song.patterns[0].cells[channel][0] = { note: 'C', octave: 4, instrument, volume: null };
        return song;
      };
      it('accepts matching instruments, and a note without one', () => {
        expect(isValidSong(withCell(0, 0))).toBe(true); // pulse on pulse 1
        expect(isValidSong(withCell(1, 3))).toBe(true); // pulse on pulse 2
        expect(isValidSong(withCell(2, 4))).toBe(true); // wave on the wave channel
        expect(isValidSong(withCell(3, null))).toBe(true);
      });
      it('rejects an instrument number that does not exist', () => {
        expect(isValidSong(withCell(0, 20))).toBe(false); // only 5 instruments
        expect(isValidSong(withCell(0, 5))).toBe(false);
      });
      it('rejects an instrument of the wrong kind for the channel', () => {
        expect(isValidSong(withCell(0, 4))).toBe(false); // wave instrument on a pulse channel
        expect(isValidSong(withCell(2, 0))).toBe(false); // pulse instrument on the wave channel
        expect(isValidSong(withCell(3, 0))).toBe(false); // pulse instrument on the noise channel
      });
    });

    it.each([
      ['bad kind', { kind: 'fm' }],
      ['bad sweep direction', { sweepDirection: 'sideways' }],
      ['bad envelope direction', { envDirection: 'x' }],
      ['wave too short', { wave: [1, 2] }],
      ['wave sample too big', { wave: Array(32).fill(16) }],
      ['bad level', { waveLevel: 0 }],
      ['bad noise width', { noiseWidth: 2 }],
      ['missing id', { id: 5 }],
      ['bad envelope volume', { envVolume: 16 }],
    ])('rejects an instrument with %s', (_n, over) => {
      expect(isValidInstrument({ ...instruments[0], ...over })).toBe(false);
    });
    it('rejects non-objects as instruments', () => expect(isValidInstrument(null)).toBe(false));

    it.each([
      ['not an object', null],
      ['wrong channel count', { ...createPattern('p', 'P', 4), cells: [[], [], []] }],
      ['wrong row count', { ...createPattern('p', 'P', 4), cells: Array(4).fill([emptyCell()]) }],
      ['bad note', (() => { const p = createPattern('p', 'P', 4); (p.cells[0][0] as unknown as { note: string }).note = 'H'; return p; })()],
      ['bad octave', (() => { const p = createPattern('p', 'P', 4); p.cells[0][0].octave = 9; return p; })()],
      ['bad volume', (() => { const p = createPattern('p', 'P', 4); p.cells[0][0].volume = 20; return p; })()],
      ['bad instrument index', (() => { const p = createPattern('p', 'P', 4); p.cells[0][0].instrument = 40; return p; })()],
      ['null cell', (() => { const p = createPattern('p', 'P', 4); (p.cells[0] as unknown[])[0] = null; return p; })()],
    ])('rejects a pattern with %s', (_n, p) => expect(isValidPattern(p)).toBe(false));
  });
});
