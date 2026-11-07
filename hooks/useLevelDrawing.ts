import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import { Point } from '@/types';
import { MapTool, Tile } from '@/types/map';
import { Metatile } from '@/types/metatile';
import { DEFAULT_LEVEL_SIZE, maxLevelMetatiles } from '@/constants/level';
import { floodFill } from '@/utils/drawing';
import { fillRectGrid, resizeGrid } from '@/utils/grid';
import { clampMap } from '@/utils/map';
import { defaultLibrary } from '@/utils/metatile';

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
  const [currentTool, setCurrentTool] = useState<MapTool>('stamp');
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [rectEnd, setRectEnd] = useState<Point | null>(null);

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

  const selectTool = useCallback((tool: MapTool) => {
    setCurrentTool(tool);
    setRectStart(null);
    setRectEnd(null);
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
        case 'rect':
          setRectStart(c);
          setRectEnd(c);
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
      } else if (rectStart && currentTool === 'rect') {
        setRectEnd(c);
      }
    },
    [isDrawing, currentTool, selectedMetatile, rectStart, setCell]
  );

  /** Mouse up (with the cell) or mouse leave (null, which cancels a rectangle). */
  const endStroke = useCallback(
    (c: Point | null) => {
      if (rectStart && currentTool === 'rect' && c) {
        pushHistory();
        setState((prev) => ({ map: fillRectGrid(prev.map, rectStart, c, selectedMetatile) }));
      }
      setRectStart(null);
      setRectEnd(null);
      setIsDrawing(false);
    },
    [rectStart, currentTool, selectedMetatile, pushHistory, setState]
  );

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
    (lib: Library) => {
      clearHistory();
      setLibraryState(lib);
      const maxW = maxLevelMetatiles(lib.mw);
      const maxH = maxLevelMetatiles(lib.mh);
      setState((prev) => ({
        map: clampMap(resizeGrid(prev.map, Math.min(prev.map[0].length, maxW), Math.min(prev.map.length, maxH)), lib.metatiles.length),
      }));
      setSelectedMetatile((s) => Math.min(s, lib.metatiles.length - 1));
    },
    [clearHistory, setState]
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
    rectStart,
    rectEnd,
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
