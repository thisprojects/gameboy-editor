'use client';

import { BsPlayFill, BsStopFill } from 'react-icons/bs';
import { MusicPattern } from '@/types/music';
import { MAX_ORDER_LENGTH, MAX_PATTERN_ROWS, MAX_PATTERNS, MAX_TICKS_PER_ROW, MIN_PATTERN_ROWS, FRAME_RATE } from '@/constants/music';
import { UndoRedoButtons } from './UndoRedoButtons';
import { NumberField } from './NumberField';

interface MusicToolbarContentProps {
  patterns: MusicPattern[];
  orderList: number[];
  selectedPatternIndex: number;
  onSelectPattern: (index: number) => void;
  onAddPattern: () => void;
  onRemovePattern: (index: number) => void;
  patternRows: number;
  onPatternRowsChange: (rows: number) => void;
  onManageInstruments: () => void;
  ticksPerRow: number;
  onTicksPerRowChange: (ticks: number) => void;
  onOrderListChange: (order: number[]) => void;
  orderIndex: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  onLoad: () => void;
  onSave: () => void;
  onExportAsm: () => void;
  onExportC: () => void;
}

const btn = 'w-full px-3 py-2 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40';
const small = 'px-2 py-1 rounded text-xs bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40';

export function MusicToolbarContent(props: MusicToolbarContentProps) {
  const { patterns, orderList, selectedPatternIndex, ticksPerRow, isPlaying, orderIndex } = props;
  const rowsPerSecond = FRAME_RATE / ticksPerRow;

  const setOrderEntry = (position: number, pattern: number) =>
    props.onOrderListChange(orderList.map((p, i) => (i === position ? pattern : p)));

  return (
    <div className="space-y-4 text-sm">
      <div className="flex gap-2">
        <button
          onClick={isPlaying ? props.onStop : props.onPlay}
          aria-label={isPlaying ? 'Stop' : 'Play'}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-white ${isPlaying ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}
        >
          {isPlaying ? <BsStopFill size={16} /> : <BsPlayFill size={16} />}
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="pattern-select">Pattern</label>
        <select
          id="pattern-select"
          value={selectedPatternIndex}
          onChange={(e) => props.onSelectPattern(Number(e.target.value))}
          className="w-full bg-gray-700 rounded px-2 py-1"
        >
          {patterns.map((p, i) => (
            <option key={p.id} value={i}>{i}: {p.name}</option>
          ))}
        </select>
        <div className="flex gap-1 mt-2">
          <button className={small} data-tip="Add a new empty pattern" onClick={props.onAddPattern} disabled={patterns.length >= MAX_PATTERNS}>Add</button>
          <button className={small} data-tip="Delete the selected pattern" onClick={() => props.onRemovePattern(selectedPatternIndex)} disabled={patterns.length <= 1}>Delete</button>
        </div>
        <label className="block text-xs text-gray-400 mt-2 mb-1" htmlFor="rows">Rows ({MIN_PATTERN_ROWS}-{MAX_PATTERN_ROWS})</label>
        <NumberField
          id="rows" min={MIN_PATTERN_ROWS} max={MAX_PATTERN_ROWS} value={props.patternRows}
          onCommit={props.onPatternRowsChange}
          className="w-20 bg-gray-700 rounded px-2 py-1"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="ticks">Speed: frames per row ({rowsPerSecond.toFixed(1)} rows/s)</label>
        <NumberField
          id="ticks" min={1} max={MAX_TICKS_PER_ROW} value={ticksPerRow}
          onCommit={props.onTicksPerRowChange}
          className="w-20 bg-gray-700 rounded px-2 py-1"
        />
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Order ({orderList.length}/{MAX_ORDER_LENGTH}) — the song loops</div>
        <ol className="space-y-1">
          {orderList.map((patternIndex, position) => (
            <li key={position} className={`flex items-center gap-1 ${isPlaying && position === orderIndex ? 'text-green-400' : ''}`}>
              <span className="w-6 text-xs text-gray-500 text-right">{position}</span>
              <select
                aria-label={`Order position ${position}`}
                value={patternIndex}
                onChange={(e) => setOrderEntry(position, Number(e.target.value))}
                className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-xs"
              >
                {patterns.map((p, i) => (
                  <option key={p.id} value={i}>{i}: {p.name}</option>
                ))}
              </select>
              <button
                aria-label={`Remove order position ${position}`}
                className={small}
                disabled={orderList.length <= 1}
                onClick={() => props.onOrderListChange(orderList.filter((_, i) => i !== position))}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button
          className={`${small} mt-2`}
          disabled={orderList.length >= MAX_ORDER_LENGTH}
          onClick={() => props.onOrderListChange([...orderList, selectedPatternIndex])}
        >
          Add current pattern to order
        </button>
      </div>

      <button className={btn} onClick={props.onManageInstruments}>Instruments…</button>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <div className="space-y-1">
        <button className={btn} onClick={props.onLoad}>Load project</button>
        <button className={btn} onClick={props.onSave}>Save project</button>
        <button className={btn} onClick={props.onExportAsm}>Export RGBDS (.asm)</button>
        <button className={btn} onClick={props.onExportC}>Export C (.h)</button>
      </div>
    </div>
  );
}
