import { renderHook, act } from '@testing-library/react';
import { useMapDrawing } from '@/hooks/useMapDrawing';
import { createSolidTile, createBlankTile } from '@/utils/map';

describe('useMapDrawing', () => {
  it('starts with an empty 32x32 map and a two-tile default tileset', () => {
    const { result } = renderHook(() => useMapDrawing());
    expect(result.current.map).toHaveLength(32);
    expect(result.current.tiles).toHaveLength(2);
    expect(result.current.selectedTile).toBe(1);
    expect(result.current.currentTool).toBe('stamp');
  });

  it('stamps while dragging, one undo step per stroke', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    expect(result.current.isDrawing).toBe(true);
    act(() => result.current.continueStroke({ x: 2, y: 1 }));
    act(() => result.current.continueStroke({ x: 2, y: 1 })); // same cell, no-op
    act(() => result.current.endStroke({ x: 2, y: 1 }));
    expect(result.current.isDrawing).toBe(false);
    expect(result.current.map[1][1]).toBe(1);
    expect(result.current.map[1][2]).toBe(1);
    act(() => result.current.undo());
    expect(result.current.map[1][1]).toBe(0);
    expect(result.current.map[1][2]).toBe(0);
  });

  it('ignores moves when not drawing', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.continueStroke({ x: 3, y: 3 }));
    expect(result.current.map[3][3]).toBe(0);
  });

  it('rubber writes tile 0', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    act(() => result.current.selectTool('rubber'));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.continueStroke({ x: 1, y: 0 }));
    act(() => result.current.endStroke(null));
    expect(result.current.map[0][0]).toBe(0);
  });

  it('fills a rectangle on mouse up, and cancels on leave', () => {
    const { result } = renderHook(() => useMapDrawing());
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
  });

  it('rectangle works in reverse drag order', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.selectTool('rect'));
    act(() => result.current.beginStroke({ x: 5, y: 5 }));
    act(() => result.current.endStroke({ x: 3, y: 4 }));
    expect(result.current.map[4][3]).toBe(1);
    expect(result.current.map[5][5]).toBe(1);
  });

  it('flood fills and undoes', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.selectTool('fill'));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    expect(result.current.map.flat().every((t) => t === 1)).toBe(true);
    act(() => result.current.undo());
    expect(result.current.map.flat().every((t) => t === 0)).toBe(true);
  });

  it('picks a tile from the map', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.beginStroke({ x: 4, y: 4 })); // paint tile 1
    act(() => result.current.endStroke(null));
    act(() => result.current.setSelectedTile(0));
    act(() => result.current.selectTool('pick'));
    act(() => result.current.beginStroke({ x: 4, y: 4 }));
    expect(result.current.selectedTile).toBe(1);
  });

  it('selecting a tool cancels an in-progress rectangle', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.selectTool('rect'));
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    act(() => result.current.selectTool('stamp'));
    expect(result.current.rectStart).toBeNull();
  });

  it('pan tool does nothing on stroke', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.selectTool('pan'));
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    expect(result.current.map[1][1]).toBe(0);
  });

  it('clears the map with undo support', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    act(() => result.current.clearMap());
    expect(result.current.map[0][0]).toBe(0);
    act(() => result.current.undo());
    expect(result.current.map[0][0]).toBe(1);
  });

  it('replaces the tileset, resetting out-of-range cells and clamping the selection', () => {
    const { result } = renderHook(() => useMapDrawing());
    const four = [createBlankTile(), createSolidTile(1), createSolidTile(2), createSolidTile(3)];
    act(() => result.current.setTileset(four));
    act(() => result.current.setSelectedTile(3));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke(null));
    expect(result.current.map[0][0]).toBe(3);
    act(() => result.current.setTileset([createBlankTile(), createSolidTile(1)]));
    expect(result.current.map[0][0]).toBe(0);
    expect(result.current.selectedTile).toBe(1);
    expect(result.current.canUndo).toBe(false);
  });

  it('rejects empty and oversized tilesets', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.setTileset([]));
    act(() => result.current.setTileset(Array(257).fill(createBlankTile())));
    expect(result.current.tiles).toHaveLength(2);
  });

  it('loads project data', () => {
    const { result } = renderHook(() => useMapDrawing());
    const map = Array.from({ length: 32 }, () => Array(32).fill(0));
    map[0][0] = 0;
    act(() => result.current.loadProjectData({ map, tiles: [createBlankTile()] }));
    expect(result.current.tiles).toHaveLength(1);
    expect(result.current.selectedTile).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('moves the viewport with wrapping', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => result.current.moveViewport(33, -1));
    expect(result.current.scx).toBe(1);
    expect(result.current.scy).toBe(31);
  });

  it('exposes view toggles', () => {
    const { result } = renderHook(() => useMapDrawing());
    act(() => {
      result.current.setShowGrid(false);
      result.current.setShowViewport(false);
      result.current.setBgpIndex(2);
    });
    expect(result.current.showGrid).toBe(false);
    expect(result.current.showViewport).toBe(false);
    expect(result.current.bgpIndex).toBe(2);
  });
});
