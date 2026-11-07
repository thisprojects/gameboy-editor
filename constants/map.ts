export const MAP_SIZE = 32; // hardware BG map is 32x32 tiles
export const MAX_MAP_TILES = 256; // a tile index is one byte
export const DEFAULT_MAP_ZOOM = 3;

/** Default BGP register values (colour index i shows shade (reg >> 2i) & 3). */
export const BGP_PRESETS = [
  { name: 'BGP $E4 (normal)', value: 0xe4 },
  { name: 'BGP $1B (inverted)', value: 0x1b },
  { name: 'BGP $F9 (dark)', value: 0xf9 },
];

export type ExportArea = 'full' | 'viewport' | 'used';
