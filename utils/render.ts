import { PalettePreset, TILE_SIZE } from '@/constants';
import { Tile } from '@/types/map';

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Render a tile to an 8x8 offscreen canvas (1 screen px per tile px) for fast scaled drawing. */
export function renderTileCanvas(tile: Tile, preset: PalettePreset): HTMLCanvasElement {
  const canvas = makeCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      ctx.fillStyle = preset.colours[tile[y][x]];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Render a metatile (grid of tile indices) to an offscreen canvas of (size*8)^2 pixels. */
export function renderMetatileCanvas(grid: number[][], tiles: Tile[], preset: PalettePreset): HTMLCanvasElement {
  const size = grid.length;
  const canvas = makeCanvas(size * TILE_SIZE, size * TILE_SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  grid.forEach((row, ty) =>
    row.forEach((index, tx) => {
      const tile = tiles[index] ?? tiles[0];
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          ctx.fillStyle = preset.colours[tile[y][x]];
          ctx.fillRect(tx * TILE_SIZE + x, ty * TILE_SIZE + y, 1, 1);
        }
      }
    })
  );
  return canvas;
}
