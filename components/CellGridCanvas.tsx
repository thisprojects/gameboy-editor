'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Point } from '@/types';
import { isZoomWheel, zoomStep } from '@/utils/wheel';

/** The work area is the window minus the 40px navbar (h-screen would run 40px off the bottom). */
export const WORK_AREA_HEIGHT = 'h-[calc(100vh-40px)]';

interface CellGridCanvasProps {
  cols: number;
  rows: number;
  /** Screen pixels per cell (width; also the height unless `cellHeight` is given) */
  cellSize: number;
  /** Screen pixels of cell height, for cells that are not square */
  cellHeight?: number;
  /** Draw one cell; (px, py) is its top-left on the canvas. Pass a stable (memoised) function. */
  renderCell: (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, width: number, height: number) => void;
  /** Optional drawing on top of the cells and grid. Pass a stable (memoised) function. */
  overlay?: (ctx: CanvasRenderingContext2D) => void;
  showGrid: boolean;
  panTool: boolean;
  status: string;
  /** Text shown under the canvas while hovering a cell */
  hoverLabel?: (x: number, y: number) => string;
  onBeginStroke: (cell: Point) => void;
  onContinueStroke: (cell: Point) => void;
  onEndStroke: (cell: Point | null) => void;
  /** Wheel step: +1 zoom in, -1 zoom out */
  onWheelZoom: (direction: 1 | -1) => void;
  testId?: string;
}

/** Generic editable grid of cells with zoom (wheel) and pan (pan tool only). */
export function CellGridCanvas({
  cols,
  rows,
  cellSize,
  cellHeight: cellHeightProp,
  renderCell,
  overlay,
  showGrid,
  panTool,
  status,
  hoverLabel,
  onBeginStroke,
  onContinueStroke,
  onEndStroke,
  onWheelZoom,
  testId = 'cell-grid-canvas',
}: CellGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<Point | null>(null);
  const wheelAcc = useRef(0);

  const cellH = cellHeightProp ?? cellSize;
  const width = cols * cellSize;
  const height = rows * cellH;

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) renderCell(ctx, x, y, x * cellSize, y * cellH, cellSize, cellH);
    }
    if (showGrid) {
      ctx.strokeStyle = '#6666aa66';
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, height);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellH);
        ctx.lineTo(width, y * cellH);
        ctx.stroke();
      }
    }
    overlay?.(ctx);
  }, [cols, rows, cellSize, cellH, width, height, renderCell, overlay, showGrid]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (!isZoomWheel(e)) {
        // other tools: let the work area scroll natively
        if (!panTool) return;
        e.preventDefault();
        e.stopPropagation();
        setPanOffset((o) => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const step = zoomStep(wheelAcc, e.deltaY);
      if (step) onWheelZoom(step);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onWheelZoom, panTool]);

  const getCell = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellH);
    return x >= 0 && x < cols && y >= 0 && y < rows ? { x, y } : null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panTool && (e.button === 0 || e.button === 1 || e.button === 2)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    if (panTool || e.button !== 0) return;
    const c = getCell(e);
    if (c) onBeginStroke(c);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    const c = getCell(e);
    setHover(c);
    if (c) onContinueStroke(c);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (e.button !== 0) return;
    onEndStroke(getCell(e));
  };

  const handleMouseLeave = () => {
    setHover(null);
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    onEndStroke(null);
  };

  const cursorClass = isPanning ? 'cursor-grabbing' : panTool ? 'cursor-grab' : 'cursor-crosshair';

  return (
    <div className={`p-4 ${WORK_AREA_HEIGHT} flex flex-col`}>
      {/* m-auto centres the canvas when it fits and lets it scroll from its top-left when it does not
          (items-center/justify-center would push the top and left of a big canvas out of reach) */}
      <div ref={containerRef} className="flex-1 min-h-0 bg-gray-800 rounded-lg p-4 overflow-auto flex">
        <div className="flex flex-col items-center m-auto">
          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onContextMenu={(e) => e.preventDefault()}
              className={`border border-gray-600 ${cursorClass}`}
              data-testid={testId}
            />
          </div>
          <div className="mt-2 text-sm text-gray-400 text-center">
            <p>{status}</p>
            <p className="text-xs text-gray-500 mt-1">
              {hover && hoverLabel ? hoverLabel(hover.x, hover.y) : 'Pinch or Ctrl/Cmd+scroll to zoom'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
