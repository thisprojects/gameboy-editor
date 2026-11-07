import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import { Tool, Point } from '@/types';
import {
  TILE_SIZE,
  DEFAULT_TILES_WIDTH,
  DEFAULT_TILES_HEIGHT,
  MAX_TILES,
  MAX_TILES_WIDTH,
} from '@/constants';
import { getLinePoints, createEmptyPixels, floodFill } from '@/utils/drawing';

interface TilesetState {
  pixels: number[][];
  tilesWidth: number;
  tilesHeight: number;
}

export function useTileDrawing() {
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
  } = useHistory<TilesetState>({
    pixels: createEmptyPixels(DEFAULT_TILES_WIDTH * TILE_SIZE, DEFAULT_TILES_HEIGHT * TILE_SIZE),
    tilesWidth: DEFAULT_TILES_WIDTH,
    tilesHeight: DEFAULT_TILES_HEIGHT,
  });
  const { pixels, tilesWidth, tilesHeight } = state;

  const [currentShade, setCurrentShade] = useState(3);
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [linePreview, setLinePreview] = useState<Point | null>(null);

  // Background image for tracing (editor-only, not saved)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.3);
  const [backgroundEnabled, setBackgroundEnabled] = useState(true);
  const [backgroundX, setBackgroundX] = useState(0);
  const [backgroundY, setBackgroundY] = useState(0);
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [backgroundAdjustMode, setBackgroundAdjustMode] = useState(false);

  const resetLine = () => {
    setLineStart(null);
    setLinePreview(null);
  };

  /** Set one pixel to the current shade (pencil) or shade 0 (rubber). */
  const setPixel = useCallback(
    (x: number, y: number, erase: boolean) => {
      setState((prev) => {
        if (!prev.pixels[y] || prev.pixels[y][x] === undefined) return prev;
        const value = erase ? 0 : currentShade;
        if (prev.pixels[y][x] === value) return prev;
        const next = prev.pixels.map((row) => [...row]);
        next[y][x] = value;
        return { ...prev, pixels: next };
      });
    },
    [currentShade, setState]
  );

  const drawLine = useCallback(
    (start: Point, end: Point) => {
      pushHistory();
      setState((prev) => {
        const next = prev.pixels.map((row) => [...row]);
        for (const p of getLinePoints(start.x, start.y, end.x, end.y)) {
          if (next[p.y]?.[p.x] !== undefined) next[p.y][p.x] = currentShade;
        }
        return { ...prev, pixels: next };
      });
    },
    [currentShade, pushHistory, setState]
  );

  /** Flood fill the contiguous region of same-shade pixels. */
  const bucketFill = useCallback(
    (x: number, y: number) => {
      pushHistory();
      setState((prev) => ({ ...prev, pixels: floodFill(prev.pixels, x, y, currentShade) }));
    },
    [currentShade, pushHistory, setState]
  );

  const selectTool = useCallback((tool: Tool) => {
    setCurrentTool(tool);
    setLineStart(null);
    setLinePreview(null);
  }, []);

  const clearCanvas = useCallback(() => {
    pushHistory();
    setState((prev) => ({
      ...prev,
      pixels: createEmptyPixels(prev.tilesWidth * TILE_SIZE, prev.tilesHeight * TILE_SIZE),
    }));
    resetLine();
  }, [pushHistory, setState]);

  const resizeCanvas = useCallback(
    (newWidth: number, newHeight: number) => {
      if (!Number.isInteger(newWidth) || !Number.isInteger(newHeight)) return; // e.g. 2.5 typed into the field
      if (newWidth < 1 || newHeight < 1 || newWidth > MAX_TILES_WIDTH) return;
      if (newWidth * newHeight > MAX_TILES) {
        alert(`Canvas size ${newWidth}x${newHeight} = ${newWidth * newHeight} tiles exceeds the maximum of ${MAX_TILES} tiles.`);
        return;
      }
      pushHistory();
      setState((prev) => {
        const next = createEmptyPixels(newWidth * TILE_SIZE, newHeight * TILE_SIZE);
        for (let y = 0; y < Math.min(prev.pixels.length, next.length); y++) {
          for (let x = 0; x < Math.min(prev.pixels[y].length, next[0].length); x++) {
            next[y][x] = prev.pixels[y][x];
          }
        }
        return { pixels: next, tilesWidth: newWidth, tilesHeight: newHeight };
      });
      resetLine();
    },
    [pushHistory, setState]
  );

  const loadProjectData = useCallback(
    (loadedWidth: number, loadedHeight: number, loadedPixels: number[][]) => {
      clearHistory();
      setState({ pixels: loadedPixels, tilesWidth: loadedWidth, tilesHeight: loadedHeight });
      resetLine();
    },
    [clearHistory, setState]
  );

  const loadBackgroundImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setBackgroundImage(img);
      URL.revokeObjectURL(url); // the decoded image no longer needs the URL
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, []);

  const clearBackgroundImage = useCallback(() => {
    setBackgroundImage(null);
    setBackgroundX(0);
    setBackgroundY(0);
    setBackgroundScale(1);
    setBackgroundAdjustMode(false);
  }, []);

  return {
    tilesWidth,
    tilesHeight,
    canvasWidth: tilesWidth * TILE_SIZE,
    canvasHeight: tilesHeight * TILE_SIZE,
    pixels,
    currentShade,
    setCurrentShade,
    currentTool,
    selectTool,
    isDrawing,
    setIsDrawing,
    lineStart,
    setLineStart,
    linePreview,
    setLinePreview,
    setPixel,
    drawLine,
    bucketFill,
    clearCanvas,
    resizeCanvas,
    loadProjectData,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    backgroundImage,
    backgroundOpacity,
    setBackgroundOpacity,
    backgroundEnabled,
    setBackgroundEnabled,
    backgroundX,
    setBackgroundX,
    backgroundY,
    setBackgroundY,
    backgroundScale,
    setBackgroundScale,
    backgroundAdjustMode,
    setBackgroundAdjustMode,
    loadBackgroundImage,
    clearBackgroundImage,
  };
}
