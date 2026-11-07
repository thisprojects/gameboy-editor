import { fillRectGrid, resizeGrid } from '@/utils/grid';
import {
  createMetatile, defaultLibrary, resizeMetatile, clampMetatiles, isValidLibrary, isValidLevelMap, metatileBytes,
  collisionBytes, maxTileIndex, expandMap, maxMetatileIndex,
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
    const m = createMetatile(4, 2, true);
    expect(m.tiles).toHaveLength(4);
    expect(m.tiles.flat().every((t) => t === 2)).toBe(true);
    expect(m.solid).toBe(true);
    const lib = defaultLibrary();
    expect(lib.size).toBe(2);
    expect(lib.tiles).toHaveLength(2);
    expect(lib.metatiles.map((x) => x.solid)).toEqual([false, true]);
    expect(isValidLibrary(lib.size, lib.tiles, lib.metatiles)).toBe(true);
  });

  it('resizes a metatile keeping the top-left', () => {
    const m = { tiles: [[1, 2], [3, 4]], solid: true };
    expect(resizeMetatile(m, 4).tiles[1]).toEqual([3, 4, 0, 0]);
    expect(resizeMetatile(m, 4).solid).toBe(true);
    expect(resizeMetatile(resizeMetatile(m, 4), 2).tiles).toEqual(m.tiles);
  });

  it('clamps tile references', () => {
    const c = clampMetatiles([{ tiles: [[0, 5], [1, 9]], solid: false }], 3);
    expect(c[0].tiles).toEqual([[0, 0], [1, 0]]);
  });

  describe('isValidLibrary', () => {
    const tiles = [createBlankTile(), createSolidTile(1)];
    const ok = [createMetatile(2)];
    it('accepts a valid library', () => expect(isValidLibrary(2, tiles, ok)).toBe(true));
    it.each([
      ['bad size', 3, tiles, ok],
      ['non-number size', '2', tiles, ok],
      ['bad tileset', 2, [], ok],
      ['no metatiles', 2, tiles, []],
      ['too many metatiles', 2, tiles, Array(257).fill(createMetatile(2))],
      ['not an array', 2, tiles, 'x'],
      ['missing solid', 2, tiles, [{ tiles: [[0, 0], [0, 0]] }]],
      ['wrong grid height', 2, tiles, [{ tiles: [[0, 0]], solid: false }]],
      ['wrong row width', 2, tiles, [{ tiles: [[0], [0, 0]], solid: false }]],
      ['index out of range', 2, tiles, [{ tiles: [[0, 5], [0, 0]], solid: false }]],
      ['null metatile', 2, tiles, [null]],
    ])('rejects %s', (_n, size, t, m) => expect(isValidLibrary(size, t, m)).toBe(false));
  });

  describe('isValidLevelMap', () => {
    it('accepts a rectangular map within limits', () => {
      expect(isValidLevelMap([[0, 1], [1, 0]], 2, 2)).toBe(true);
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
    ])('rejects %s', (_n, map) => expect(isValidLevelMap(map, 2, 2)).toBe(false));
    it('limits depend on the metatile size', () => {
      expect(maxLevelMetatiles(2)).toBe(128);
      expect(maxLevelMetatiles(4)).toBe(64);
      expect(isValidLevelMap([Array(65).fill(0)], 4, 1)).toBe(false);
      expect(isValidLevelMap([Array(64).fill(0)], 4, 1)).toBe(true);
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
  const lib = { tileData, metatiles, size: 2 };
  const level = { ...lib, map: [[0, 1, 1], [1, 0, 0]] };

  it('writes the metatile library as RGBDS', () => {
    const out = exportMetatilesRGBDS('my set', lib);
    expect(out).toContain('DEF MY_SET_TILE_COUNT EQU 2');
    expect(out).toContain('DEF MY_SET_METATILE_COUNT EQU 2');
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
