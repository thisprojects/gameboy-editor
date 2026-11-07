'use client';

import { useState } from 'react';

const STORAGE_KEY = 'levelEditor_hideInstructions';

interface LevelInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LevelInstructionsModal({ isOpen, onClose }: LevelInstructionsModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Level Editor — How to Use</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300">
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Scrolling levels from metatiles</h3>
            <p>
              Game Boy levels are usually bigger than one screen and scroll. Here a level is a grid of{' '}
              <strong className="text-white">metatiles</strong> (up to 256×256 tiles in total) instead of the separate
              screens used by the ZX level editor. The red outline shows what one 20×18-tile screen covers at the chosen
              SCX/SCY, in tiles.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Metatile library</h3>
            <p>
              Import a library saved from the Metatile Editor (<code className="bg-gray-700 px-1 rounded">.json</code>); it
              includes the tileset and collision flags. Importing a smaller library resets level cells that pointed past it
              to metatile 0, and the level is cropped if the new metatile size allows fewer cells. Solid metatiles are tinted
              red when <em>Show collision</em> is on.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Painting</h3>
            <p>
              Stamp paints single cells, Rectangle fills a dragged area, Fill flood-fills matching metatiles, Pick copies a
              metatile from the level and Rubber writes metatile 0.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Exporting</h3>
            <p>
              RGBDS and C exports contain the tiles used, the metatile table, the collision table and the level map (one
              metatile index per cell, row by row). <strong className="text-white">Export tile map</strong> writes the level
              with every metatile expanded to plain tile indices, ready to copy to the background map.
            </p>
          </section>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            Don&apos;t show this again
          </label>
          <button onClick={handleClose} className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowLevelInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}
