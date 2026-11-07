'use client';

import { useRef, useEffect } from 'react';
import { PalettePreset } from '@/constants';
import { Tile } from '@/types/map';
import { Metatile } from '@/types/metatile';
import { renderMetatileCanvas } from '@/utils/render';

interface MetatilePaletteProps {
  metatiles: Metatile[];
  tiles: Tile[];
  selected: number;
  onSelect: (index: number) => void;
  preset: PalettePreset;
  columns?: number;
  /** Thumbnail edge in screen pixels */
  thumb?: number;
}

const PAD = 2;

/** Clickable thumbnails of the metatile library. Solid metatiles get a red corner marker. */
export function MetatilePalette({ metatiles, tiles, selected, onSelect, preset, columns = 5, thumb = 32 }: MetatilePaletteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cell = thumb + PAD * 2;
  const rows = Math.ceil(metatiles.length / columns);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    metatiles.forEach((m, i) => {
      const x = (i % columns) * cell;
      const y = Math.floor(i / columns) * cell;
      ctx.fillStyle = i === selected ? '#1d4ed8' : '#1f2937';
      ctx.fillRect(x, y, cell, cell);
      ctx.drawImage(renderMetatileCanvas(m.tiles, tiles, preset), x + PAD, y + PAD, thumb, thumb);
      if (m.solid) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x + PAD, y + PAD, 8, 8);
      }
    });
  }, [metatiles, tiles, selected, preset, columns, cell, thumb]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cell);
    const row = Math.floor((e.clientY - rect.top) / cell);
    const index = row * columns + col;
    if (col >= 0 && col < columns && row >= 0 && index < metatiles.length) onSelect(index);
  };

  return (
    <canvas
      ref={canvasRef}
      width={columns * cell}
      height={rows * cell}
      onClick={handleClick}
      className="border border-gray-600 cursor-pointer"
      data-testid="metatile-palette"
      aria-label="Metatiles"
    />
  );
}
