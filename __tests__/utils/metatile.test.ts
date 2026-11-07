import { fillRectGrid, resizeGrid } from '@/utils/grid';
import {
  createMetatile, defaultLibrary, resizeMetatile, clampMetatiles, isValidLibrary, isValidLevelMap, metatileBytes,
  collisionBytes, maxTileIndex, expandMap, maxMetatileIndex, readDims, dimsFields,
} from '@/utils/metatile';
import { renderTileCanvas, renderMetatileCanvas } from '@/utils/render';
import { exportMetatilesRGBDS, exportMetatilesC, exportLevelRGBDS, exportLevelC } from '@/utils/levelExport';
import { createBlankTile, createSolidTile, encodeTiles } from '@/utils/map';
import { PALETTE_PRESETS } from '@/constants';
import { maxLevelMetatiles } from '@/constants/level';

describe('grid utils', () => {
  it('fills a rectangle in any corner order and clips to the grid', () => {
    const g = resizeGrid([], 4, 4);
    const r = fillRectGrid(g, { x: 2, y: 2 }, { x: 0, y: 1 }, 5);
    expect(r[1].slice(0, 3)).toEqual([5, 5, 5]);
    expect(r[2].slice(0, 3)).toEqual([5, 5, 5]);
    expect(r[0].every((v) => v === 0)).toBe(true);
    expect(g[1][0]).toBe(0); // input untouched
    expect(fillRectGrid(g, { x: 3, y: 3 }, { x: 9, y: 9 }, 1)[3][3]).toBe(1);
  });

  it('resizes keeping top-left content and filling with the given value', () => {
    const g = [[1, 2], [3, 4]];
    expect(resizeGrid(g, 3, 1)).toEqual([[1, 2, 0]]);
    expect(resizeGrid(g, 3, 3, 9)).toEqual([[1, 2, 9], [3, 4, 9], [9, 9, 9]]);
  });
});

describe('metatile utils', () => {
  it('creates metatiles and a default library', () => {
    const m = createMetatile(4, 1, 2, true);
    expect(m.tiles).toHaveLength(1);
    expect(m.tiles[0]).toHaveLength(4);
    expect(m.tiles.flat().every((t) => t === 2)).toBe(true);
    expect(m.solid).toBe(true);
    const lib = defaultLibrary();
    expect([lib.mw, lib.mh]).toEqual([2, 2]);
    expect(lib.tiles).toHaveLength(2);
    expect(lib.metatiles.map((x) => x.solid)).toEqual([false, true]);
    expect(isValidLibrary({ mw: lib.mw, mh: lib.mh }, lib.tiles, lib.metatiles)).toBe(true);
  });

  it('resizes a metatile keeping the top-left', () => {
    const m = { tiles: [[1, 2], [3, 4]], solid: true };
    expect(resizeMetatile(m, 4, 2).tiles[1]).toEqual([3, 4, 0, 0]);
    expect(resizeMetatile(m, 4, 2).solid).toBe(true);
    expect(resizeMetatile(resizeMetatile(m, 4, 2), 2, 2).tiles).toEqual(m.tiles);
    expect(resizeMetatile(m, 1, 4).tiles).toEqual([[1], [3], [0], [0]]);
  });

  it('clamps tile references', () => {
    const c = clampMetatiles([{ tiles: [[0, 5], [1, 9]], solid: false }], 3);
    expect(c[0].tiles).toEqual([[0, 0], [1, 0]]);
  });

  describe('isValidLibrary', () => {
    const tiles = [createBlankTile(), createSolidTile(1)];
    const ok = [createMetatile(2, 2)];
    const sq = { mw: 2, mh: 2 };
    it('accepts a valid library', () => expect(isValidLibrary(sq, tiles, ok)).toBe(true));
    it('accepts any width x height', () => {
      expect(isValidLibrary({ mw: 1, mh: 4 }, tiles, [createMetatile(1, 4)])).toBe(true);
      expect(isValidLibrary({ mw: 3, mh: 1 }, tiles, [createMetatile(3, 1)])).toBe(true);
      expect(isValidLibrary({ mw: 1, mh: 4 }, tiles, [createMetatile(4, 1)])).toBe(false);
    });
    it.each([
      ['no dimensions', null, tiles, ok],
      ['bad tileset', sq, [], ok],
      ['no metatiles', sq, tiles, []],
      ['too many metatiles', sq, tiles, Array(257).fill(createMetatile(2, 2))],
      ['not an array', sq, tiles, 'x'],
      ['missing solid', sq, tiles, [{ tiles: [[0, 0], [0, 0]] }]],
      ['wrong grid height', sq, tiles, [{ tiles: [[0, 0]], solid: false }]],
      ['wrong row width', sq, tiles, [{ tiles: [[0], [0, 0]], solid: false }]],
      ['index out of range', sq, tiles, [{ tiles: [[0, 5], [0, 0]], solid: false }]],
      ['null metatile', sq, tiles, [null]],
    ])('rejects %s', (_n, dims, t, m) => expect(isValidLibrary(dims, t, m)).toBe(false));
  });

  describe('isValidLevelMap', () => {
    it('accepts a rectangular map within limits', () => {
      expect(isValidLevelMap([[0, 1], [1, 0]], { mw: 2, mh: 2 }, 2)).toBe(true);
    });
    it.each([
      ['not an array', 'x'],
      ['empty', []],
      ['ragged', [[0, 0], [0]]],
      ['out of range index', [[0, 5]]],
      ['non-array row', [0, 1]],
      ['too wide', [Array(129).fill(0)]],
      ['too tall', Array(129).fill([0])],
      ['empty row', [[]]],
    ])('rejects %s', (_n, map) => expect(isValidLevelMap(map, { mw: 2, mh: 2 }, 2)).toBe(false));
    it('limits depend on the metatile size', () => {
      expect(maxLevelMetatiles(2)).toBe(128);
      expect(maxLevelMetatiles(4)).toBe(64);
      const sq4 = { mw: 4, mh: 4 };
      expect(isValidLevelMap([Array(65).fill(0)], sq4, 1)).toBe(false);
      expect(isValidLevelMap([Array(64).fill(0)], sq4, 1)).toBe(true);
      // each axis has its own limit: a 1-wide, 8-high metatile allows 256 across but only 32 down
      const tall = { mw: 1, mh: 8 };
      expect(isValidLevelMap([Array(256).fill(0)], tall, 1)).toBe(true);
      expect(isValidLevelMap(Array.from({ length: 33 }, () => [0]), tall, 1)).toBe(false);
      expect(isValidLevelMap(Array.from({ length: 32 }, () => [0]), tall, 1)).toBe(true);
    });
  });

  it('builds metatile and collision tables', () => {
    const list = [{ tiles: [[1, 2], [3, 4]], solid: false }, { tiles: [[5, 6], [7, 8]], solid: true }];
    expect(Array.from(metatileBytes(list))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(Array.from(collisionBytes(list))).toEqual([0, 1]);
    expect(maxTileIndex(list)).toBe(8);
    expect(maxMetatileIndex([[0, 3], [2, 1]])).toBe(3);
  });

  it('expands a metatile map to a tile map', () => {
    const list = [{ tiles: [[1, 2], [3, 4]], solid: false }, { tiles: [[5, 6], [7, 8]], solid: false }];
    expect(expandMap([[0, 1]], list, 2)).toEqual([[1, 2, 5, 6], [3, 4, 7, 8]]);
    expect(expandMap([[1], [0]], list, 2)).toEqual([[5, 6], [7, 8], [1, 2], [3, 4]]);
  });
});

describe('render helpers', () => {
  it('renders tile and metatile canvases at pixel scale', () => {
    const t = renderTileCanvas(createSolidTile(2), PALETTE_PRESETS[0]);
    expect(t.width).toBe(8);
    expect(t.height).toBe(8);
    const m = renderMetatileCanvas([[0, 1], [1, 5]], [createBlankTile(), createSolidTile(3)], PALETTE_PRESETS[0]);
    expect(m.width).toBe(16); // index 5 is missing -> falls back to tile 0
    const m4 = renderMetatileCanvas(resizeGrid([], 4, 4), [createBlankTile()], PALETTE_PRESETS[0]);
    expect(m4.width).toBe(32);
  });

  it('tolerates a missing 2d context', () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as never;
    expect(renderTileCanvas(createBlankTile(), PALETTE_PRESETS[0]).width).toBe(8);
    expect(renderMetatileCanvas([[0]], [createBlankTile()], PALETTE_PRESETS[0]).width).toBe(8);
    HTMLCanvasElement.prototype.getContext = original;
  });
});

describe('level export', () => {
  const metatiles = [{ tiles: [[0, 1], [1, 0]], solid: false }, { tiles: [[1, 1], [1, 1]], solid: true }];
  const tileData = encodeTiles([createBlankTile(), createSolidTile(3)]);
  const lib = { tileData, metatiles, mw: 2, mh: 2 };
  const level = { ...lib, map: [[0, 1, 1], [1, 0, 0]] };

  it('writes the metatile library as RGBDS', () => {
    const out = exportMetatilesRGBDS('my set', lib);
    expect(out).toContain('DEF MY_SET_TILE_COUNT EQU 2');
    expect(out).toContain('DEF MY_SET_METATILE_COUNT EQU 2');
    expect(out).toContain('DEF MY_SET_METATILE_WIDTH EQU 2');
    expect(out).toContain('DEF MY_SET_METATILE_HEIGHT EQU 2');
    expect(out).toContain('DEF MY_SET_METATILE_SIZE EQU 2');
    expect(out).toContain('my_set_tiles::');
    expect(out).toContain('my_set_metatiles::');
    expect(out).toContain('db $00, $01, $01, $00 ; metatile 0');
    expect(out).toContain('my_set_collision::\n    db $00, $01');
    expect(out).not.toContain('_map::');
  });

  it('writes the level as RGBDS', () => {
    const out = exportLevelRGBDS('lvl', level);
    expect(out).toContain('DEF LVL_WIDTH EQU 3');
    expect(out).toContain('DEF LVL_HEIGHT EQU 2');
    expect(out).toContain('3x2 metatile level (6x4 tiles)');
    expect(out).toContain('lvl_map::');
    expect(out).toContain('db $00, $01, $01 ; row 0');
    expect(out).toContain('db $01, $00, $00 ; row 1');
    expect(out).toContain('lvl_map_end::');
  });

  it('writes the library as C', () => {
    const out = exportMetatilesC('set', lib);
    expect(out).toContain('#define SET_METATILE_WIDTH 2');
    expect(out).toContain('#define SET_METATILE_HEIGHT 2');
    expect(out).toContain('#define SET_METATILE_SIZE 2');
    expect(out).toContain('const unsigned char set_metatiles[] = {');
    expect(out).toContain('0x00,0x01,0x01,0x00, // metatile 0');
    expect(out).toMatch(/0x01,0x01,0x01,0x01 \/\/ metatile 1\n};/); // no trailing comma
    expect(out).toContain('set_collision[] = { 0, 1 };');
    expect(out).toMatch(/0xFF \/\/ tile 1/);
  });

  it('writes the level as C', () => {
    const out = exportLevelC('lvl', level);
    expect(out).toContain('#define LVL_WIDTH 3');
    expect(out).toContain('#define LVL_HEIGHT 2');
    expect(out).toContain('    0x00,0x01,0x01,\n    0x01,0x00,0x00\n};');
    expect(out).toContain('lvl_collision[]');
  });
});

describe('free-form metatile dimensions', () => {
  it('reads square (size) and rectangular (metatileWidth/Height) project dimensions', () => {
    expect(readDims({ size: 2 })).toEqual({ mw: 2, mh: 2 });
    expect(readDims({ metatileWidth: 1, metatileHeight: 4 })).toEqual({ mw: 1, mh: 4 });
    expect(readDims({ size: 16 })).toEqual({ mw: 16, mh: 16 });
  });
  it('rejects bad dimensions', () => {
    for (const d of [null, undefined, {}, { size: 0 }, { size: 17 }, { size: 1.5 }, { size: '2' }, { metatileWidth: 2 }, { metatileWidth: 2, metatileHeight: 99 }]) {
      expect(readDims(d as never)).toBeNull();
    }
  });
  it('writes size for square and width/height otherwise', () => {
    expect(dimsFields({ mw: 2, mh: 2 })).toEqual({ size: 2 });
    expect(dimsFields({ mw: 1, mh: 4 })).toEqual({ metatileWidth: 1, metatileHeight: 4 });
  });
  it('exports a 1x4 floor metatile with its width and height', () => {
    const metatiles = [{ tiles: [[0], [1], [1], [0]], solid: true }];
    const tileData = encodeTiles([createBlankTile(), createSolidTile(3)]);
    const rgbds = exportLevelRGBDS('floor', { tileData, metatiles, mw: 1, mh: 4, map: [[0, 0, 0]] });
    expect(rgbds).toContain('DEF FLOOR_METATILE_WIDTH EQU 1');
    expect(rgbds).toContain('DEF FLOOR_METATILE_HEIGHT EQU 4');
    expect(rgbds).not.toContain('METATILE_SIZE');
    expect(rgbds).toContain('3x1 metatile level (3x4 tiles)');
    expect(rgbds).toContain('db $00, $01, $01, $00 ; metatile 0');
    expect(exportLevelC('floor', { tileData, metatiles, mw: 1, mh: 4, map: [[0]] })).toContain('#define FLOOR_METATILE_HEIGHT 4');
    // expanded map: one metatile column becomes 4 rows
    expect(expandMap([[0, 0]], metatiles, 4)).toEqual([[0, 0], [1, 1], [1, 1], [0, 0]]);
  });
});
