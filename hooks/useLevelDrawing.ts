import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import { Point } from '@/types';
import { MapTool, Tile } from '@/types/map';

export type LevelTool = Exclude<MapTool, 'rect'> | 'select';
import { Metatile } from '@/types/metatile';
import { DEFAULT_LEVEL_SIZE, maxLevelMetatiles } from '@/constants/level';
import { floodFill } from '@/utils/drawing';
import { resizeGrid } from '@/utils/grid';
import { clampMap } from '@/utils/map';
import { defaultLibrary, withEmptyBackground } from '@/utils/metatile';

interface LevelState {
  map: number[][];
}

interface Library {
  mw: number;
  mh: number;
  tiles: Tile[];
  metatiles: Metatile[];
}

export function useLevelDrawing() {
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
  } = useHistory<LevelState>({ map: resizeGrid([], DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE) });
  const { map } = state;

  const [library, setLibraryState] = useState<Library>(defaultLibrary);
  const { mw, mh, tiles, metatiles } = library;

  const [selectedMetatile, setSelectedMetatile] = useState(1);
  const [currentTool, setCurrentTool] = useState<LevelTool>('stamp');
  const [isDrawing, setIsDrawing] = useState(false);
  // Selected area (inclusive cell corners) for the select tool; persists after the mouse is released
  const [selStart, setSelStart] = useState<Point | null>(null);
  const [selEnd, setSelEnd] = useState<Point | null>(null);
  const [selecting, setSelecting] = useState(false);

  // View options. Screen scroll position is in tiles.
  const [scx, setScx] = useState(0);
  const [scy, setScy] = useState(0);
  const [showViewport, setShowViewport] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCollision, setShowCollision] = useState(true);
  const [bgpIndex, setBgpIndex] = useState(0);

  const width = map[0].length;
  const height = map.length;

  const setCell = useCallback(
    (c: Point, value: number) => {
      setState((prev) => {
        if (prev.map[c.y]?.[c.x] === undefined || prev.map[c.y][c.x] === value) return prev;
        const next = prev.map.map((row) => [...row]);
        next[c.y][c.x] = value;
        return { map: next };
      });
    },
    [setState]
  );

  const selectTool = useCallback((tool: LevelTool) => {
    setCurrentTool(tool);
    if (tool !== 'select') {
      setSelStart(null);
      setSelEnd(null);
    }
    setSelecting(false);
    setIsDrawing(false);
  }, []);

  /** Mouse down on a cell, interpreted according to the current tool. */
  const beginStroke = useCallback(
    (c: Point) => {
      switch (currentTool) {
        case 'stamp':
        case 'rubber':
          pushHistory();
          setIsDrawing(true);
          setCell(c, currentTool === 'stamp' ? selectedMetatile : 0);
          break;
        case 'select':
          setSelStart(c);
          setSelEnd(c);
          setSelecting(true);
          break;
        case 'fill':
          pushHistory();
          setState((prev) => ({ map: floodFill(prev.map, c.x, c.y, selectedMetatile) }));
          break;
        case 'pick':
          setSelectedMetatile(map[c.y][c.x]);
          break;
      }
    },
    [currentTool, selectedMetatile, map, pushHistory, setCell, setState]
  );

  const continueStroke = useCallback(
    (c: Point) => {
      if (isDrawing && (currentTool === 'stamp' || currentTool === 'rubber')) {
        setCell(c, currentTool === 'stamp' ? selectedMetatile : 0);
      } else if (selecting && currentTool === 'select') {
        setSelEnd(c);
      }
    },
    [selecting, isDrawing, currentTool, selectedMetatile, setCell]
  );

  /** Mouse up or mouse leave: ends the current stroke or selection drag (the selection itself stays). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const endStroke = useCallback((_c?: Point | null) => {
    setIsDrawing(false);
    setSelecting(false);
  }, []);

  /** Set every selected cell (one cell or a dragged area) to a metatile. */
  const applyToSelection = useCallback(
    (value: number) => {
      if (!selStart || !selEnd) return;
      const x0 = Math.min(selStart.x, selEnd.x);
      const x1 = Math.max(selStart.x, selEnd.x);
      const y0 = Math.min(selStart.y, selEnd.y);
      const y1 = Math.max(selStart.y, selEnd.y);
      pushHistory();
      setState((prev) => ({
        map: prev.map.map((row, y) => (y < y0 || y > y1 ? row : row.map((v, x) => (x < x0 || x > x1 ? v : value)))),
      }));
    },
    [selStart, selEnd, pushHistory, setState]
  );

  /** Reset the selection to the empty background (metatile 0). */
  const clearSelection = useCallback(() => applyToSelection(0), [applyToSelection]);

  /** Put the selected metatile into every selected cell. */
  const applySelected = useCallback(() => applyToSelection(selectedMetatile), [applyToSelection, selectedMetatile]);

  const clearMap = useCallback(() => {
    pushHistory();
    setState((prev) => ({ map: prev.map.map((row) => row.map(() => 0)) }));
  }, [pushHistory, setState]);

  /** Resize the level (in metatiles), keeping content from the top-left. */
  const resizeLevel = useCallback(
    (w: number, h: number) => {
      if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > maxLevelMetatiles(mw) || h > maxLevelMetatiles(mh)) return;
      if (w === width && h === height) return;
      pushHistory();
      setState((prev) => ({ map: resizeGrid(prev.map, w, h) }));
    },
    [mw, mh, width, height, pushHistory, setState]
  );

  /** Replace the library; map cells pointing past the new metatile list are reset to 0 and the map is cropped to fit. */
  const setLibrary = useCallback(
    (imported: Library): boolean => {
      const lib = withEmptyBackground(imported);
      // a blank metatile was put in front, so already painted cells now point one metatile further along
      const shifted = lib !== imported && map.some((row) => row.some((v) => v !== 0));
      clearHistory();
      setLibraryState(lib);
      const maxW = maxLevelMetatiles(lib.mw);
      const maxH = maxLevelMetatiles(lib.mh);
      setState((prev) => ({
        map: clampMap(resizeGrid(prev.map, Math.min(prev.map[0].length, maxW), Math.min(prev.map.length, maxH)), lib.metatiles.length),
      }));
      setSelectedMetatile((s) => Math.min(s, lib.metatiles.length - 1));
      return shifted;
    },
    [map, clearHistory, setState]
  );

  const loadProjectData = useCallback(
    (data: { map: number[][]; library: Library }) => {
      clearHistory();
      setLibraryState(data.library);
      setState({ map: data.map });
      setSelectedMetatile(Math.min(1, data.library.metatiles.length - 1));
    },
    [clearHistory, setState]
  );

  const moveViewport = useCallback((x: number, y: number) => {
    setScx(Math.max(0, Math.round(x) || 0));
    setScy(Math.max(0, Math.round(y) || 0));
  }, []);

  return {
    map,
    width,
    height,
    mw,
    mh,
    tiles,
    metatiles,
    selectedMetatile,
    setSelectedMetatile,
    currentTool,
    selectTool,
    selStart,
    selEnd,
    clearSelection,
    applySelected,
    beginStroke,
    continueStroke,
    endStroke,
    clearMap,
    resizeLevel,
    setLibrary,
    loadProjectData,
    scx,
    scy,
    moveViewport,
    showViewport,
    setShowViewport,
    showGrid,
    setShowGrid,
    showCollision,
    setShowCollision,
    bgpIndex,
    setBgpIndex,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
  };
}
