import { InstrumentKind, NoteName } from '@/types/music';

export const MUSIC_CHANNELS = 4;
export const MUSIC_CHANNEL_NAMES = ['Pulse 1', 'Pulse 2', 'Wave', 'Noise'] as const;
/** Instrument kind each channel can play. */
export const CHANNEL_KINDS: InstrumentKind[] = ['pulse', 'pulse', 'wave', 'noise'];

export const DEFAULT_PATTERN_ROWS = 32;
export const MIN_PATTERN_ROWS = 4;
export const MAX_PATTERN_ROWS = 128;
export const DEFAULT_TICKS_PER_ROW = 6; // 6 frames @ 60 Hz = 10 rows/sec
export const MAX_TICKS_PER_ROW = 255;
export const FRAME_RATE = 60; // preview frame rate (hardware VBlank is 59.7 Hz)
export const MAX_INSTRUMENTS = 32;
export const MAX_PATTERNS = 64;
export const MAX_ORDER_LENGTH = 128;

export const MIN_OCTAVE = 2;
export const MAX_OCTAVE = 7;
export const DEFAULT_OCTAVE = 4;
export const NOTES_PER_OCTAVE = 12;
export const NOTE_COUNT = (MAX_OCTAVE - MIN_OCTAVE + 1) * NOTES_PER_OCTAVE; // 72

export const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const DUTY_NAMES = ['12.5%', '25%', '50%', '75%'];
export const WAVE_LENGTH = 32;
export const WAVE_LEVEL_NAMES: Record<number, string> = { 1: '100%', 2: '50%', 3: '25%' };

/** Sound register addresses. */
export const REG = {
  NR10: 0xff10, NR11: 0xff11, NR12: 0xff12, NR13: 0xff13, NR14: 0xff14,
  NR21: 0xff16, NR22: 0xff17, NR23: 0xff18, NR24: 0xff19,
  NR30: 0xff1a, NR31: 0xff1b, NR32: 0xff1c, NR33: 0xff1d, NR34: 0xff1e,
  NR41: 0xff20, NR42: 0xff21, NR43: 0xff22, NR44: 0xff23,
  NR50: 0xff24, NR51: 0xff25, NR52: 0xff26,
  WAVE_RAM: 0xff30,
} as const;
