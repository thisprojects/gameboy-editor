'use client';

import { useState } from 'react';

const STORAGE_KEY = 'mapEditor_hideInstructions';

interface MapInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MapInstructionsModal({ isOpen, onClose }: MapInstructionsModalProps) {
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
          <h2 className="text-xl font-bold text-white">Background Editor — How to Use</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300">
          <section className="rounded-md bg-gray-900/60 border border-gray-700 p-3">
            <h3 className="text-base font-semibold text-white mb-1">What you would make with this</h3>
            <p className="text-white mb-1">Paint a still picture the player looks at: a title screen, a menu, a room.</p>
            <p>
              You choose tiles from a tileset and paint them onto a grid, like laying out a mosaic. That grid is the Game Boy&apos;s background layer, and the on-screen outline shows what the 160×144 display will actually show. Use it for anything that fits on one screen, or for a backdrop you scroll around. For a big world with walls, use the Level Editor instead.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Tile maps, not bitmaps</h3>
            <p>
              The Game Boy has no framebuffer. The background is a <strong className="text-white">32×32 map of tile
              indices</strong>, and the 160×144 screen (<strong className="text-white">20×18 tiles</strong>) is a window
              onto it that scrolls with SCX/SCY and wraps around the edges. The whole map shares one palette
              register (BGP, the background palette), which maps each of the 4 shade numbers to a grey level.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Tileset</h3>
            <p>
              Import a tileset saved from the Tile Editor (<code className="bg-gray-700 px-1 rounded">.json</code>) or a
              raw <code className="bg-gray-700 px-1 rounded">.2bpp</code> file. A map can address up to 256 tiles. Click a
              tile in the palette to use it as the brush. Importing a smaller tileset resets map cells that pointed past it
              to tile 0.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Painting</h3>
            <p>
              Stamp paints single cells, Rectangle fills a dragged area, Fill flood-fills matching tiles, Pick copies a
              tile from the map, and Rubber writes tile 0. The red outline shows the on-screen area at the chosen SCX/SCY.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Exporting</h3>
            <p>
              Choose what to export: the <strong className="text-white">full map</strong>, just the{' '}
              <strong className="text-white">20×18 screen</strong>, or the <strong className="text-white">used area</strong>.
              RGBDS and C exports include the tiles the map uses. Copy map rows to <code className="bg-gray-700 px-1 rounded">$9800</code>{' '}
              (or use <code className="bg-gray-700 px-1 rounded">set_bkg_tiles</code> in GBDK). The raw{' '}
              <code className="bg-gray-700 px-1 rounded">.tilemap</code> is one byte per cell, row by row.
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

export function shouldShowMapInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}
