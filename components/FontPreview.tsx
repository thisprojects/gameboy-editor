'use client';

import { useRef, useEffect } from 'react';
import { PalettePreset, TILE_SIZE } from '@/constants';
import { FIRST_CHAR, GLYPH_COUNT, PREVIEW_COLS } from '@/constants/font';
import { Tile } from '@/types/map';

interface FontPreviewProps {
  glyphs: Tile[];
  text: string;
  preset: PalettePreset;
  scale?: number;
}

/** Lay text out as a Game Boy screen would: 20 tiles per row, newlines honoured. */
export function layoutText(text: string, cols = PREVIEW_COLS): (number | null)[][] {
  const rows: (number | null)[][] = [];
  for (const line of text.split('\n')) {
    let row: (number | null)[] = [];
    for (const ch of line) {
      const index = ch.charCodeAt(0) - FIRST_CHAR;
      if (row.length === cols) {
        rows.push(row);
        row = [];
      }
      row.push(index >= 0 && index < GLYPH_COUNT ? index : null);
    }
    rows.push(row);
  }
  return rows;
}

/** Renders sample text with the current font on the palette's lightest shade. */
export function FontPreview({ glyphs, text, preset, scale = 2 }: FontPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = layoutText(text);
  const cell = TILE_SIZE * scale;
  const width = PREVIEW_COLS * cell;
  const height = Math.max(rows.length, 1) * cell;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = preset.colours[0];
    ctx.fillRect(0, 0, width, height);
    rows.forEach((row, ry) =>
      row.forEach((index, rx) => {
        if (index === null) return;
        const glyph = glyphs[index];
        for (let y = 0; y < TILE_SIZE; y++) {
          for (let x = 0; x < TILE_SIZE; x++) {
            if (glyph[y][x] === 0) continue;
            ctx.fillStyle = preset.colours[glyph[y][x]];
            ctx.fillRect(rx * cell + x * scale, ry * cell + y * scale, scale, scale);
          }
        }
      })
    );
  });

  return <canvas ref={canvasRef} width={width} height={height} className="border border-gray-600" data-testid="font-preview" />;
}
