'use client';

import { useCallback, useMemo } from 'react';
import { Point } from '@/types';
import { MapTool, Tile } from '@/types/map';
import { PalettePreset, TILE_SIZE, SCREEN_TILES_X, SCREEN_TILES_Y } from '@/constants';
import { MAP_SIZE } from '@/constants/map';
import { renderTileCanvas } from '@/utils/render';
import { CellGridCanvas } from './CellGridCanvas';

interface MapCanvasProps {
  map: number[][];
  tiles: Tile[];
  preset: PalettePreset;
  /** Screen pixels per tile pixel */
  zoom: number;
  currentTool: MapTool;
  showGrid: boolean;
  showViewport: boolean;
  scx: number;
  scy: number;
  rectStart: Point | null;
  rectEnd: Point | null;
  onBeginStroke: (cell: Point) => void;
  onContinueStroke: (cell: Point) => void;
  onEndStroke: (cell: Point | null) => void;
  onZoomChange: (zoom: number) => void;
}

const STATUS: Record<MapTool, string> = {
  stamp: 'Click and drag to paint the selected tile',
  rect: 'Drag to fill a rectangle with the selected tile',
  fill: 'Click to flood-fill matching tiles',
  pick: 'Click a map cell to pick its tile',
  rubber: 'Click and drag to erase (tile 0)',
  pan: 'Click and drag to pan, scroll to zoom',
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

/** The 32x32 background map: each cell is drawn from a cached image of its tile, so painting stays fast. */
export function MapCanvas({
  map,
  tiles,
  preset,
  zoom,
  currentTool,
  showGrid,
  showViewport,
  scx,
  scy,
  rectStart,
  rectEnd,
  onBeginStroke,
  onContinueStroke,
  onEndStroke,
  onZoomChange,
}: MapCanvasProps) {
  const cell = TILE_SIZE * zoom;

  // One small offscreen image per tile, redrawn only when the tileset or palette changes
  // (skipped during server prerendering, where there is no document; cells are only drawn in effects)
  const tileImages = useMemo(
    () => (typeof document === 'undefined' ? [] : tiles.map((t) => renderTileCanvas(t, preset))),
    [tiles, preset]
  );

  const renderCell = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, size: number) => {
      ctx.drawImage(tileImages[map[y][x]] ?? tileImages[0], px, py, size, size);
    },
    [tileImages, map]
  );

  const overlay = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (showViewport) {
        // Outline the 20x18 screen; it wraps around the 32x32 map like the hardware does.
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        for (let vy = 0; vy < SCREEN_TILES_Y; vy++) {
          for (let vx = 0; vx < SCREEN_TILES_X; vx++) {
            const x = ((scx + vx) % MAP_SIZE) * cell;
            const y = ((scy + vy) % MAP_SIZE) * cell;
            ctx.beginPath();
            if (vy === 0) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
            if (vy === SCREEN_TILES_Y - 1) { ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); }
            if (vx === 0) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
            if (vx === SCREEN_TILES_X - 1) { ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); }
            ctx.stroke();
          }
        }
      }
      if (currentTool === 'rect' && rectStart && rectEnd) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.fillRect(
          Math.min(rectStart.x, rectEnd.x) * cell,
          Math.min(rectStart.y, rectEnd.y) * cell,
          (Math.abs(rectEnd.x - rectStart.x) + 1) * cell,
          (Math.abs(rectEnd.y - rectStart.y) + 1) * cell
        );
      }
    },
    [showViewport, scx, scy, cell, currentTool, rectStart, rectEnd]
  );

  const onWheelZoom = useCallback(
    (direction: 1 | -1) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + direction));
      if (next !== zoom) onZoomChange(next);
    },
    [zoom, onZoomChange]
  );

  return (
    <CellGridCanvas
      testId="map-canvas"
      cols={MAP_SIZE}
      rows={MAP_SIZE}
      cellSize={cell}
      renderCell={renderCell}
      overlay={overlay}
      showGrid={showGrid}
      panTool={currentTool === 'pan'}
      status={STATUS[currentTool]}
      hoverLabel={(x, y) => `Cell ${x},${y} — tile ${map[y][x]}`}
      onBeginStroke={onBeginStroke}
      onContinueStroke={onContinueStroke}
      onEndStroke={onEndStroke}
      onWheelZoom={onWheelZoom}
    />
  );
}
