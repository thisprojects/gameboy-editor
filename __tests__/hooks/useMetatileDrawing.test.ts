import { renderHook, act } from '@testing-library/react';
import { useMetatileDrawing } from '@/hooks/useMetatileDrawing';
import { createBlankTile, createSolidTile } from '@/utils/map';
import { createMetatile } from '@/utils/metatile';

describe('useMetatileDrawing', () => {
  beforeEach(() => (global.alert as jest.Mock).mockClear());

  it('starts with the default 2x2 library and the solid metatile selected', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    expect(result.current.size).toBe(2);
    expect(result.current.metatiles).toHaveLength(2);
    expect(result.current.selectedMetatile).toBe(1);
    expect(result.current.current.solid).toBe(true);
    expect(result.current.tiles).toHaveLength(2);
  });

  it('stamps while dragging as a single undo step', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.selectMetatile(0));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.continueStroke({ x: 1, y: 0 }));
    act(() => result.current.continueStroke({ x: 1, y: 0 })); // same cell no-op
    act(() => result.current.endStroke());
    expect(result.current.current.tiles[0]).toEqual([1, 1]);
    act(() => result.current.continueStroke({ x: 0, y: 1 })); // not drawing
    expect(result.current.current.tiles[1]).toEqual([0, 0]);
    act(() => result.current.undo());
    expect(result.current.current.tiles[0]).toEqual([0, 0]);
  });

  it('rubber writes tile 0, fill and pick work', () => {
    const { result } = renderHook(() => useMetatileDrawing()); // metatile 1 is all tile 1
    act(() => result.current.selectTool('rubber'));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke());
    expect(result.current.current.tiles[0][0]).toBe(0);
    act(() => result.current.selectTool('pick'));
    act(() => result.current.beginStroke({ x: 1, y: 1 }));
    expect(result.current.selectedTile).toBe(1);
    act(() => result.current.setSelectedTile(0));
    act(() => result.current.selectTool('fill'));
    act(() => result.current.beginStroke({ x: 1, y: 1 })); // fill the region of 1s with 0
    expect(result.current.current.tiles.flat().every((t) => t === 0)).toBe(true);
    act(() => result.current.undo());
    expect(result.current.current.tiles[1][1]).toBe(1);
  });

  it('clears a metatile and toggles solid', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.clearMetatile());
    expect(result.current.current.tiles.flat().every((t) => t === 0)).toBe(true);
    act(() => result.current.toggleSolid());
    expect(result.current.current.solid).toBe(false);
    act(() => result.current.toggleSolid());
    expect(result.current.current.solid).toBe(true);
  });

  it('adds, duplicates and deletes metatiles', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.duplicateMetatile());
    expect(result.current.metatiles).toHaveLength(3);
    expect(result.current.selectedMetatile).toBe(2);
    expect(result.current.current.solid).toBe(true);
    expect(result.current.current.tiles).toEqual(result.current.metatiles[1].tiles);
    expect(result.current.current.tiles).not.toBe(result.current.metatiles[1].tiles);
    act(() => result.current.addMetatile());
    expect(result.current.metatiles).toHaveLength(4);
    expect(result.current.current.solid).toBe(false);
    act(() => result.current.deleteMetatile());
    expect(result.current.metatiles).toHaveLength(3);
    expect(result.current.selectedMetatile).toBe(2);
    act(() => result.current.deleteMetatile());
    act(() => result.current.deleteMetatile());
    act(() => result.current.deleteMetatile()); // last one stays
    expect(result.current.metatiles).toHaveLength(1);
  });

  it('limits the library to 256 metatiles', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    for (let i = 0; i < 254; i++) act(() => result.current.addMetatile());
    expect(result.current.metatiles).toHaveLength(256);
    act(() => result.current.addMetatile());
    act(() => result.current.duplicateMetatile());
    expect(result.current.metatiles).toHaveLength(256);
    expect(global.alert).toHaveBeenCalledTimes(2);
  });

  it('changes size keeping content, ignoring invalid or unchanged sizes', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.setSize(4));
    expect(result.current.size).toBe(4);
    expect(result.current.current.tiles).toHaveLength(4);
    expect(result.current.current.tiles[0]).toEqual([1, 1, 0, 0]);
    act(() => result.current.setSize(3));
    act(() => result.current.setSize(4));
    expect(result.current.size).toBe(4);
    act(() => result.current.undo());
    expect(result.current.size).toBe(2);
  });

  it('replaces the tileset, resetting dangling references', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.setTileset([createBlankTile(), createSolidTile(1), createSolidTile(2), createSolidTile(3)]));
    act(() => result.current.setSelectedTile(3));
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.endStroke());
    expect(result.current.current.tiles[0][0]).toBe(3);
    act(() => result.current.setTileset([createBlankTile()]));
    expect(result.current.current.tiles.flat().every((t) => t === 0)).toBe(true);
    expect(result.current.selectedTile).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('rejects empty and oversized tilesets', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.setTileset([]));
    act(() => result.current.setTileset(Array(257).fill(createBlankTile())));
    expect(result.current.tiles).toHaveLength(2);
  });

  it('loads project data and clamps the metatile selection after undo', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.loadProjectData({ size: 4, tiles: [createBlankTile()], metatiles: [createMetatile(4)] }));
    expect(result.current.size).toBe(4);
    expect(result.current.selectedMetatile).toBe(0);
    expect(result.current.selectedTile).toBe(0);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.addMetatile());
    expect(result.current.selectedMetatile).toBe(1);
    act(() => result.current.undo());
    expect(result.current.selectedMetatile).toBe(0); // clamped
  });

  it('selecting a tool stops drawing', () => {
    const { result } = renderHook(() => useMetatileDrawing());
    act(() => result.current.beginStroke({ x: 0, y: 0 }));
    act(() => result.current.selectTool('fill'));
    act(() => result.current.continueStroke({ x: 1, y: 1 }));
    expect(result.current.currentTool).toBe('fill');
  });
});
