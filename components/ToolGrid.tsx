'use client';

import { toolTitle } from '@/constants/toolHints';

interface ToolGridProps<T extends string> {
  tools: { tool: T; label: string; icon: React.ReactNode }[];
  current: T;
  onSelect: (tool: T) => void;
}

const COLS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5',
};

/** Tool buttons in an even grid: up to 5 in one row, more are split over two balanced rows (never one orphan). */
export function ToolGrid<T extends string>({ tools, current, onSelect }: ToolGridProps<T>) {
  const cols = COLS[tools.length > 5 ? Math.ceil(tools.length / 2) : tools.length] ?? 'grid-cols-4';
  return (
    <div className={`grid ${cols} gap-1`}>
      {tools.map(({ tool, label, icon }) => (
        <button
          key={tool}
          title={toolTitle(label)}
          aria-label={label}
          aria-pressed={current === tool}
          onClick={() => onSelect(tool)}
          className={`flex h-9 items-center justify-center rounded ${current === tool ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
