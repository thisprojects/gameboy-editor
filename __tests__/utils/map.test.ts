import {
  createEmptyMap, createBlankTile, createSolidTile, tilesFromPixels, trimTiles, encodeTiles,
  isValidTile, isValidTileset, clampMap, maxUsedIndex, cropMap, mapBytes,
} from '@/utils/map';
import { exportMapRGBDS, exportMapC } from '@/utils/mapExport';
import { createEmptyPixels } from '@/utils/drawing';

describe('map utils', () => {
  it('creates a 32x32 map and blank/solid tiles', () => {
    const m = createEmptyMap();
    expect(m).toHaveLength(32);
    expect(m[0]).toHaveLength(32);
    expect(createBlankTile().flat().every((v) => v === 0)).toBe(true);
    expect(createSolidTile(2).flat().every((v) => v === 2)).toBe(true);
  });

  it('splits pixels into tiles row-major', () => {
    const px = createEmptyPixels(16, 8);
    px[0][8] = 3; // first pixel of tile 1
    const tiles = tilesFromPixels(px, 2, 1);
    expect(tiles).toHaveLength(2);
    expect(tiles[0][0][0]).toBe(0);
    expect(tiles[1][0][0]).toBe(3);
    expect(tilesFromPixels([[1]], 1, 1)[0][7][7]).toBe(0); // missing pixels default to 0
  });

  it('trims trailing blank tiles but keeps one', () => {
    const solid = createSolidTile(1);
    expect(trimTiles([solid, createBlankTile(), createBlankTile()])).toHaveLength(1);
    expect(trimTiles([createBlankTile(), solid])).toHaveLength(2);
    expect(trimTiles([createBlankTile(), createBlankTile()])).toHaveLength(1);
  });

  it('encodes tiles as 2bpp', () => {
    const bytes = encodeTiles([createSolidTile(3), createBlankTile()]);
    expect(bytes).toHaveLength(32);
    expect(Array.from(bytes.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(bytes.slice(16).every((b) => b === 0)).toBe(true);
  });

  it('validates tiles and tilesets', () => {
    expect(isValidTile(createBlankTile())).toBe(true);
    expect(isValidTile([[0]])).toBe(false);
    expect(isValidTile(createSolidTile(4))).toBe(false);
    expect(isValidTile(null)).toBe(false);
    expect(isValidTileset([createBlankTile()])).toBe(true);
    expect(isValidTileset([])).toBe(false);
    expect(isValidTileset(Array(257).fill(createBlankTile()))).toBe(false);
    expect(isValidTileset('x')).toBe(false);
  });

  it('clamps map entries and finds the max index', () => {
    const m = createEmptyMap();
    m[0][0] = 5;
    m[1][1] = 2;
    expect(maxUsedIndex(m)).toBe(5);
    const c = clampMap(m, 3);
    expect(c[0][0]).toBe(0);
    expect(c[1][1]).toBe(2);
  });

  describe('cropMap', () => {
    const m = createEmptyMap();
    m.forEach((row, y) => row.forEach((_, x) => (m[y][x] = 0)));
    m[3][4] = 7;
    m[5][6] = 9;

    it('full returns a copy', () => {
      const c = cropMap(m, 'full');
      expect(c).toHaveLength(32);
      expect(c).not.toBe(m);
      expect(c[3][4]).toBe(7);
    });

    it('viewport is 20x18 at the scroll position and wraps', () => {
      const v = cropMap(m, 'viewport', 4, 3);
      expect(v).toHaveLength(18);
      expect(v[0]).toHaveLength(20);
      expect(v[0][0]).toBe(7);
      const w = createEmptyMap();
      w[0][0] = 4;
      expect(cropMap(w, 'viewport', 31, 31)[1][1]).toBe(4); // wrapped
    });

    it('used area is the bounding box of non-zero tiles', () => {
      const u = cropMap(m, 'used');
      expect(u).toHaveLength(3);
      expect(u[0]).toHaveLength(3);
      expect(u[0][0]).toBe(7);
      expect(u[2][2]).toBe(9);
    });

    it('a map of nothing but tile 0 has no box to crop to, so all of it is exported (not a 1x1 map)', () => {
      const c = cropMap(createEmptyMap(), 'used');
      expect(c).toHaveLength(32);
      expect(c[0]).toHaveLength(32);
    });

    it('treats tile 0 as empty even when it is drawn: cells that are not tile 0 set the box', () => {
      const m = createEmptyMap();
      m[10][12] = 3;
      expect(cropMap(m, 'used')).toEqual([[3]]);
    });
  });

  it('flattens the map to bytes row-major', () => {
    expect(Array.from(mapBytes([[1, 2], [3, 4]]))).toEqual([1, 2, 3, 4]);
  });
});

describe('map export', () => {
  const tileData = encodeTiles([createBlankTile(), createSolidTile(3)]);
  const map = [[0, 1], [1, 255]];

  it('writes RGBDS', () => {
    const out = exportMapRGBDS('level 1', { map, tileData });
    expect(out).toContain('DEF LEVEL_1_TILE_COUNT EQU 2');
    expect(out).toContain('DEF LEVEL_1_MAP_WIDTH EQU 2');
    expect(out).toContain('DEF LEVEL_1_MAP_HEIGHT EQU 2');
    expect(out).toContain('level_1_tiles::');
    expect(out).toContain('db $FF, $FF'); // solid tile
    expect(out).toContain('level_1_map::');
    expect(out).toContain('db $01, $FF ; row 1');
  });

  it('writes C with no trailing commas on the final rows', () => {
    const out = exportMapC('level', { map, tileData });
    expect(out).toContain('#define LEVEL_MAP_WIDTH 2');
    expect(out).toContain('set_bkg_tiles(0, 0, LEVEL_MAP_WIDTH, LEVEL_MAP_HEIGHT, level_map);');
    expect(out).toContain('    0x00,0x01,\n    0x01,0xFF\n};');
    expect(out).toMatch(/0x00, \/\/ tile 0/);
    expect(out).toMatch(/0xFF \/\/ tile 1/); // no trailing comma on the last tile
  });
});
