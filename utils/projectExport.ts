import { cropMap, encodeTiles, maxUsedIndex } from '@/utils/map';
import { countUsedTiles, encodeTileset } from '@/utils/encode';
import { exportTilesRGBDS } from '@/utils/export';
import { layoutSprite } from '@/utils/sprite';
import { exportSpriteRGBDS } from '@/utils/spriteExport';
import { exportMapRGBDS } from '@/utils/mapExport';
import { encodeGlyphs } from '@/utils/font';
import { exportFontRGBDS } from '@/utils/fontExport';
import { exportLevelRGBDS, exportMetatilesRGBDS } from '@/utils/levelExport';
import { maxTileIndex } from '@/utils/metatile';
import { exportMusicRGBDS } from '@/utils/musicExport';

/**
 * Export a saved editor project (the parsed .json file) to RGBDS source, the same way the editor's
 * "Export RGBDS" button does. `name` is the file name without extension. The map is exported in full.
 * Returns null for an unknown project type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportProjectRGBDS(project: any, name: string): string | null {
  switch (project?.type) {
    case 'tileset': {
      const count = countUsedTiles(project.pixels, project.tilesWidth, project.tilesHeight);
      return exportTilesRGBDS(name, encodeTileset(project.pixels, project.tilesWidth, count));
    }
    case 'sprite': {
      const layout = layoutSprite(project.frames, project.tilesWidth, project.tilesHeight, project.objSize);
      return exportSpriteRGBDS(name, {
        layout,
        durations: project.frames.map((f: { duration: number }) => f.duration),
        palette: project.palette,
        priority: project.priority,
      });
    }
    case 'map': {
      const map = cropMap(project.map, 'full');
      return exportMapRGBDS(name, { map, tileData: encodeTiles(project.tiles.slice(0, maxUsedIndex(map) + 1)) });
    }
    case 'font':
      return exportFontRGBDS(name, encodeGlyphs(project.glyphs));
    case 'metatiles':
      return exportMetatilesRGBDS(name, {
        size: project.size,
        metatiles: project.metatiles,
        tileData: encodeTiles(project.tiles.slice(0, maxTileIndex(project.metatiles) + 1)),
      });
    case 'level':
      return exportLevelRGBDS(name, {
        size: project.size,
        metatiles: project.metatiles,
        map: project.map,
        tileData: encodeTiles(project.tiles.slice(0, maxTileIndex(project.metatiles) + 1)),
      });
    case 'music':
      return exportMusicRGBDS(name, project);
    default:
      return null;
  }
}
