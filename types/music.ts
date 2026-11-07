export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export const NOTE_OFF = 'OFF';

export interface MusicCell {
  note: NoteName | typeof NOTE_OFF | null; // null = no event this row
  octave: number; // 2-7
  instrument: number | null; // index into instruments[]
  /** Initial envelope volume 0-15 for pulse/noise (null = instrument default); ignored on the wave channel */
  volume: number | null;
}

export interface MusicPattern {
  id: string;
  name: string;
  rows: number;
  cells: MusicCell[][]; // cells[channel][row], 4 channels
}

export type InstrumentKind = 'pulse' | 'wave' | 'noise';

/** One flat shape for all kinds; fields that do not apply to a kind are ignored. */
export interface MusicInstrument {
  id: string;
  name: string;
  kind: InstrumentKind;
  // pulse
  duty: number; // 0=12.5% 1=25% 2=50% 3=75%
  sweepPeriod: number; // 0-7 (0 = off); channel 1 only
  sweepDirection: 'up' | 'down';
  sweepShift: number; // 0-7
  // pulse + noise: hardware volume envelope
  envVolume: number; // initial volume 0-15
  envDirection: 'down' | 'up';
  envPeriod: number; // 0-7 (0 = constant volume)
  // wave
  wave: number[]; // 32 samples, 0-15
  waveLevel: number; // 1=100% 2=50% 3=25%
  // noise
  noiseWidth: 0 | 1; // 1 = 7-bit "metallic" LFSR
}

export interface MusicProjectData {
  version: 1;
  type: 'music';
  patterns: MusicPattern[];
  instruments: MusicInstrument[];
  orderList: number[]; // sequence of pattern indices
  ticksPerRow: number; // frames (1/60 s) per pattern row
}

/** A write to a sound register: address is the full 16-bit address (0xFF10-0xFF3F). */
export interface RegWrite {
  addr: number;
  value: number;
}
