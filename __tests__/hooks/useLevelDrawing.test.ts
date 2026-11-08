import { renderHook, act } from '@testing-library/react';
import { useLevelDrawing } from '@/hooks/useLevelDrawing';
import { createBlankTile, createSolidTile } from '@/utils/map';
import { createMetatile } from '@/utils/metatile';

const lib3 = (mw = 2, mh = mw) => ({
  mw,
  mh,
  tiles: [createBlankTile(), createSolidTile(3)],
  metatiles: [createMetatile(mw, mh, 0), createMetatile(mw, mh, 1, true), createMetatile(mw, mh, 1)],
});

describe('useLevelDrawing', () => {
  it('starts with a 16x16 empty level and the default library', () => {
    const { result } = renderHook(() => useLevelDrawing());
    expect(result.current.width).toBe(16);
    expect(result.current.height).toBe(16);
    expect(result.current.metatiles).toHaveLength(2);
    expect([result.current.mw, result.current.mh]).toEqual([2, 2]);
    expect(result.current.selectedMetatile).toBe(1);
  });

  it('stamps while dragging, one undo step per stroke, ignoring no-ops', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    act(() => result.current.continueStroke({ x: 2, y: 1 }));
    act(() => result.current.continueStroke({ x: 2, y: 1 }));
    act(() => result.current.endStroke({ x: 2, y: 1 }));
    expect(result.current.map[1][1]).toBe(1);
    expect(result.current.map[1][2]).toBe(1);
    act(() => result.current.continueStroke({ x: 5, y: 5 })); // not drawing
    expect(result.current.map[5][5]).toBe(0);
    act(() => result.current.undo());
    expect(result.current.map[1][1]).toBe(0);
  });

  it('select tool clears one cell or a dragged area back to metatile 0 (undoable)', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.selectTool('fill'));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.selectTool('select'));
    act(() => result.current.beginStroke({ x: 2, y: 2 }));
    act(() => result.current.endStroke({ x: 2, y: 2 }));
    act(() => result.current.clearSelection());
    expect(result.current.map[2][2]).toBe(0);
    expect(result.current.map[2][3]).toBe(1);
    act(() => result.current.beginStroke({ x: 5, y: 4 }));
    act(() => result.current.continueStroke({ x: 3, y: 6 }));
    act(() => result.current.endStroke({ x: 3, y: 6 }));
    act(() => result.current.clearSelection());
    for (let y = 4; y <= 6; y++) for (let x = 3; x <= 5; x++) expect(result.current.map[y][x]).toBe(0);
    expect(result.current.map[4][6]).toBe(1);
    act(() => result.current.undo());
    expect(result.current.map[5][4]).toBe(1);
  });

  it('importing a library whose metatile 0 is drawn inserts an empty metatile 0, so the level stays blank', () => {
    const { result } = renderHook(() => useLevelDrawing());
    const lib = lib3();
    lib.metatiles = [createMetatile(2, 2, 1), createMetatile(2, 2, 1, true)];
    act(() => result.current.setLibrary(lib));
    expect(result.current.metatiles).toHaveLength(3);
    expect(result.current.metatiles[0].tiles.flat().every((t) => result.current.tiles[t].flat().every((p) => p === 0))).toBe(true);
    expect(result.current.map.flat().every((m) => m === 0)).toBe(true);
  });

  it('painted cells follow their metatiles when a blank metatile 0 is inserted', () => {
    const drawn = lib3();
    drawn.metatiles = [createMetatile(2, 2, 1), createMetatile(2, 2, 1, true)];
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    const painted = result.current.map[0][0];
    expect(painted).not.toBe(0);
    act(() => { result.current.setLibrary(drawn); });
    expect(result.current.map[0][0]).toBe(painted + 1);
    expect(result.current.map[1][1]).toBe(0);
  });

  it('setLibrary reports a shift only when painted cells exist and a blank metatile 0 was inserted', () => {
    const drawn = lib3();
    drawn.metatiles = [createMetatile(2, 2, 1), createMetatile(2, 2, 1, true)];
    const { result } = renderHook(() => useLevelDrawing());
    let shifted = true;
    act(() => { shifted = result.current.setLibrary(drawn); });
    expect(shifted).toBe(false); // the level was still empty
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    act(() => { shifted = result.current.setLibrary(drawn); });
    expect(shifted).toBe(true); // a cell was painted and the library needed a blank metatile 0
    act(() => { shifted = result.current.setLibrary(lib3()); });
    expect(shifted).toBe(false); // this library already starts with a blank metatile
  });

  it('applies the selected metatile to a selected area', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.selectTool('select'));
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    act(() => result.current.continueStroke({ x: 2, y: 2 }));
    act(() => result.current.endStroke({ x: 2, y: 2 }));
    act(() => result.current.applySelected());
    expect([result.current.map[1][1], result.current.map[2][2], result.current.map[3][3]]).toEqual([1, 1, 0]);
  });

  it('rubber, fill and pick', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.selectTool('fill'));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    expect(result.current.map.flat().every((m) => m === 1)).toBe(true);
    act(() => result.current.selectTool('rubber'));
    act(() => result.current.beginStroke({ x: 3, y: 3 }));
    act(() => result.current.continueStroke({ x: 4, y: 3 }));
    act(() => result.current.endStroke(null));
    expect(result.current.map[3][3]).toBe(0);
    expect(result.current.map[3][4]).toBe(0);
    act(() => result.current.setSelectedMetatile(0));
    act(() => result.current.selectTool('pick'));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    expect(result.current.selectedMetatile).toBe(1);
  });

  it('switching away from select drops the selection; pan does nothing on stroke', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.selectTool('select'));
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    act(() => result.current.selectTool('pan'));
    expect(result.current.selStart).toBeNull();
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    expect(result.current.map[1][1]).toBe(0);
  });

  it('clears the level (undoable)', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    act(() => result.current.clearMap());
    expect(result.current.map[0][0]).toBe(0);
    act(() => result.current.undo());
    expect(result.current.map[0][0]).toBe(1);
  });

  it('resizes within the limits for the current metatile size', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    act(() => result.current.resizeLevel(20, 8));
    expect(result.current.width).toBe(20);
    expect(result.current.height).toBe(8);
    expect(result.current.map[0][0]).toBe(1);
    act(() => result.current.resizeLevel(0, 8));
    act(() => result.current.resizeLevel(129, 8));
    act(() => result.current.resizeLevel(1.5, 8));
    act(() => result.current.resizeLevel(20, 8)); // unchanged
    expect(result.current.width).toBe(20);
    act(() => result.current.resizeLevel(128, 128));
    expect(result.current.width).toBe(128);
    act(() => result.current.undo());
    expect(result.current.width).toBe(20);
  });

  it('replaces the library, resetting stale cells and cropping to the new size limit', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.setLibrary(lib3()));
    act(() => result.current.setSelectedMetatile(2));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    expect(result.current.map[0][0]).toBe(2);
    act(() => result.current.setLibrary({ ...lib3(), metatiles: [createMetatile(2, 2, 0)] }));
    expect(result.current.map[0][0]).toBe(0);
    expect(result.current.selectedMetatile).toBe(0);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.resizeLevel(100, 100));
    act(() => result.current.setLibrary(lib3(4))); // 4x4 metatiles: max 64
    expect([result.current.mw, result.current.mh]).toEqual([4, 4]);
    expect(result.current.width).toBe(64);
    expect(result.current.height).toBe(64);
    act(() => result.current.setLibrary(lib3(1, 4))); // 1 wide x 4 high: 256 across, 64 down
    act(() => result.current.resizeLevel(256, 64));
    expect(result.current.width).toBe(256);
    expect(result.current.height).toBe(64);
    act(() => result.current.resizeLevel(257, 64));
    act(() => result.current.resizeLevel(256, 65));
    expect(result.current.width).toBe(256);
    expect(result.current.height).toBe(64);
  });

  it('loads project data', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.loadProjectData({ map: [[0, 1], [2, 0]], library: lib3() }));
    expect(result.current.width).toBe(2);
    expect(result.current.metatiles).toHaveLength(3);
    expect(result.current.selectedMetatile).toBe(1);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.loadProjectData({ map: [[0]], library: { ...lib3(), metatiles: [createMetatile(2, 2)] } }));
    expect(result.current.selectedMetatile).toBe(0);
  });

  it('moves the viewport, clamping at 0', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.moveViewport(5.4, 7));
    expect(result.current.scx).toBe(5);
    expect(result.current.scy).toBe(7);
    act(() => result.current.moveViewport(-3, NaN));
    expect(result.current.scx).toBe(0);
    expect(result.current.scy).toBe(0);
  });

  it('exposes view toggles', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => {
      result.current.setShowGrid(false);
      result.current.setShowViewport(false);
      result.current.setShowCollision(false);
      result.current.setBgpIndex(2);
    });
    expect(result.current.showGrid).toBe(false);
    expect(result.current.showViewport).toBe(false);
    expect(result.current.showCollision).toBe(false);
    expect(result.current.bgpIndex).toBe(2);
  });
});
