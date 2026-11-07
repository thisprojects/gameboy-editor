'use client';

import { useState } from 'react';

const STORAGE_KEY = 'musicEditor_hideInstructions';

interface MusicInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MusicInstructionsModal({ isOpen, onClose }: MusicInstructionsModalProps) {
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
          <h2 className="text-xl font-bold text-white">Music Editor — How to Use</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300">
          <section className="rounded-md bg-gray-900/60 border border-gray-700 p-3">
            <h3 className="text-base font-semibold text-white mb-1">What you would make with this</h3>
            <p className="text-white mb-1">Compose the songs and sound for your game, like a title tune or level music.</p>
            <p>
              This is a tracker: you type notes into a grid, one column for each of the Game Boy&apos;s four sound channels (two square-wave voices, one wave voice for bass or soft tones, and one noise voice for drums). You design the instruments, press Play to hear the song as the hardware would play it, and export it together with a small player routine to include in your game.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">The Game Boy sound chip</h3>
            <p>
              The Game Boy has four channels: <strong className="text-white">Pulse 1</strong> (with a frequency sweep),{' '}
              <strong className="text-white">Pulse 2</strong>, a <strong className="text-white">Wave</strong> channel that plays
              a 32-sample 4-bit waveform you draw, and a <strong className="text-white">Noise</strong> channel. Each channel
              plays one instrument kind, and volume fades use the chip&apos;s own hardware envelope, so playback needs almost
              no CPU time. Preview uses a software emulation of the chip.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Writing music</h3>
            <p>
              Click a cell, then play notes on your keyboard: <kbd>Z</kbd>–<kbd>M</kbd> for the channel&apos;s octave and{' '}
              <kbd>Q</kbd>–<kbd>U</kbd> one octave up. <kbd>1</kbd> inserts a note-off, <kbd>Backspace</kbd> clears a cell and the
              arrow keys move. Each channel has its own instrument and octave, used for the notes you enter next; notes already in the song keep theirs. Click a filled cell to edit its note,
              instrument and volume; for the noise channel the note sets the noise pitch. The speed is the number of video
              frames (1/60 s) per row.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Patterns and order</h3>
            <p>
              A song is a list of patterns (4–128 rows) played in the order you set; the song loops. Use{' '}
              <strong className="text-white">Instruments…</strong> to edit duty cycles, envelopes, sweeps, waveforms and noise
              types, and preview them.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-white mb-2">Exporting</h3>
            <p>
              <strong className="text-white">RGBDS</strong> and <strong className="text-white">C</strong> exports contain the
              song as a stream of sound-register writes plus a tiny player:{' '}
              <code className="bg-gray-700 px-1 rounded">name_init</code> once, then{' '}
              <code className="bg-gray-700 px-1 rounded">name_update</code> once per frame (for example from your VBlank
              handler). The player does exactly what the preview does. RGBDS 0.5.0 or later is needed to assemble the
              <code className="bg-gray-700 px-1 rounded"> .asm</code>.
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

export function shouldShowMusicInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}
