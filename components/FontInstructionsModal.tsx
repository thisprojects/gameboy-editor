'use client';

import { useState } from 'react';

const STORAGE_KEY = 'fontEditor_hideInstructions';

interface FontInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FontInstructionsModal({ isOpen, onClose }: FontInstructionsModalProps) {
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
          <h2 className="text-xl font-bold text-white">Font Editor — How to Use</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300">
          <section className="rounded-md bg-gray-900/60 border border-gray-700 p-3">
            <h3 className="text-base font-semibold text-white mb-1">What you would make with this</h3>
            <p className="text-white mb-1">Design the letters and numbers your game uses to print text.</p>
            <p>
              The Game Boy has no built-in font, so any text (a score, a dialogue box, a menu) needs letters you provide. This editor gives you all 96 printable characters to draw or tweak, starting from a ready-made font, with a live preview of a line of text. Once exported, your game prints a message by looking up each letter&apos;s tile.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Fonts are tiles</h3>
            <p>
              The Game Boy has no text mode: a font is simply <strong className="text-white">96 tiles</strong> (ASCII 32
              to 127) that you copy to VRAM and then print by writing tile indices to the background map. Character{' '}
              <em>c</em> is tile <em>(c − 32)</em> plus the index of the first font tile.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Editing</h3>
            <p>
              Click a glyph in the grid to edit it in the pixel editor. Most fonts use only shade 3 on shade 0, but all four
              shades are available for shadows and outlines. The editor starts with a built-in starter font
              (<strong className="text-white">Load starter font</strong> restores it,{' '}
              <strong className="text-white">Reset to starter</strong> restores one glyph). Copy and paste move a glyph
              between slots. The preview shows sample text laid out at 20 characters per row, like a Game Boy screen.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Exporting</h3>
            <p>
              <strong className="text-white">RGBDS</strong> and <strong className="text-white">C</strong> write all 96
              glyphs as 2bpp tile data. <code className="bg-gray-700 px-1 rounded">.2bpp</code> is the raw 1536 bytes, and{' '}
              <code className="bg-gray-700 px-1 rounded">.1bpp</code> is 768 bytes (8 per glyph) where shades 2 and 3 count
              as set pixels — useful with tools that expand 1bpp fonts. You can import an existing{' '}
              <code className="bg-gray-700 px-1 rounded">.2bpp</code> font of up to 96 glyphs.
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

export function shouldShowFontInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}
