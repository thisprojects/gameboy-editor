import {
  CHANNEL_KINDS,
  DEFAULT_OCTAVE,
  MAX_OCTAVE,
  MAX_ORDER_LENGTH,
  MAX_PATTERN_ROWS,
  MAX_PATTERNS,
  MAX_INSTRUMENTS,
  MAX_TICKS_PER_ROW,
  MIN_OCTAVE,
  MIN_PATTERN_ROWS,
  MUSIC_CHANNELS,
  NOTE_NAMES,
  NOTES_PER_OCTAVE,
  REG,
  WAVE_LENGTH,
} from '@/constants/music';
import { PRESET_INSTRUMENTS, triangleWave } from '@/constants/musicPresets';
import { InstrumentKind, MusicCell, MusicInstrument, MusicPattern, MusicProjectData, NOTE_OFF, NoteName, RegWrite } from '@/types/music';

// ---------------------------------------------------------------- model helpers

export const emptyCell = (): MusicCell => ({ note: null, octave: DEFAULT_OCTAVE, instrument: null, volume: null });

export function createPattern(id: string, name: string, rows: number): MusicPattern {
  return {
    id,
    name,
    rows,
    cells: Array.from({ length: MUSIC_CHANNELS }, () => Array.from({ length: rows }, emptyCell)),
  };
}

/** A new instrument of the given kind with sensible defaults. */
export function createInstrument(id: string, name: string, kind: InstrumentKind): MusicInstrument {
  const preset = PRESET_INSTRUMENTS.find((p) => p.kind === kind) ?? PRESET_INSTRUMENTS[0];
  return { ...preset, id, name, kind, wave: kind === 'wave' ? triangleWave() : [...preset.wave] };
}

// ---------------------------------------------------------------- pitch

/** Note index 0..71 (C2..B7), or null when the octave is out of range. */
export function noteIndex(note: NoteName, octave: number): number | null {
  if (octave < MIN_OCTAVE || octave > MAX_OCTAVE) return null;
  return (octave - MIN_OCTAVE) * NOTES_PER_OCTAVE + NOTE_NAMES.indexOf(note);
}

/** Concert pitch: A4 = 440 Hz. */
export function noteFrequency(index: number): number {
  const midi = (MIN_OCTAVE + 1) * NOTES_PER_OCTAVE + index;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const clampPeriod = (x: number) => Math.max(0, Math.min(2047, Math.round(x)));

/** Pulse channel 11-bit period: frequency = 131072 / (2048 - x). */
export const pulsePeriod = (index: number): number => clampPeriod(2048 - 131072 / noteFrequency(index));

/** Wave channel 11-bit period: one 32-sample cycle plays at 65536 / (2048 - x). */
export const wavePeriod = (index: number): number => clampPeriod(2048 - 65536 / noteFrequency(index));

/** Noise clock for NR43 value: 262144 / (divisor * 2^shift), divisor code 0 meaning 0.5. */
export const noiseClock = (nr43: number): number => 262144 / ((nr43 & 7 || 0.5) * Math.pow(2, nr43 >> 4));

/**
 * NR43 (shift/divisor part, width bit clear) giving the noise clock closest to the note's pitch x 8.
 * Shifts 14-15 are not used (the LFSR is not clocked there).
 */
export function noiseNr43(index: number): number {
  const target = noteFrequency(index) * 8;
  let best = 0;
  let bestError = Infinity;
  for (let shift = 0; shift <= 13; shift++) {
    for (let divisor = 0; divisor <= 7; divisor++) {
      const value = (shift << 4) | divisor;
      const error = Math.abs(Math.log2(noiseClock(value) / target));
      if (error < bestError) {
        bestError = error;
        best = value;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------- register writes

export const envelopeByte = (volume: number, direction: 'down' | 'up', period: number): number =>
  ((volume & 15) << 4) | (direction === 'up' ? 8 : 0) | (period & 7);

/** NR10: sweep period, direction (bit 3 set = frequency decreases) and shift. */
export const sweepByte = (inst: MusicInstrument): number =>
  ((inst.sweepPeriod & 7) << 4) | (inst.sweepDirection === 'down' ? 8 : 0) | (inst.sweepShift & 7);

/** Wave RAM bytes: two 4-bit samples each, first sample in the high nibble. */
export function waveRamBytes(wave: number[]): number[] {
  return Array.from({ length: WAVE_LENGTH / 2 }, (_, i) => ((wave[2 * i] & 15) << 4) | (wave[2 * i + 1] & 15));
}

const w = (addr: number, value: number): RegWrite => ({ addr, value: value & 0xff });

/** Register writes that silence one channel. */
export function offWrites(channel: number): RegWrite[] {
  switch (channel) {
    case 0: return [w(REG.NR12, 0)];
    case 1: return [w(REG.NR22, 0)];
    case 2: return [w(REG.NR30, 0)];
    default: return [w(REG.NR42, 0)];
  }
}

/** Register writes for one cell on one channel (empty when the cell has no event or cannot be played). */
export function cellWrites(channel: number, cell: MusicCell, instruments: MusicInstrument[]): RegWrite[] {
  if (cell.note === null) return [];
  if (cell.note === NOTE_OFF) return offWrites(channel);

  const inst = cell.instrument !== null ? instruments[cell.instrument] : undefined;
  const index = noteIndex(cell.note, cell.octave);
  if (!inst || index === null || inst.kind !== CHANNEL_KINDS[channel]) return [];

  const env = envelopeByte(cell.volume ?? inst.envVolume, inst.envDirection, inst.envPeriod);

  if (inst.kind === 'pulse') {
    const period = pulsePeriod(index);
    const trigger = 0x80 | ((period >> 8) & 7);
    if (channel === 0) {
      return [w(REG.NR10, sweepByte(inst)), w(REG.NR11, inst.duty << 6), w(REG.NR12, env), w(REG.NR13, period), w(REG.NR14, trigger)];
    }
    return [w(REG.NR21, inst.duty << 6), w(REG.NR22, env), w(REG.NR23, period), w(REG.NR24, trigger)];
  }

  if (inst.kind === 'wave') {
    const period = wavePeriod(index);
    return [
      w(REG.NR30, 0x00), // DAC off while wave RAM is rewritten
      ...waveRamBytes(inst.wave).map((b, i) => w(REG.WAVE_RAM + i, b)),
      w(REG.NR30, 0x80),
      w(REG.NR32, (inst.waveLevel & 3) << 5),
      w(REG.NR33, period),
      w(REG.NR34, 0x80 | ((period >> 8) & 7)),
    ];
  }

  return [w(REG.NR42, env), w(REG.NR43, noiseNr43(index) | (inst.noiseWidth << 3)), w(REG.NR44, 0x80)];
}

/** Register writes for every channel of one pattern row. */
export function rowWrites(pattern: MusicPattern, row: number, instruments: MusicInstrument[]): RegWrite[] {
  return pattern.cells.flatMap((channelCells, channel) => cellWrites(channel, channelCells[row], instruments));
}

/** Power on, master volume and panning. */
export const initWrites = (): RegWrite[] => [w(REG.NR52, 0x80), w(REG.NR50, 0x77), w(REG.NR51, 0xff)];

/** Silence all four channels. */
export const silenceWrites = (): RegWrite[] => [0, 1, 2, 3].flatMap(offWrites);

// ---------------------------------------------------------------- validation (project files)

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export function isValidInstrument(i: unknown): i is MusicInstrument {
  const x = i as Partial<MusicInstrument> | null;
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    (x.kind === 'pulse' || x.kind === 'wave' || x.kind === 'noise') &&
    isInt(x.duty, 0, 3) &&
    isInt(x.sweepPeriod, 0, 7) &&
    (x.sweepDirection === 'up' || x.sweepDirection === 'down') &&
    isInt(x.sweepShift, 0, 7) &&
    isInt(x.envVolume, 0, 15) &&
    (x.envDirection === 'up' || x.envDirection === 'down') &&
    isInt(x.envPeriod, 0, 7) &&
    Array.isArray(x.wave) &&
    x.wave.length === WAVE_LENGTH &&
    x.wave.every((s) => isInt(s, 0, 15)) &&
    isInt(x.waveLevel, 1, 3) &&
    (x.noiseWidth === 0 || x.noiseWidth === 1)
  );
}

function isValidCell(c: unknown): c is MusicCell {
  const x = c as Partial<MusicCell> | null;
  if (!x) return false;
  const noteOk = x.note === null || x.note === NOTE_OFF || NOTE_NAMES.includes(x.note as NoteName);
  return noteOk && isInt(x.octave, MIN_OCTAVE, MAX_OCTAVE) && (x.instrument === null || isInt(x.instrument, 0, MAX_INSTRUMENTS - 1)) && (x.volume === null || isInt(x.volume, 0, 15));
}

export function isValidPattern(p: unknown): p is MusicPattern {
  const x = p as Partial<MusicPattern> | null;
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    isInt(x.rows, MIN_PATTERN_ROWS, MAX_PATTERN_ROWS) &&
    Array.isArray(x.cells) &&
    x.cells.length === MUSIC_CHANNELS &&
    x.cells.every((ch) => Array.isArray(ch) && ch.length === x.rows && ch.every(isValidCell))
  );
}

export function isValidSong(d: unknown): d is MusicProjectData {
  const x = d as Partial<MusicProjectData> | null;
  if (!x || x.type !== 'music') return false;
  if (!Array.isArray(x.patterns) || x.patterns.length < 1 || x.patterns.length > MAX_PATTERNS || !x.patterns.every(isValidPattern)) return false;
  if (!Array.isArray(x.instruments) || x.instruments.length < 1 || x.instruments.length > MAX_INSTRUMENTS || !x.instruments.every(isValidInstrument)) return false;
  const patternCount = x.patterns.length;
  const instruments = x.instruments;
  // every note must use an instrument that exists and that its channel can play (otherwise it is silently mute)
  const cellsUseValidInstruments = x.patterns.every((p) =>
    p.cells.every((channelCells, channel) =>
      channelCells.every((c) => c.instrument === null || instruments[c.instrument]?.kind === CHANNEL_KINDS[channel])
    )
  );
  return (
    cellsUseValidInstruments &&
    Array.isArray(x.orderList) &&
    x.orderList.length >= 1 &&
    x.orderList.length <= MAX_ORDER_LENGTH &&
    x.orderList.every((o) => isInt(o, 0, patternCount - 1)) &&
    isInt(x.ticksPerRow, 1, MAX_TICKS_PER_ROW)
  );
}

