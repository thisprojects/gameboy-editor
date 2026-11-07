'use client';

import { useRef, useEffect } from 'react';
import { PalettePreset, TILE_SIZE } from '@/constants';
import { GLYPH_COUNT, GRID_COLS, FIRST_CHAR } from '@/constants/font';
import { Tile } from '@/types/map';

interface FontGridProps {
  glyphs: Tile[];
  selected: number;
  onSelect: (index: number) => void;
  preset: PalettePreset;
}

const SCALE = 3;
const PAD = 2;
const CELL = TILE_SIZE * SCALE + PAD * 2;
const ROWS = Math.ceil(GLYPH_COUNT / GRID_COLS);

/** Overview of all 96 glyphs; click one to edit it. */
export function FontGrid({ glyphs, selected, onSelect, preset }: FontGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    glyphs.forEach((glyph, i) => {
      const cx = (i % GRID_COLS) * CELL;
      const cy = Math.floor(i / GRID_COLS) * CELL;
      ctx.fillStyle = i === selected ? '#1d4ed8' : '#1f2937';
      ctx.fillRect(cx, cy, CELL, CELL);
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          ctx.fillStyle = preset.colours[glyph[y][x]];
          ctx.fillRect(cx + PAD + x * SCALE, cy + PAD + y * SCALE, SCALE, SCALE);
        }
      }
    });
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect((selected % GRID_COLS) * CELL + 1, Math.floor(selected / GRID_COLS) * CELL + 1, CELL - 2, CELL - 2);
  }, [glyphs, selected, preset]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL);
    const row = Math.floor((e.clientY - rect.top) / CELL);
    const index = row * GRID_COLS + col;
    if (col >= 0 && col < GRID_COLS && row >= 0 && index < GLYPH_COUNT) onSelect(index);
  };

  return (
    <canvas
      ref={canvasRef}
      width={GRID_COLS * CELL}
      height={ROWS * CELL}
      onClick={handleClick}
      className="border border-gray-600 cursor-pointer"
      data-testid="font-grid"
      aria-label={`Glyphs ${FIRST_CHAR}-${FIRST_CHAR + GLYPH_COUNT - 1}`}
    />
  );
}
