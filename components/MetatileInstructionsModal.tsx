'use client';

import { useState } from 'react';

const STORAGE_KEY = 'metatileEditor_hideInstructions';

interface MetatileInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MetatileInstructionsModal({ isOpen, onClose }: MetatileInstructionsModalProps) {
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
          <h2 className="text-xl font-bold text-white">Metatile Editor — How to Use</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300">
          <section className="rounded-md bg-gray-900/60 border border-gray-700 p-3">
            <h3 className="text-base font-semibold text-white mb-1">What you would make with this</h3>
            <p className="text-white mb-1">Build bigger reusable pieces, like a tree, a wall, a door or a block of floor.</p>
            <p>
              A metatile joins a few tiles into one block of any width and height you choose (2×2, 4×4, or 1×4 for a long floor) that you can stamp down in a single click. You also mark each block <strong className="text-white">solid</strong> or not, so the game knows what the player can walk through. It&apos;s the parts bin for the Level Editor: build the pieces here, then arrange them there.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">What is a metatile?</h3>
            <p>
              A <strong className="text-white">metatile</strong> is a block of tiles, from 1×1 up to 16×16 and any
              shape (for example 2×2, or 1×4 for a long floor strip), used as one building block of a level. A level then stores one byte per metatile instead of one per tile,
              which saves a lot of ROM. A metatile is only an arrangement of existing tiles, and each one can be flagged
              solid for collision.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Building metatiles</h3>
            <p>
              Import a tileset from the Tile Editor, pick a tile in the palette, and stamp it into the metatile on the
              canvas. Add, duplicate or delete metatiles (up to 256), and tick{' '}
              <strong className="text-white">Solid</strong> to mark a metatile as a collision block. Set the metatile width and height in tiles; every metatile in
              the library shares that size, and changing it keeps each metatile&apos;s top-left content.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Exporting</h3>
            <p>
              RGBDS and C exports contain the tiles used, a metatile table (<em>width × height</em> tile indices per metatile,
              row by row) and a collision table (one byte per metatile). Save the project as JSON to load the library into
              the Level Editor.
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

export function shouldShowMetatileInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}
