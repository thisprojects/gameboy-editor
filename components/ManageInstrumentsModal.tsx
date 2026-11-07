'use client';

import { InstrumentKind, MusicInstrument } from '@/types/music';
import { CHANNEL_KINDS, DUTY_NAMES, MAX_INSTRUMENTS, WAVE_LEVEL_NAMES, MUSIC_CHANNEL_NAMES } from '@/constants/music';
import { sawWave, sineWave, squareWave, triangleWave } from '@/constants/musicPresets';
import { WaveEditor } from './WaveEditor';

interface ManageInstrumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruments: MusicInstrument[];
  editingInstrumentIndex: number;
  onSetEditingIndex: (index: number) => void;
  onAddInstrument: (kind: InstrumentKind) => void;
  onRemoveInstrument: (index: number) => void;
  /** False for the last instrument of a kind: every channel needs something to play */
  canRemoveInstrument: (index: number) => boolean;
  onUpdate: (index: number, update: Partial<MusicInstrument>) => void;
  onSetWaveSample: (index: number, step: number, value: number) => void;
  onWaveStrokeStart: () => void;
  onPreview: (index: number) => void;
}

const WAVE_SHAPES: { label: string; make: () => number[] }[] = [
  { label: 'Triangle', make: triangleWave },
  { label: 'Saw', make: sawWave },
  { label: 'Square', make: squareWave },
  { label: 'Sine', make: sineWave },
];

const field = 'bg-gray-700 text-white text-sm rounded px-2 py-1 w-full';
const label = 'text-xs text-gray-400 mb-1 block';
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function EnvelopeFields({ inst, index, onUpdate }: { inst: MusicInstrument; index: number; onUpdate: ManageInstrumentsModalProps['onUpdate'] }) {
  return (
    <fieldset className="border border-gray-700 rounded p-3 space-y-2">
      <legend className="text-xs text-gray-400 px-1">Volume envelope</legend>
      <label className="block">
        <span className={label}>Initial volume ({inst.envVolume})</span>
        <input type="range" min={0} max={15} value={inst.envVolume} aria-label="Initial volume" onChange={(e) => onUpdate(index, { envVolume: Number(e.target.value) })} className="w-full" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={label}>Direction</span>
          <select className={field} aria-label="Envelope direction" value={inst.envDirection} onChange={(e) => onUpdate(index, { envDirection: e.target.value as 'up' | 'down' })}>
            <option value="down">Fade out</option>
            <option value="up">Fade in</option>
          </select>
        </label>
        <label>
          <span className={label}>Step period</span>
          <select className={field} aria-label="Envelope period" value={inst.envPeriod} onChange={(e) => onUpdate(index, { envPeriod: Number(e.target.value) })}>
            <option value={0}>0 (constant)</option>
            {range(7).map((p) => (
              <option key={p + 1} value={p + 1}>{p + 1} ({((p + 1) / 64).toFixed(3)} s/step)</option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
}

export function ManageInstrumentsModal({
  isOpen,
  onClose,
  instruments,
  editingInstrumentIndex,
  onSetEditingIndex,
  onAddInstrument,
  onRemoveInstrument,
  canRemoveInstrument,
  onUpdate,
  onSetWaveSample,
  onWaveStrokeStart,
  onPreview,
}: ManageInstrumentsModalProps) {
  if (!isOpen) return null;
  const index = Math.min(editingInstrumentIndex, instruments.length - 1);
  const inst = instruments[index];
  const channelName = MUSIC_CHANNEL_NAMES[CHANNEL_KINDS.indexOf(inst.kind)];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-label="Instruments" className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Instruments</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">&times;</button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-56 border-r border-gray-700 p-3 overflow-y-auto space-y-1">
            {instruments.map((it, i) => (
              <button
                key={it.id}
                onClick={() => onSetEditingIndex(i)}
                aria-pressed={i === index}
                className={`w-full text-left px-2 py-1 rounded text-sm ${i === index ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              >
                {i}: {it.name} <span className="text-xs opacity-70">({it.kind})</span>
              </button>
            ))}
            <div className="pt-2 border-t border-gray-700 space-y-1">
              <div className="text-xs text-gray-400">Add ({instruments.length}/{MAX_INSTRUMENTS})</div>
              {(['pulse', 'wave', 'noise'] as InstrumentKind[]).map((kind) => (
                <button key={kind} onClick={() => onAddInstrument(kind)} className="w-full px-2 py-1 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600">
                  + {kind}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="flex gap-3 items-end">
              <label className="flex-1">
                <span className={label}>Name</span>
                <input className={field} aria-label="Instrument name" value={inst.name} onChange={(e) => onUpdate(index, { name: e.target.value })} />
              </label>
              <button onClick={() => onPreview(index)} className="px-4 py-1.5 rounded bg-green-700 text-white hover:bg-green-600 text-sm">Preview</button>
              <button
                onClick={() => onRemoveInstrument(index)}
                disabled={!canRemoveInstrument(index)}
                title={canRemoveInstrument(index) ? undefined : `This is the last ${inst.kind} instrument`}
                className="px-4 py-1.5 rounded bg-red-700 text-white hover:bg-red-600 text-sm disabled:opacity-40"
              >
                Delete
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {inst.kind} instrument — plays on the {channelName} channel
              {inst.kind === 'noise' ? '; the note sets the noise pitch' : ''}.
            </p>

            {inst.kind === 'pulse' && (
              <>
                <label className="block">
                  <span className={label}>Duty cycle</span>
                  <select className={field} aria-label="Duty cycle" value={inst.duty} onChange={(e) => onUpdate(index, { duty: Number(e.target.value) })}>
                    {DUTY_NAMES.map((name, d) => (
                      <option key={d} value={d}>{name}</option>
                    ))}
                  </select>
                </label>
                <EnvelopeFields inst={inst} index={index} onUpdate={onUpdate} />
                <fieldset className="border border-gray-700 rounded p-3 space-y-2">
                  <legend className="text-xs text-gray-400 px-1">Frequency sweep (Pulse 1 only)</legend>
                  <div className="grid grid-cols-3 gap-2">
                    <label>
                      <span className={label}>Period</span>
                      <select className={field} aria-label="Sweep period" value={inst.sweepPeriod} onChange={(e) => onUpdate(index, { sweepPeriod: Number(e.target.value) })}>
                        <option value={0}>0 (off)</option>
                        {range(7).map((p) => (
                          <option key={p + 1} value={p + 1}>{p + 1}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={label}>Direction</span>
                      <select className={field} aria-label="Sweep direction" value={inst.sweepDirection} onChange={(e) => onUpdate(index, { sweepDirection: e.target.value as 'up' | 'down' })}>
                        <option value="down">Pitch down</option>
                        <option value="up">Pitch up</option>
                      </select>
                    </label>
                    <label>
                      <span className={label}>Shift</span>
                      <select className={field} aria-label="Sweep shift" value={inst.sweepShift} onChange={(e) => onUpdate(index, { sweepShift: Number(e.target.value) })}>
                        {range(8).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </fieldset>
              </>
            )}

            {inst.kind === 'wave' && (
              <>
                <div>
                  <span className={label}>Waveform (32 samples, 4-bit) — click or drag to draw</span>
                  <WaveEditor wave={inst.wave} onSetSample={(step, value) => onSetWaveSample(index, step, value)} onStrokeStart={onWaveStrokeStart} />
                  <div className="flex gap-1 mt-2">
                    {WAVE_SHAPES.map((shape) => (
                      <button key={shape.label} onClick={() => onUpdate(index, { wave: shape.make() })} className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-200 hover:bg-gray-600">
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className={label}>Output level</span>
                  <select className={field} aria-label="Output level" value={inst.waveLevel} onChange={(e) => onUpdate(index, { waveLevel: Number(e.target.value) })}>
                    {Object.entries(WAVE_LEVEL_NAMES).map(([level, name]) => (
                      <option key={level} value={level}>{name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {inst.kind === 'noise' && (
              <>
                <label className="block">
                  <span className={label}>LFSR width</span>
                  <select className={field} aria-label="Noise width" value={inst.noiseWidth} onChange={(e) => onUpdate(index, { noiseWidth: Number(e.target.value) as 0 | 1 })}>
                    <option value={0}>15-bit (white noise)</option>
                    <option value={1}>7-bit (metallic)</option>
                  </select>
                </label>
                <EnvelopeFields inst={inst} index={index} onUpdate={onUpdate} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
