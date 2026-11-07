import { renderHook, act } from '@testing-library/react';
import { useLevelDrawing } from '@/hooks/useLevelDrawing';
import { createBlankTile, createSolidTile } from '@/utils/map';
import { createMetatile } from '@/utils/metatile';

const lib3 = (size = 2) => ({
  size,
  tiles: [createBlankTile(), createSolidTile(3)],
  metatiles: [createMetatile(size, 0), createMetatile(size, 1, true), createMetatile(size, 1)],
});

describe('useLevelDrawing', () => {
  it('starts with a 16x16 empty level and the default library', () => {
    const { result } = renderHook(() => useLevelDrawing());
    expect(result.current.width).toBe(16);
    expect(result.current.height).toBe(16);
    expect(result.current.metatiles).toHaveLength(2);
    expect(result.current.size).toBe(2);
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

  it('fills rectangles on mouse up, cancels on leave, supports reverse drags', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.selectTool('rect'));
    act(() => result.current.beginStroke({ x: 2, y: 2 }));
    act(() => result.current.continueStroke({ x: 4, y: 3 }));
    expect(result.current.rectEnd).toEqual({ x: 4, y: 3 });
    act(() => result.current.endStroke({ x: 4, y: 3 }));
    expect(result.current.map[2][2]).toBe(1);
    expect(result.current.map[3][4]).toBe(1);
    expect(result.current.map[4][4]).toBe(0);
    expect(result.current.rectStart).toBeNull();
    act(() => result.current.beginStroke({ x: 10, y: 10 }));
    act(() => result.current.endStroke(null));
    expect(result.current.map[10][10]).toBe(0);
    act(() => result.current.beginStroke({ x: 9, y: 9 }));
    act(() => result.current.endStroke({ x: 8, y: 7 }));
    expect(result.current.map[7][8]).toBe(1);
  });

  it('selecting a tool cancels a rectangle; pan does nothing on stroke', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.selectTool('rect'));
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    act(() => result.current.selectTool('pan'));
    expect(result.current.rectStart).toBeNull();
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
    act(() => result.current.setLibrary({ ...lib3(), metatiles: [createMetatile(2, 0)] }));
    expect(result.current.map[0][0]).toBe(0);
    expect(result.current.selectedMetatile).toBe(0);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.resizeLevel(100, 100));
    act(() => result.current.setLibrary(lib3(4))); // 4x4 metatiles: max 64
    expect(result.current.size).toBe(4);
    expect(result.current.width).toBe(64);
    expect(result.current.height).toBe(64);
  });

  it('loads project data', () => {
    const { result } = renderHook(() => useLevelDrawing());
    act(() => result.current.loadProjectData({ map: [[0, 1], [2, 0]], library: lib3() }));
    expect(result.current.width).toBe(2);
    expect(result.current.metatiles).toHaveLength(3);
    expect(result.current.selectedMetatile).toBe(1);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.loadProjectData({ map: [[0]], library: { ...lib3(), metatiles: [createMetatile(2)] } }));
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
