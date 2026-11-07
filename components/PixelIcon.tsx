import { PALETTE_PRESETS } from '@/constants';

interface PixelIconProps {
  /** Rows of equal length: '.' is transparent, ':' light, 'o' mid and '#' dark green */
  art: string[];
  className?: string;
}

const SHADES: Record<string, string> = {
  ':': PALETTE_PRESETS[0].colours[1],
  o: PALETTE_PRESETS[0].colours[2],
  '#': PALETTE_PRESETS[0].colours[3],
};

/** Pixel art drawn as crisp SVG rectangles (neighbouring pixels of one shade are merged into one run). */
export function PixelIcon({ art, className }: PixelIconProps) {
  const width = art[0]?.length ?? 0;
  const runs: { x: number; y: number; length: number; fill: string }[] = [];
  art.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const fill = SHADES[row[x]];
      let end = x + 1;
      while (end < row.length && row[end] === row[x]) end++;
      if (fill) runs.push({ x, y, length: end - x, fill });
      x = end;
    }
  });

  return (
    <svg viewBox={`0 0 ${width} ${art.length}`} shapeRendering="crispEdges" aria-hidden="true" className={className} data-testid="pixel-icon">
      {runs.map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.length} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
