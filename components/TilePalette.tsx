'use client';

import { useRef, useEffect } from 'react';
import { PalettePreset, TILE_SIZE } from '@/constants';
import { Tile } from '@/types/map';

interface TilePaletteProps {
  tiles: Tile[];
  selected: number;
  onSelect: (index: number) => void;
  preset: PalettePreset;
  columns?: number;
  /** Screen pixels per tile pixel */
  scale?: number;
}

/** Clickable grid of the tileset, used to pick the brush tile. */
export function TilePalette({ tiles, selected, onSelect, preset, columns = 8, scale = 3 }: TilePaletteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cell = TILE_SIZE * scale;
  const rows = Math.ceil(tiles.length / columns);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    tiles.forEach((tile, i) => {
      const ox = (i % columns) * cell;
      const oy = Math.floor(i / columns) * cell;
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          ctx.fillStyle = preset.colours[tile[y][x]];
          ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
        }
      }
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect((selected % columns) * cell + 1, Math.floor(selected / columns) * cell + 1, cell - 2, cell - 2);
  }, [tiles, selected, preset, columns, cell, scale]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cell);
    const row = Math.floor((e.clientY - rect.top) / cell);
    const index = row * columns + col;
    if (col >= 0 && col < columns && row >= 0 && index < tiles.length) onSelect(index);
  };

  return (
    <canvas
      ref={canvasRef}
      width={columns * cell}
      height={rows * cell}
      onClick={handleClick}
      className="border border-gray-600 cursor-pointer"
      data-testid="tile-palette"
      aria-label="Tileset"
    />
  );
}
