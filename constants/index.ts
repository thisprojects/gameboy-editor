/** Game Boy (DMG) hardware constants. */
export const TILE_SIZE = 8;
export const SCREEN_WIDTH = 160;
export const SCREEN_HEIGHT = 144;
export const SCREEN_TILES_X = 20;
export const SCREEN_TILES_Y = 18;
export const BG_MAP_TILES = 32; // 32x32 tile background map
export const MAX_TILES = 384; // VRAM tile capacity
export const MAX_SPRITES = 40; // OAM entries
export const SHADES = 4; // 2bpp
export const BYTES_PER_TILE = 16;

// Tile editor defaults
export const DEFAULT_TILES_WIDTH = 4;
export const DEFAULT_TILES_HEIGHT = 4;
export const MAX_TILES_WIDTH = 20;
export const DEFAULT_PIXEL_SIZE = 16;

export interface PalettePreset {
  name: string;
  /** Hex colours for shade 0 (lightest) .. 3 (darkest). */
  colours: [string, string, string, string];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { name: 'Classic Green', colours: ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'] },
  { name: 'Grey', colours: ['#ffffff', '#aaaaaa', '#555555', '#000000'] },
  { name: 'Pocket', colours: ['#c4cfa1', '#8b956d', '#4d533c', '#1f1f1f'] },
];

export function getShadeHex(shade: number, preset: PalettePreset = PALETTE_PRESETS[0]): string {
  return preset.colours[shade];
}
