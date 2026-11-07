import { PalettePreset } from '@/constants';

export const MAX_FRAMES = 32;
export const MAX_SPRITE_TILES_DIM = 4; // up to 32x32 px per sprite
export const DEFAULT_FRAME_TICKS = 6; // 1/60 s units
export const MAX_FRAME_TICKS = 255;

export type ObjSize = '8x8' | '8x16';

/** Default OBP0/OBP1 register values: colour index i shows shade (reg >> 2i) & 3. */
export const OBP_PRESETS = [
  { name: 'OBP0 ($E4 normal)', value: 0xe4 },
  { name: 'OBP1 ($1B inverted)', value: 0x1b },
];

/** Apply a palette register (BGP/OBPx) to a preset so colour index i displays as shade (reg >> 2i) & 3. */
export function applyPaletteRegister(preset: PalettePreset, reg: number): PalettePreset {
  const colours = [0, 1, 2, 3].map((i) => preset.colours[(reg >> (i * 2)) & 3]) as PalettePreset['colours'];
  return { name: preset.name, colours };
}
