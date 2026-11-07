'use client';

import { useRef, useEffect } from 'react';
import { WAVE_LENGTH } from '@/constants/music';

interface WaveEditorProps {
  wave: number[];
  /** Set one sample (0-15). Called repeatedly while dragging. */
  onSetSample: (step: number, value: number) => void;
  /** Called once when a drag starts (for undo history). */
  onStrokeStart: () => void;
}

const CELL_W = 10;
const CELL_H = 8;
const LEVELS = 16;

/** 32 samples x 16 levels. Click or drag to draw the waveform. */
export function WaveEditor({ wave, onSetSample, onStrokeStart }: WaveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, WAVE_LENGTH * CELL_W, LEVELS * CELL_H);
    wave.forEach((value, step) => {
      ctx.fillStyle = '#34d399';
      ctx.fillRect(step * CELL_W, (LEVELS - 1 - value) * CELL_H, CELL_W - 1, (value + 1) * CELL_H);
    });
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= WAVE_LENGTH; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_W, 0);
      ctx.lineTo(i * CELL_W, LEVELS * CELL_H);
      ctx.stroke();
    }
  }, [wave]);

  const setFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const step = Math.floor((e.clientX - rect.left) / CELL_W);
    const level = LEVELS - 1 - Math.floor((e.clientY - rect.top) / CELL_H);
    if (step < 0 || step >= WAVE_LENGTH) return;
    onSetSample(step, Math.max(0, Math.min(LEVELS - 1, level)));
  };

  return (
    <canvas
      ref={canvasRef}
      width={WAVE_LENGTH * CELL_W}
      height={LEVELS * CELL_H}
      aria-label="Waveform"
      data-testid="wave-editor"
      className="border border-gray-600 cursor-crosshair"
      onMouseDown={(e) => {
        drawing.current = true;
        onStrokeStart();
        setFromEvent(e);
      }}
      onMouseMove={(e) => drawing.current && setFromEvent(e)}
      onMouseUp={() => (drawing.current = false)}
      onMouseLeave={() => (drawing.current = false)}
    />
  );
}
