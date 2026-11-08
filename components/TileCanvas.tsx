'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Tool, Point } from '@/types';
import { isZoomWheel, zoomStep } from '@/utils/wheel';
import { TILE_SIZE, PalettePreset } from '@/constants';
import { getLinePoints } from '@/utils/drawing';

/** The work area is the window minus the 40px navbar (h-screen would run 40px off the bottom). */
import { WORK_AREA_HEIGHT } from './CellGridCanvas';

interface TileCanvasProps {
  pixels: number[][];
  tilesWidth: number;
  tilesHeight: number;
  pixelSize: number;
  preset: PalettePreset;
  showTileNumbers: boolean;
  /** Previous frame shown faintly behind shade-0 pixels (sprite editor onion skin) */
  onionPixels?: number[][] | null;
  /** Tailwind height class for the canvas area (default fills the window below the navbar) */
  heightClassName?: string;
  currentTool: Tool;
  lineStart: Point | null;
  linePreview: Point | null;
  isDrawing: boolean;
  backgroundImage: HTMLImageElement | null;
  backgroundOpacity: number;
  backgroundEnabled: boolean;
  backgroundX: number;
  backgroundY: number;
  backgroundScale: number;
  backgroundAdjustMode: boolean;
  onSetIsDrawing: (drawing: boolean) => void;
  onStrokeStart: () => void;
  onSetPixel: (x: number, y: number, erase: boolean) => void;
  onDrawLine: (start: Point, end: Point) => void;
  onSetLineStart: (point: Point | null) => void;
  onSetLinePreview: (point: Point | null) => void;
  onBucketFill: (x: number, y: number) => void;
  onBackgroundMove: (x: number, y: number) => void;
  onBackgroundScale: (scale: number) => void;
  onPixelSizeChange: (size: number) => void;
}

export function TileCanvas({
  pixels,
  tilesWidth,
  tilesHeight,
  pixelSize,
  preset,
  showTileNumbers,
  onionPixels = null,
  heightClassName = WORK_AREA_HEIGHT,
  currentTool,
  lineStart,
  linePreview,
  isDrawing,
  backgroundImage,
  backgroundOpacity,
  backgroundEnabled,
  backgroundX,
  backgroundY,
  backgroundScale,
  backgroundAdjustMode,
  onSetIsDrawing,
  onStrokeStart,
  onSetPixel,
  onDrawLine,
  onSetLineStart,
  onSetLinePreview,
  onBucketFill,
  onBackgroundMove,
  onBackgroundScale,
  onPixelSizeChange,
}: TileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingBackground = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialBackgroundPos = useRef({ x: 0, y: 0 });

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const wheelAcc = useRef(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const canvasWidth = tilesWidth * TILE_SIZE;
  const canvasHeight = tilesHeight * TILE_SIZE;
  const tracing = !!backgroundImage && backgroundEnabled;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tracing && backgroundImage) {
      ctx.globalAlpha = backgroundOpacity;
      ctx.drawImage(
        backgroundImage,
        backgroundX * pixelSize,
        backgroundY * pixelSize,
        canvas.width * backgroundScale,
        canvas.height * backgroundScale
      );
      ctx.globalAlpha = 1;
    }

    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const shade = pixels[y][x];
        // Let the tracing image show through shade 0
        if (shade === 0 && tracing) continue;
        ctx.fillStyle = preset.colours[shade];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        const ghost = shade === 0 ? onionPixels?.[y]?.[x] : 0;
        if (ghost) {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = preset.colours[ghost];
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Pixel grid
    ctx.strokeStyle = '#33553366';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * pixelSize, 0);
      ctx.lineTo(x * pixelSize, canvasHeight * pixelSize);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * pixelSize);
      ctx.lineTo(canvasWidth * pixelSize, y * pixelSize);
      ctx.stroke();
    }

    // Tile grid (thicker)
    ctx.strokeStyle = '#6666aa';
    ctx.lineWidth = 2;
    for (let x = 0; x <= tilesWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE * pixelSize, 0);
      ctx.lineTo(x * TILE_SIZE * pixelSize, canvasHeight * pixelSize);
      ctx.stroke();
    }
    for (let y = 0; y <= tilesHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE * pixelSize);
      ctx.lineTo(canvasWidth * pixelSize, y * TILE_SIZE * pixelSize);
      ctx.stroke();
    }

    if (showTileNumbers) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      for (let ty = 0; ty < tilesHeight; ty++) {
        for (let tx = 0; tx < tilesWidth; tx++) {
          const label = (ty * tilesWidth + tx).toString(16).toUpperCase().padStart(2, '0');
          ctx.fillText(label, tx * TILE_SIZE * pixelSize + 3, ty * TILE_SIZE * pixelSize + 12);
        }
      }
    }

    if (currentTool === 'line' && lineStart && linePreview) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (const p of getLinePoints(lineStart.x, lineStart.y, linePreview.x, linePreview.y)) {
        ctx.fillRect(p.x * pixelSize + 2, p.y * pixelSize + 2, pixelSize - 4, pixelSize - 4);
      }
    }
  }, [pixels, onionPixels, preset, canvasWidth, canvasHeight, tilesWidth, tilesHeight, pixelSize, showTileNumbers, currentTool, lineStart, linePreview, tracing, backgroundImage, backgroundOpacity, backgroundX, backgroundY, backgroundScale]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Wheel: zoom (or scale the tracing image in adjust mode)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (backgroundAdjustMode && tracing) {
        onBackgroundScale(Math.max(0.1, Math.min(5, backgroundScale + (e.deltaY > 0 ? -0.1 : 0.1))));
        return;
      }
      if (!isZoomWheel(e)) {
        setPanOffset((o) => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
        return;
      }
      const step = zoomStep(wheelAcc, e.deltaY);
      const newSize = Math.max(1, pixelSize + step);
      if (step && newSize !== pixelSize) onPixelSizeChange(newSize);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [pixelSize, onPixelSizeChange, backgroundAdjustMode, tracing, backgroundScale, onBackgroundScale]);

  const getPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    return x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight ? { x, y } : null;
  };

  const startPan = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (backgroundAdjustMode && tracing && e.button === 0) {
      isDraggingBackground.current = true;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        initialBackgroundPos.current = { x: backgroundX, y: backgroundY };
      }
      return;
    }
    if (e.button === 1 || e.button === 2 || (currentTool === 'pan' && e.button === 0)) {
      startPan(e);
      return;
    }

    const coords = getPixelCoords(e);
    if (!coords) return;

    if (currentTool === 'pencil' || currentTool === 'rubber') {
      onStrokeStart();
      onSetIsDrawing(true);
      onSetPixel(coords.x, coords.y, currentTool === 'rubber');
    } else if (currentTool === 'line') {
      if (!lineStart) {
        onSetLineStart(coords);
        onSetLinePreview(coords);
      } else {
        onDrawLine(lineStart, coords);
        onSetLineStart(null);
        onSetLinePreview(null);
      }
    } else if (currentTool === 'bucket') {
      onBucketFill(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingBackground.current && backgroundAdjustMode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        onBackgroundMove(
          initialBackgroundPos.current.x + (e.clientX - rect.left - dragStart.current.x) / pixelSize,
          initialBackgroundPos.current.y + (e.clientY - rect.top - dragStart.current.y) / pixelSize
        );
      }
      return;
    }
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    const coords = getPixelCoords(e);
    if (!coords) return;
    if ((currentTool === 'pencil' || currentTool === 'rubber') && isDrawing) {
      onSetPixel(coords.x, coords.y, currentTool === 'rubber');
    } else if (currentTool === 'line' && lineStart) {
      onSetLinePreview(coords);
    }
  };

  const stopInteraction = () => {
    isDraggingBackground.current = false;
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    onSetIsDrawing(false);
  };

  const statusMessage = (() => {
    if (backgroundAdjustMode && tracing) return 'Drag to move image, scroll to scale';
    switch (currentTool) {
      case 'pan': return 'Click and drag to pan; scroll also pans, pinch or Ctrl/Cmd+scroll zooms';
      case 'line': return lineStart ? 'Click to set line end point' : 'Click to set line start point';
      case 'pencil': return 'Click and drag to draw';
      case 'bucket': return 'Click to flood-fill a region with the current shade';
      case 'rubber': return 'Click and drag to erase (shade 0)';
    }
  })();

  const cursorClass = backgroundAdjustMode
    ? 'cursor-move'
    : isPanning
      ? 'cursor-grabbing'
      : currentTool === 'pan'
        ? 'cursor-grab'
        : 'cursor-crosshair';

  return (
    <div className={`p-4 ${heightClassName} flex flex-col`}>
      {/* m-auto centres the canvas when it fits and lets it scroll from its top-left when it does not
          (items-center/justify-center would push the top and left of a big canvas out of reach) */}
      <div ref={containerRef} className="flex-1 min-h-0 bg-gray-800 rounded-lg p-4 overflow-auto flex">
        <div className="flex flex-col items-center m-auto">
          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
            <canvas
              ref={canvasRef}
              width={canvasWidth * pixelSize}
              height={canvasHeight * pixelSize}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopInteraction}
              onMouseLeave={stopInteraction}
              onContextMenu={(e) => e.preventDefault()}
              className={`border border-gray-600 ${cursorClass}`}
              data-testid="tile-canvas"
            />
          </div>
          <div className="mt-2 text-sm text-gray-400 text-center">
            <p>{statusMessage}</p>
            <p className="text-xs text-gray-500 mt-1">Scroll or right-click drag to pan • Pinch or Ctrl/Cmd+scroll to zoom</p>
          </div>
        </div>
      </div>
    </div>
  );
}
