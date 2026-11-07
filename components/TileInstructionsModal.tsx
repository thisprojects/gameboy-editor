'use client';

import { useState } from 'react';

const STORAGE_KEY = 'tileEditor_hideInstructions';

interface TileInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TileInstructionsModal({ isOpen, onClose }: TileInstructionsModalProps) {
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
          <h2 className="text-xl font-bold text-white">Tile Editor — How to Use</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300">
          <section className="rounded-md bg-gray-900/60 border border-gray-700 p-3">
            <h3 className="text-base font-semibold text-white mb-1">What you would make with this</h3>
            <p className="text-white mb-1">Draw the little pictures everything else is built from.</p>
            <p>
              Think of this as your art box. You draw small 8×8 pixel squares (<strong className="text-white">tiles</strong>) in four shades: a patch of grass, a brick, a face, the corner of a window, a letter. A whole game&apos;s artwork is a collection of these. Save the set and the Background and Metatile editors can import it (the Level Editor gets it through the metatiles). The Sprite Editor is separate: you draw sprites directly in it.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">What are tiles?</h3>
            <p>
              The Game Boy draws everything from <strong className="text-white">8×8 pixel tiles</strong> with{' '}
              <strong className="text-white">4 shades</strong> (2 bits per pixel). Backgrounds and sprites both
              reference tiles stored in VRAM, which holds up to <strong className="text-white">384</strong>. Every pixel can use any of the 4 shades;
              the palette registers (BGP, OBP0, OBP1) decide which grey each shade shows.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Drawing</h3>
            <p>
              Pick a shade, then use the pencil, line, rubber (shade 0) or bucket (flood fill) tool. Thick grid lines
              separate tiles; tiles are numbered in row-major order (hex, shown with &ldquo;Show tile numbers&rdquo;),
              which is the order they are exported. Shade 0 is transparent for sprites. Resize the canvas in the toolbar.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Exporting</h3>
            <p>
              <strong className="text-white">RGBDS</strong> writes <code className="bg-gray-700 px-1 rounded">db</code>{' '}
              lines (one tile per line), <strong className="text-white">C</strong> writes a GBDK-2020{' '}
              <code className="bg-gray-700 px-1 rounded">const unsigned char[]</code> for{' '}
              <code className="bg-gray-700 px-1 rounded">set_bkg_data</code>/<code className="bg-gray-700 px-1 rounded">set_sprite_data</code>,
              and <strong className="text-white">2bpp</strong> writes the raw binary. Trailing empty tiles are trimmed.
              You can also import an existing <code className="bg-gray-700 px-1 rounded">.2bpp</code> file.
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

export function shouldShowTileInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}
