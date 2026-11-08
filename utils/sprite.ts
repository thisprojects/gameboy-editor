import { ObjSize } from '@/constants/sprite';
import { encodeTile, isTileEmpty } from '@/utils/encode';

interface OamEntry {
  /** Pixel offset from the sprite origin */
  dx: number;
  dy: number;
  /** Tile index local to the frame's tile data */
  tile: number;
}

export interface FrameLayout {
  entries: OamEntry[];
  /** 2bpp data for the frame's non-empty tiles, in entry order */
  data: Uint8Array;
}

/**
 * Split a frame into hardware sprites. In 8x8 mode each non-empty tile is one OAM entry.
 * In 8x16 mode each non-empty 8x16 cell is one entry whose two tiles are consecutive (top, bottom).
 */
export function layoutFrame(pixels: number[][], tilesWidth: number, tilesHeight: number, objSize: ObjSize): FrameLayout {
  const unit = objSize === '8x16' ? 2 : 1;
  const entries: OamEntry[] = [];
  const bytes: number[] = [];
  let tile = 0;
  for (let uy = 0; uy < Math.floor(tilesHeight / unit); uy++) {
    for (let ux = 0; ux < tilesWidth; ux++) {
      const ty = uy * unit;
      let empty = true;
      for (let k = 0; k < unit; k++) if (!isTileEmpty(pixels, ux, ty + k)) empty = false;
      if (empty) continue;
      entries.push({ dx: ux * 8, dy: ty * 8, tile });
      for (let k = 0; k < unit; k++) bytes.push(...encodeTile(pixels, ux, ty + k));
      tile += unit;
    }
  }
  return { entries, data: Uint8Array.from(bytes) };
}

export interface SpriteLayout {
  frames: FrameLayout[];
  /** Tile index of each frame's first tile in the combined tile data */
  baseTiles: number[];
  /** All frames' tile data concatenated */
  data: Uint8Array;
  tileCount: number;
}

export function layoutSprite(frames: { pixels: number[][] }[], tilesWidth: number, tilesHeight: number, objSize: ObjSize): SpriteLayout {
  const layouts = frames.map((f) => layoutFrame(f.pixels, tilesWidth, tilesHeight, objSize));
  const baseTiles: number[] = [];
  let base = 0;
  for (const l of layouts) {
    baseTiles.push(base);
    base += l.data.length / 16;
  }
  const data = new Uint8Array(layouts.reduce((n, l) => n + l.data.length, 0));
  let off = 0;
  for (const l of layouts) {
    data.set(l.data, off);
    off += l.data.length;
  }
  return { frames: layouts, baseTiles, data, tileCount: base };
}

/** OAM attribute byte: bit7 = BG priority, bit4 = palette (OBP1). */
export function oamAttr(palette: 0 | 1, priority: boolean): number {
  return (priority ? 0x80 : 0) | (palette ? 0x10 : 0);
}
