import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import { Point } from '@/types';
import { Tile } from '@/types/map';
import { Metatile, MetatileTool } from '@/types/metatile';
import { MAX_METATILES } from '@/constants/level';
import { MAX_MAP_TILES } from '@/constants/map';
import { floodFill } from '@/utils/drawing';
import { createMetatile, defaultLibrary, resizeMetatile, clampMetatiles, isValidEdge } from '@/utils/metatile';

interface MetatileState {
  metatiles: Metatile[];
  mw: number;
  mh: number;
}

export function useMetatileDrawing() {
  const initial = defaultLibrary();
  const {
    state,
    setState,
    push: pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    clearHistory,
  } = useHistory<MetatileState>({ metatiles: initial.metatiles, mw: initial.mw, mh: initial.mh });
  const { metatiles, mw, mh } = state;

  const [tiles, setTilesState] = useState<Tile[]>(initial.tiles);
  const [metaIndex, setMetaIndex] = useState(1);
  const [selectedTile, setSelectedTile] = useState(1);
  const [currentTool, setCurrentTool] = useState<MetatileTool>('stamp');
  const [isDrawing, setIsDrawing] = useState(false);

  const selectedMetatile = Math.min(metaIndex, metatiles.length - 1);
  const current = metatiles[selectedMetatile];

  /** Apply an update to the selected metatile's tile grid; returning the same grid means no change. */
  const updateGrid = useCallback(
    (fn: (grid: number[][]) => number[][]) => {
      setState((prev) => {
        const i = Math.min(metaIndex, prev.metatiles.length - 1);
        const next = fn(prev.metatiles[i].tiles);
        if (next === prev.metatiles[i].tiles) return prev;
        const list = prev.metatiles.slice();
        list[i] = { ...list[i], tiles: next };
        return { ...prev, metatiles: list };
      });
    },
    [metaIndex, setState]
  );

  const setCell = useCallback(
    (c: Point, value: number) => {
      updateGrid((g) => {
        if (g[c.y]?.[c.x] === undefined || g[c.y][c.x] === value) return g;
        const next = g.map((row) => [...row]);
        next[c.y][c.x] = value;
        return next;
      });
    },
    [updateGrid]
  );

  const selectTool = useCallback((tool: MetatileTool) => {
    setCurrentTool(tool);
    setIsDrawing(false);
  }, []);

  const beginStroke = useCallback(
    (c: Point) => {
      switch (currentTool) {
        case 'stamp':
        case 'rubber':
          pushHistory();
          setIsDrawing(true);
          setCell(c, currentTool === 'stamp' ? selectedTile : 0);
          break;
        case 'fill':
          pushHistory();
          updateGrid((g) => floodFill(g, c.x, c.y, selectedTile));
          break;
        case 'pick':
          setSelectedTile(current.tiles[c.y][c.x]);
          break;
      }
    },
    [currentTool, selectedTile, current, pushHistory, setCell, updateGrid]
  );

  const continueStroke = useCallback(
    (c: Point) => {
      if (isDrawing) setCell(c, currentTool === 'stamp' ? selectedTile : 0);
    },
    [isDrawing, currentTool, selectedTile, setCell]
  );

  const endStroke = useCallback(() => setIsDrawing(false), []);

  const clearMetatile = useCallback(() => {
    pushHistory();
    updateGrid((g) => g.map((row) => row.map(() => 0)));
  }, [pushHistory, updateGrid]);

  const toggleSolid = useCallback(() => {
    pushHistory();
    setState((prev) => {
      const i = Math.min(metaIndex, prev.metatiles.length - 1);
      const list = prev.metatiles.slice();
      list[i] = { ...list[i], solid: !list[i].solid };
      return { ...prev, metatiles: list };
    });
  }, [metaIndex, pushHistory, setState]);

  const insertAfterCurrent = useCallback(
    (make: (prev: MetatileState) => Metatile) => {
      if (metatiles.length >= MAX_METATILES) {
        alert(`A library can hold at most ${MAX_METATILES} metatiles.`);
        return;
      }
      pushHistory();
      setState((prev) => {
        const list = prev.metatiles.slice();
        list.splice(selectedMetatile + 1, 0, make(prev));
        return { ...prev, metatiles: list };
      });
      setMetaIndex(selectedMetatile + 1);
    },
    [metatiles.length, selectedMetatile, pushHistory, setState]
  );

  const addMetatile = useCallback(() => insertAfterCurrent((prev) => createMetatile(prev.mw, prev.mh)), [insertAfterCurrent]);

  const duplicateMetatile = useCallback(
    () =>
      insertAfterCurrent((prev) => {
        const src = prev.metatiles[selectedMetatile];
        return { tiles: src.tiles.map((r) => [...r]), solid: src.solid };
      }),
    [insertAfterCurrent, selectedMetatile]
  );

  const deleteMetatile = useCallback(() => {
    if (metatiles.length <= 1) return;
    pushHistory();
    setState((prev) => ({ ...prev, metatiles: prev.metatiles.filter((_, i) => i !== selectedMetatile) }));
    setMetaIndex(Math.max(0, selectedMetatile - 1));
  }, [metatiles.length, selectedMetatile, pushHistory, setState]);

  /** Change the metatile width and height (in tiles); content is kept from the top-left of each metatile. */
  const setSize = useCallback(
    (newW: number, newH: number) => {
      if (!isValidEdge(newW) || !isValidEdge(newH) || (newW === mw && newH === mh)) return;
      pushHistory();
      setState((prev) => ({ mw: newW, mh: newH, metatiles: prev.metatiles.map((m) => resizeMetatile(m, newW, newH)) }));
    },
    [mw, mh, pushHistory, setState]
  );

  /** Replace the tileset; tile references past the new end are reset to tile 0. */
  const setTileset = useCallback(
    (newTiles: Tile[]) => {
      if (newTiles.length < 1 || newTiles.length > MAX_MAP_TILES) return;
      clearHistory();
      setTilesState(newTiles);
      setState((prev) => ({ ...prev, metatiles: clampMetatiles(prev.metatiles, newTiles.length) }));
      setSelectedTile((s) => Math.min(s, newTiles.length - 1));
    },
    [clearHistory, setState]
  );

  const loadProjectData = useCallback(
    (data: { mw: number; mh: number; tiles: Tile[]; metatiles: Metatile[] }) => {
      clearHistory();
      setTilesState(data.tiles);
      setState({ mw: data.mw, mh: data.mh, metatiles: data.metatiles });
      setMetaIndex(0);
      setSelectedTile(Math.min(1, data.tiles.length - 1));
    },
    [clearHistory, setState]
  );

  return {
    metatiles,
    mw,
    mh,
    tiles,
    selectedMetatile,
    selectMetatile: setMetaIndex,
    current,
    selectedTile,
    setSelectedTile,
    currentTool,
    selectTool,
    beginStroke,
    continueStroke,
    endStroke,
    clearMetatile,
    toggleSolid,
    addMetatile,
    duplicateMetatile,
    deleteMetatile,
    setSize,
    setTileset,
    loadProjectData,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
  };
}
