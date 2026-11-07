import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import { Tool, Point } from '@/types';
import { Tile } from '@/types/map';
import { GLYPH_COUNT } from '@/constants/font';
import { getLinePoints, floodFill } from '@/utils/drawing';
import { createBlankTile } from '@/utils/map';
import { createEmptyGlyphs, starterGlyphs } from '@/utils/font';

interface FontState {
  glyphs: Tile[];
}

const cloneTile = (t: Tile): Tile => t.map((row) => [...row]);

export function useFontDrawing() {
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
  } = useHistory<FontState>({ glyphs: starterGlyphs() });
  const { glyphs } = state;

  const [selectedGlyph, setSelectedGlyph] = useState(33); // 'A'
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [currentShade, setCurrentShade] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [linePreview, setLinePreview] = useState<Point | null>(null);
  const [clipboard, setClipboard] = useState<Tile | null>(null);

  const pixels = glyphs[selectedGlyph];

  const resetLine = () => {
    setLineStart(null);
    setLinePreview(null);
  };

  /** Apply an update to the selected glyph; returning the same tile means no change. */
  const updateGlyph = useCallback(
    (fn: (tile: Tile) => Tile) => {
      setState((prev) => {
        const next = fn(prev.glyphs[selectedGlyph]);
        if (next === prev.glyphs[selectedGlyph]) return prev;
        const g = prev.glyphs.slice();
        g[selectedGlyph] = next;
        return { glyphs: g };
      });
    },
    [selectedGlyph, setState]
  );

  const setPixel = useCallback(
    (x: number, y: number, erase: boolean) => {
      const value = erase ? 0 : currentShade;
      updateGlyph((t) => {
        if (t[y]?.[x] === undefined || t[y][x] === value) return t;
        const next = cloneTile(t);
        next[y][x] = value;
        return next;
      });
    },
    [currentShade, updateGlyph]
  );

  const drawLine = useCallback(
    (start: Point, end: Point) => {
      pushHistory();
      updateGlyph((t) => {
        const next = cloneTile(t);
        for (const p of getLinePoints(start.x, start.y, end.x, end.y)) {
          if (next[p.y]?.[p.x] !== undefined) next[p.y][p.x] = currentShade;
        }
        return next;
      });
    },
    [currentShade, pushHistory, updateGlyph]
  );

  const bucketFill = useCallback(
    (x: number, y: number) => {
      pushHistory();
      updateGlyph((t) => floodFill(t, x, y, currentShade));
    },
    [currentShade, pushHistory, updateGlyph]
  );

  const selectTool = useCallback((tool: Tool) => {
    setCurrentTool(tool);
    setLineStart(null);
    setLinePreview(null);
  }, []);

  const selectGlyph = useCallback((index: number) => {
    if (index < 0 || index >= GLYPH_COUNT) return;
    setSelectedGlyph(index);
    setLineStart(null);
    setLinePreview(null);
  }, []);

  const clearGlyph = useCallback(() => {
    pushHistory();
    updateGlyph(() => createBlankTile());
    resetLine();
  }, [pushHistory, updateGlyph]);

  const clearAll = useCallback(() => {
    pushHistory();
    setState({ glyphs: createEmptyGlyphs() });
    resetLine();
  }, [pushHistory, setState]);

  /** Replace every glyph with the built-in starter font. */
  const loadStarterFont = useCallback(() => {
    pushHistory();
    setState({ glyphs: starterGlyphs() });
    resetLine();
  }, [pushHistory, setState]);

  /** Restore only the selected glyph from the starter font. */
  const resetGlyphToStarter = useCallback(() => {
    pushHistory();
    const original = starterGlyphs()[selectedGlyph];
    updateGlyph(() => original);
    resetLine();
  }, [selectedGlyph, pushHistory, updateGlyph]);

  const copyGlyph = useCallback(() => setClipboard(cloneTile(pixels)), [pixels]);

  const pasteGlyph = useCallback(() => {
    if (!clipboard) return;
    pushHistory();
    updateGlyph(() => cloneTile(clipboard));
  }, [clipboard, pushHistory, updateGlyph]);

  const loadFontData = useCallback(
    (loaded: Tile[]) => {
      clearHistory();
      setState({ glyphs: loaded });
      resetLine();
    },
    [clearHistory, setState]
  );

  return {
    glyphs,
    pixels,
    selectedGlyph,
    selectGlyph,
    currentTool,
    selectTool,
    currentShade,
    setCurrentShade,
    isDrawing,
    setIsDrawing,
    lineStart,
    setLineStart,
    linePreview,
    setLinePreview,
    hasClipboard: clipboard !== null,
    setPixel,
    drawLine,
    bucketFill,
    clearGlyph,
    clearAll,
    loadStarterFont,
    resetGlyphToStarter,
    copyGlyph,
    pasteGlyph,
    loadFontData,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
  };
}
