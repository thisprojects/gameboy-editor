import { useState, useCallback, useEffect } from 'react';
import { useHistory } from './useHistory';
import { useEditStream } from './useEditStream';
import { Tool, Point } from '@/types';
import { SpriteFrame } from '@/types/sprite';
import { TILE_SIZE } from '@/constants';
import {
  MAX_FRAMES,
  MAX_SPRITE_TILES_DIM,
  DEFAULT_FRAME_TICKS,
  MAX_FRAME_TICKS,
  ObjSize,
} from '@/constants/sprite';
import { getLinePoints, createEmptyPixels, floodFill } from '@/utils/drawing';

interface SpriteState {
  /** Part of the history: switching to 8x16 can change the height, and undo must restore both together. */
  objSize: ObjSize;
  frames: SpriteFrame[];
  tilesWidth: number;
  tilesHeight: number;
}

const blankFrame = (tw: number, th: number, duration = DEFAULT_FRAME_TICKS): SpriteFrame => ({
  pixels: createEmptyPixels(tw * TILE_SIZE, th * TILE_SIZE),
  duration,
});

const clonePixels = (p: number[][]) => p.map((row) => [...row]);

export function useSpriteDrawing() {
  const {
    state,
    setState,
    push: pushHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
    historyIndex,
    clearHistory,
  } = useHistory<SpriteState>({ frames: [blankFrame(2, 2)], tilesWidth: 2, tilesHeight: 2, objSize: '8x8' });
  const { frames, tilesWidth, tilesHeight, objSize } = state;
  const [pushHistoryOnce, resetEditStream] = useEditStream(pushHistory);
  const undo = useCallback(() => {
    resetEditStream(); // an edit right after an undo must get its own undo step
    undoHistory();
  }, [resetEditStream, undoHistory]);
  const redo = useCallback(() => {
    resetEditStream();
    redoHistory();
  }, [resetEditStream, redoHistory]);

  // Hardware settings saved in the project (the OBJ size is in the undo history, see SpriteState)
  const [palette, setPalette] = useState<0 | 1>(0);
  const [priority, setPriority] = useState(false);

  const [frameIndex, setFrameIndex] = useState(0);
  const currentFrame = Math.min(frameIndex, frames.length - 1);
  const pixels = frames[currentFrame].pixels;

  const [currentShade, setCurrentShade] = useState(3);
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [linePreview, setLinePreview] = useState<Point | null>(null);

  // Animation preview
  const [onionSkin, setOnionSkin] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);

  // Tracing image (editor-only)
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

  /** Apply an update to the current frame's pixels. */
  const updateFramePixels = useCallback(
    (fn: (pixels: number[][]) => number[][]) => {
      setState((prev) => {
        const i = Math.min(frameIndex, prev.frames.length - 1);
        const next = fn(prev.frames[i].pixels);
        if (next === prev.frames[i].pixels) return prev;
        const f = prev.frames.slice();
        f[i] = { ...f[i], pixels: next };
        return { ...prev, frames: f };
      });
    },
    [frameIndex, setState]
  );

  const setPixel = useCallback(
    (x: number, y: number, erase: boolean) => {
      const value = erase ? 0 : currentShade;
      updateFramePixels((px) => {
        if (px[y]?.[x] === undefined || px[y][x] === value) return px;
        const next = clonePixels(px);
        next[y][x] = value;
        return next;
      });
    },
    [currentShade, updateFramePixels]
  );

  const drawLine = useCallback(
    (start: Point, end: Point) => {
      pushHistory();
      updateFramePixels((px) => {
        const next = clonePixels(px);
        for (const p of getLinePoints(start.x, start.y, end.x, end.y)) {
          if (next[p.y]?.[p.x] !== undefined) next[p.y][p.x] = currentShade;
        }
        return next;
      });
    },
    [currentShade, pushHistory, updateFramePixels]
  );

  const bucketFill = useCallback(
    (x: number, y: number) => {
      pushHistory();
      updateFramePixels((px) => floodFill(px, x, y, currentShade));
    },
    [currentShade, pushHistory, updateFramePixels]
  );

  const selectTool = useCallback((tool: Tool) => {
    setCurrentTool(tool);
    setLineStart(null);
    setLinePreview(null);
  }, []);

  const clearFrame = useCallback(() => {
    pushHistory();
    updateFramePixels((px) => createEmptyPixels(px[0].length, px.length));
    resetLine();
  }, [pushHistory, updateFramePixels]);

  /** Resize every frame (content preserved from the top-left). */
  const resizeCanvas = useCallback(
    (newWidth: number, newHeight: number) => {
      if (!Number.isInteger(newWidth) || !Number.isInteger(newHeight)) return; // e.g. 2.5 typed into the field
      if (newWidth < 1 || newHeight < 1 || newWidth > MAX_SPRITE_TILES_DIM || newHeight > MAX_SPRITE_TILES_DIM) return;
      if (objSize === '8x16' && newHeight % 2 !== 0) {
        alert('In 8x16 mode the sprite height must be a multiple of 16 pixels (2 tiles).');
        return;
      }
      pushHistory();
      setState((prev) => ({
        ...prev,
        tilesWidth: newWidth,
        tilesHeight: newHeight,
        frames: prev.frames.map((f) => {
          const next = createEmptyPixels(newWidth * TILE_SIZE, newHeight * TILE_SIZE);
          for (let y = 0; y < Math.min(f.pixels.length, next.length); y++) {
            for (let x = 0; x < Math.min(f.pixels[y].length, next[0].length); x++) next[y][x] = f.pixels[y][x];
          }
          return { ...f, pixels: next };
        }),
      }));
      resetLine();
    },
    [objSize, pushHistory, setState]
  );

  /** Switch OBJ size (undoable); 8x16 needs an even tile height, so an odd height is rounded up. */
  const setObjSize = useCallback(
    (size: ObjSize) => {
      if (size === objSize) return;
      pushHistory();
      setState((prev) => {
        if (size !== '8x16' || prev.tilesHeight % 2 === 0) return { ...prev, objSize: size };
        const h = Math.min(prev.tilesHeight + 1, MAX_SPRITE_TILES_DIM);
        return {
          ...prev,
          objSize: size,
          tilesHeight: h,
          frames: prev.frames.map((f) => {
            const next = createEmptyPixels(prev.tilesWidth * TILE_SIZE, h * TILE_SIZE);
            for (let y = 0; y < f.pixels.length; y++) for (let x = 0; x < f.pixels[y].length; x++) next[y][x] = f.pixels[y][x];
            return { ...f, pixels: next };
          }),
        };
      });
    },
    [objSize, pushHistory, setState]
  );

  // ---- Frames ----
  const addFrame = useCallback(() => {
    if (frames.length >= MAX_FRAMES) {
      alert(`A sprite can have at most ${MAX_FRAMES} frames.`);
      return;
    }
    pushHistory();
    setState((prev) => {
      const f = prev.frames.slice();
      f.splice(currentFrame + 1, 0, blankFrame(prev.tilesWidth, prev.tilesHeight));
      return { ...prev, frames: f };
    });
    setFrameIndex(currentFrame + 1);
  }, [frames.length, currentFrame, pushHistory, setState]);

  const duplicateFrame = useCallback(() => {
    if (frames.length >= MAX_FRAMES) {
      alert(`A sprite can have at most ${MAX_FRAMES} frames.`);
      return;
    }
    pushHistory();
    setState((prev) => {
      const f = prev.frames.slice();
      const src = f[currentFrame];
      f.splice(currentFrame + 1, 0, { pixels: clonePixels(src.pixels), duration: src.duration });
      return { ...prev, frames: f };
    });
    setFrameIndex(currentFrame + 1);
  }, [frames.length, currentFrame, pushHistory, setState]);

  const deleteFrame = useCallback(() => {
    if (frames.length <= 1) return;
    pushHistory();
    setState((prev) => ({ ...prev, frames: prev.frames.filter((_, i) => i !== currentFrame) }));
    setFrameIndex(Math.max(0, currentFrame - 1));
  }, [frames.length, currentFrame, pushHistory, setState]);

  const selectFrame = useCallback((i: number) => {
    setFrameIndex(i);
    setLineStart(null);
    setLinePreview(null);
  }, []);

  const setFrameDuration = useCallback(
    (duration: number) => {
      const d = Math.max(1, Math.min(MAX_FRAME_TICKS, Math.round(duration) || 1));
      pushHistoryOnce(`duration:${frameIndex}`);
      setState((prev) => {
        const f = prev.frames.slice();
        const i = Math.min(frameIndex, f.length - 1);
        f[i] = { ...f[i], duration: d };
        return { ...prev, frames: f };
      });
    },
    [frameIndex, pushHistoryOnce, setState]
  );

  // ---- Playback: advance the selected frame after each frame's duration ----
  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const duration = frames[currentFrame].duration;
  const frameCount = frames.length;
  useEffect(() => {
    if (!isPlaying) return;
    if (frameCount < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      const last = currentFrame >= frameCount - 1;
      if (last && !loop) {
        setIsPlaying(false);
        return;
      }
      setFrameIndex(last ? 0 : currentFrame + 1);
    }, (duration * 1000) / 60);
    return () => clearTimeout(timer);
  }, [isPlaying, currentFrame, duration, frameCount, loop]);

  const loadProjectData = useCallback(
    (data: {
      tilesWidth: number;
      tilesHeight: number;
      frames: SpriteFrame[];
      objSize: ObjSize;
      palette: 0 | 1;
      priority: boolean;
    }) => {
      clearHistory();
      resetEditStream();
      setState({ frames: data.frames, tilesWidth: data.tilesWidth, tilesHeight: data.tilesHeight, objSize: data.objSize });
      setPalette(data.palette);
      setPriority(data.priority);
      setFrameIndex(0);
      setIsPlaying(false);
      resetLine();
    },
    [clearHistory, setState, resetEditStream]
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
    frames,
    currentFrame,
    selectFrame,
    pixels,
    onionPixels: onionSkin && currentFrame > 0 ? frames[currentFrame - 1].pixels : null,
    tilesWidth,
    tilesHeight,
    objSize,
    setObjSize,
    palette,
    setPalette,
    priority,
    setPriority,
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
    clearFrame,
    resizeCanvas,
    addFrame,
    duplicateFrame,
    deleteFrame,
    setFrameDuration,
    onionSkin,
    setOnionSkin,
    isPlaying,
    togglePlay,
    loop,
    setLoop,
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
