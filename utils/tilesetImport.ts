import { TILE_SIZE } from '@/constants';
import { MAX_TILES, MAX_TILES_WIDTH } from '@/constants';
import { MAX_MAP_TILES } from '@/constants/map';
import { isShade } from '@/utils/validate';
import { Tile } from '@/types/map';
import { decodeTileset } from '@/utils/encode';
import { isValidTileset, tilesFromPixels, trimTiles } from '@/utils/map';

/**
 * Read a tileset from a tile editor project (.json) or raw .2bpp file.
 * Trailing blank tiles are trimmed; on success `onTiles` receives 1..256 tiles, otherwise an alert explains why.
 */
export function readTilesetFile(file: File, onTiles: (tiles: Tile[]) => void): void {
  const reader = new FileReader();
  const apply = (imported: Tile[]) => {
    const trimmed = trimTiles(imported);
    if (trimmed.length > MAX_MAP_TILES) {
      alert(`Tileset has ${trimmed.length} tiles; at most ${MAX_MAP_TILES} can be addressed.`);
      return;
    }
    onTiles(trimmed);
  };

  if (/\.2bpp$/i.test(file.name)) {
    reader.onload = (ev) => {
      const decoded = decodeTileset(new Uint8Array(ev.target?.result as ArrayBuffer), 16);
      if (!decoded) {
        alert('Invalid .2bpp file: size must be a non-zero multiple of 16 bytes.');
        return;
      }
      apply(tilesFromPixels(decoded.pixels, decoded.tilesWidth, decoded.tilesHeight));
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  reader.onload = (ev) => {
    try {
      const d = JSON.parse(ev.target?.result as string);
      const ok =
        d?.type === 'tileset' &&
        Number.isInteger(d.tilesWidth) &&
        Number.isInteger(d.tilesHeight) &&
        d.tilesWidth >= 1 &&
        d.tilesWidth <= MAX_TILES_WIDTH &&
        d.tilesHeight >= 1 &&
        d.tilesWidth * d.tilesHeight <= MAX_TILES && // checked before anything is built from the declared size
        Array.isArray(d.pixels) &&
        d.pixels.length === d.tilesHeight * TILE_SIZE &&
        d.pixels.every((r: unknown) => Array.isArray(r) && r.length === d.tilesWidth * TILE_SIZE && r.every(isShade));
      if (!ok) {
        alert('Invalid file: not a Game Boy tileset project (or its size or shades are out of range).');
        return;
      }
      const imported = tilesFromPixels(d.pixels, d.tilesWidth, d.tilesHeight);
      if (!isValidTileset(trimTiles(imported).slice(0, MAX_MAP_TILES))) {
        alert('Invalid tileset: shades must be 0-3.');
        return;
      }
      apply(imported);
    } catch {
      alert('Failed to import tileset: invalid JSON.');
    }
  };
  reader.readAsText(file);
}
