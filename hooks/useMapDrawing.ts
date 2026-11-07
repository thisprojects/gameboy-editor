import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import { Point } from '@/types';
import { MapTool, Tile } from '@/types/map';
import { MAP_SIZE, MAX_MAP_TILES } from '@/constants/map';
import { floodFill } from '@/utils/drawing';
import { createEmptyMap, createBlankTile, createSolidTile, clampMap } from '@/utils/map';

interface MapState {
  map: number[][];
}

const defaultTiles = (): Tile[] => [createBlankTile(), createSolidTile(3)];

export function useMapDrawing() {
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
  } = useHistory<MapState>({ map: createEmptyMap() });
  const { map } = state;

  const [tiles, setTilesState] = useState<Tile[]>(defaultTiles);
  const [selectedTile, setSelectedTile] = useState(1);
  const [currentTool, setCurrentTool] = useState<MapTool>('stamp');
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [rectEnd, setRectEnd] = useState<Point | null>(null);

  // Viewport overlay (SCX/SCY in tiles)
  const [scx, setScx] = useState(0);
  const [scy, setScy] = useState(0);
  const [showViewport, setShowViewport] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [bgpIndex, setBgpIndex] = useState(0);

  const setCell = useCallback(
    (x: number, y: number, value: number) => {
      setState((prev) => {
        if (prev.map[y]?.[x] === undefined || prev.map[y][x] === value) return prev;
        const next = prev.map.map((row) => [...row]);
        next[y][x] = value;
        return { map: next };
      });
    },
    [setState]
  );

  const fillRect = useCallback(
    (a: Point, b: Point, value: number) => {
      pushHistory();
      setState((prev) => {
        const next = prev.map.map((row) => [...row]);
        for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
          for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) next[y][x] = value;
        }
        return { map: next };
      });
    },
    [pushHistory, setState]
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
          setCell(c.x, c.y, currentTool === 'stamp' ? selectedTile : 0);
          break;
        case 'rect':
          setRectStart(c);
          setRectEnd(c);
          break;
        case 'fill':
          pushHistory();
          setState((prev) => ({ map: floodFill(prev.map, c.x, c.y, selectedTile) }));
          break;
        case 'pick':
          setSelectedTile(map[c.y][c.x]);
          break;
      }
    },
    [currentTool, selectedTile, map, pushHistory, setCell, setState]
  );

  const continueStroke = useCallback(
    (c: Point) => {
      if (isDrawing && (currentTool === 'stamp' || currentTool === 'rubber')) {
        setCell(c.x, c.y, currentTool === 'stamp' ? selectedTile : 0);
      } else if (rectStart && currentTool === 'rect') {
        setRectEnd(c);
      }
    },
    [isDrawing, currentTool, selectedTile, rectStart, setCell]
  );

  /** Mouse up (with the cell) or mouse leave (null, which cancels a rectangle). */
  const endStroke = useCallback(
    (c: Point | null) => {
      if (rectStart && currentTool === 'rect' && c) fillRect(rectStart, c, selectedTile);
      setRectStart(null);
      setRectEnd(null);
      setIsDrawing(false);
    },
    [rectStart, currentTool, selectedTile, fillRect]
  );

  const clearMap = useCallback(() => {
    pushHistory();
    setState({ map: createEmptyMap() });
  }, [pushHistory, setState]);

  /** Replace the tileset; map entries pointing past the new tileset are reset to tile 0. */
  const setTileset = useCallback(
    (newTiles: Tile[]) => {
      if (newTiles.length < 1 || newTiles.length > MAX_MAP_TILES) return;
      clearHistory();
      setTilesState(newTiles);
      setState((prev) => ({ map: clampMap(prev.map, newTiles.length) }));
      setSelectedTile((s) => Math.min(s, newTiles.length - 1));
    },
    [clearHistory, setState]
  );

  const loadProjectData = useCallback(
    (data: { map: number[][]; tiles: Tile[] }) => {
      clearHistory();
      setTilesState(data.tiles);
      setState({ map: data.map });
      setSelectedTile(Math.min(1, data.tiles.length - 1));
    },
    [clearHistory, setState]
  );

  const moveViewport = useCallback((x: number, y: number) => {
    const wrap = (n: number) => ((Math.round(n) % MAP_SIZE) + MAP_SIZE) % MAP_SIZE;
    setScx(wrap(x));
    setScy(wrap(y));
  }, []);

  return {
    map,
    tiles,
    selectedTile,
    setSelectedTile,
    currentTool,
    selectTool,
    isDrawing,
    rectStart,
    rectEnd,
    beginStroke,
    continueStroke,
    endStroke,
    clearMap,
    setTileset,
    loadProjectData,
    scx,
    scy,
    moveViewport,
    showViewport,
    setShowViewport,
    showGrid,
    setShowGrid,
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
