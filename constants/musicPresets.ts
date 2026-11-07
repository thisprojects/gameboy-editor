import { MusicInstrument } from '@/types/music';

export type PresetInstrument = Omit<MusicInstrument, 'id'>;

const base: Omit<PresetInstrument, 'name' | 'kind'> = {
  duty: 2,
  sweepPeriod: 0,
  sweepDirection: 'down',
  sweepShift: 0,
  envVolume: 15,
  envDirection: 'down',
  envPeriod: 0,
  wave: Array(32).fill(0),
  waveLevel: 1,
  noiseWidth: 0,
};

export const triangleWave = (): number[] => Array.from({ length: 32 }, (_, i) => (i < 16 ? i : 31 - i));
export const sawWave = (): number[] => Array.from({ length: 32 }, (_, i) => Math.floor(i / 2));
export const squareWave = (): number[] => Array.from({ length: 32 }, (_, i) => (i < 16 ? 15 : 0));
export const sineWave = (): number[] =>
  Array.from({ length: 32 }, (_, i) => Math.round(7.5 + 7.5 * Math.sin((i / 32) * Math.PI * 2)));

export const PRESET_INSTRUMENTS: PresetInstrument[] = [
  { ...base, name: 'Lead 50%', kind: 'pulse', duty: 2 },
  { ...base, name: 'Lead 25%', kind: 'pulse', duty: 1 },
  { ...base, name: 'Pluck', kind: 'pulse', duty: 2, envPeriod: 2 },
  { ...base, name: 'Zap', kind: 'pulse', duty: 2, sweepPeriod: 3, sweepDirection: 'down', sweepShift: 2, envPeriod: 3 },
  { ...base, name: 'Wave Bass', kind: 'wave', wave: triangleWave(), waveLevel: 1 },
  { ...base, name: 'Wave Saw', kind: 'wave', wave: sawWave(), waveLevel: 2 },
  { ...base, name: 'Hi-hat', kind: 'noise', envVolume: 9, envPeriod: 1 },
  { ...base, name: 'Snare', kind: 'noise', envVolume: 15, envPeriod: 2 },
  { ...base, name: 'Kick', kind: 'noise', envVolume: 15, envPeriod: 3, noiseWidth: 1 },
];
