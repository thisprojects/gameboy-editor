'use client';

import { useState } from 'react';

const STORAGE_KEY = 'spriteEditor_hideInstructions';

interface SpriteInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpriteInstructionsModal({ isOpen, onClose }: SpriteInstructionsModalProps) {
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
          <h2 className="text-xl font-bold text-white">Sprite Editor — How to Use</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300">
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Hardware sprites</h3>
            <p>
              The Game Boy has <strong className="text-white">40 hardware sprites</strong> (OAM entries), each one 8×8 or
              8×16 pixels. Larger characters are built from several entries, so a sprite here is a grid of tiles up to
              32×32 pixels. There is no mask or pre-shifting as on the ZX Spectrum — <strong className="text-white">colour
              0 is transparent</strong>.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Drawing and animation</h3>
            <p>
              Draw with the same tools as the tile editor. Add up to <strong className="text-white">32 frames</strong>, set
              each frame&apos;s duration in 1/60 s ticks, turn on onion skin to see the previous frame, and press Play to
              preview the animation.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">OBJ size, palette and priority</h3>
            <p>
              <strong className="text-white">8×16</strong> mode pairs tiles top/bottom (the height must be a multiple of
              16 px). The palette choice previews OBP0 or OBP1 and sets the palette bit in the exported attribute byte;
              <em> priority</em> draws the sprite behind non-zero background colours.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Exporting</h3>
            <p>
              RGBDS and C exports contain the tile data (empty tiles are skipped), a table of OAM entries per frame
              (<code className="bg-gray-700 px-1 rounded">y_offset, x_offset, tile, attr</code>), a frame table and frame
              durations. Add 16 to Y and 8 to X plus your position when writing to OAM. Flip flags can be OR-ed into the
              attribute at runtime.
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

export function shouldShowSpriteInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}
