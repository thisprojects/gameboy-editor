'use client';

import { useEffect, useRef } from 'react';
import { BsChevronUp } from 'react-icons/bs';

interface Action {
  label: string;
  onClick: () => void;
}

interface FileActionsProps {
  onLoad: () => void;
  onSave: () => void;
  imports?: Action[];
  exports: Action[];
  /** The destructive action (clear everything), kept apart and red. */
  clear?: Action;
}

const cell = 'rounded px-2 py-2 text-sm bg-gray-700 text-gray-200 hover:bg-gray-600';

/**
 * Project file actions pinned to the bottom of the toolbar so they never scroll out of reach:
 * Load / Save / imports in a grid, the exports in a pop-up menu, and the destructive Clear apart.
 */
export function FileActions({ onLoad, onSave, imports = [], exports, clear }: FileActionsProps) {
  const menu = useRef<HTMLDetailsElement>(null);

  // close the export menu on a click elsewhere or Escape
  useEffect(() => {
    const close = () => menu.current?.removeAttribute('open');
    const onDown = (e: MouseEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="sticky bottom-0 -mx-3 -mb-3 mt-auto space-y-1.5 pt-2.5 border-t border-gray-700 bg-gray-800 px-3 pb-2.5" data-testid="file-actions">
      <div className="grid grid-cols-2 gap-1.5">
        <button className={cell} onClick={onLoad}>Load project</button>
        <button className={cell} onClick={onSave}>Save project</button>
        {imports.map((a) => (
          <button key={a.label} className={`${cell} col-span-2`} onClick={a.onClick}>{a.label}</button>
        ))}
      </div>
      <div className={`grid gap-1.5 ${clear ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <details ref={menu} className="relative">
          <summary className={`${cell} flex cursor-pointer select-none list-none items-center justify-center gap-1.5 [&::-webkit-details-marker]:hidden`}>
            Export <BsChevronUp size={10} aria-hidden />
          </summary>
          <div
            className="absolute bottom-full left-0 mb-1 w-[200px] space-y-1 rounded-lg border border-gray-600 bg-gray-800 p-1.5 shadow-xl"
            onClick={() => menu.current?.removeAttribute('open')}
          >
            {exports.map((a) => (
              <button key={a.label} className={`${cell} w-full text-left`} onClick={a.onClick}>{a.label}</button>
            ))}
          </div>
        </details>
        {clear && (
          <button className="rounded bg-red-800 px-2 py-2 text-sm text-white hover:bg-red-700" onClick={clear.onClick}>{clear.label}</button>
        )}
      </div>
    </div>
  );
}
