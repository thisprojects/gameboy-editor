'use client';

import { Tool } from '@/types';
import { BsPencilFill, BsEraserFill, BsPaintBucket, BsArrowsMove } from 'react-icons/bs';
import { TbLine } from 'react-icons/tb';
import { PALETTE_PRESETS, PalettePreset } from '@/constants';
import { FIRST_CHAR } from '@/constants/font';
import { glyphLabel } from '@/utils/font';
import { ShadePicker } from './ShadePicker';
import { UndoRedoButtons } from './UndoRedoButtons';

interface FontToolbarContentProps {
  currentTool: Tool;
  onSelectTool: (tool: Tool) => void;
  currentShade: number;
  onShadeChange: (shade: number) => void;
  preset: PalettePreset;
  onPresetChange: (preset: PalettePreset) => void;
  selectedGlyph: number;
  pixelSize: number;
  onPixelSizeChange: (size: number) => void;
  hasClipboard: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onClearGlyph: () => void;
  onResetGlyph: () => void;
  onLoadStarter: () => void;
  onClearAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  onLoad: () => void;
  onSave: () => void;
  onImport2bpp: () => void;
  onExportASM: () => void;
  onExportC: () => void;
  onExport2bpp: () => void;
  onExport1bpp: () => void;
}

const TOOLS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
  { tool: 'pencil', label: 'Pencil', icon: <BsPencilFill size={16} /> },
  { tool: 'line', label: 'Line', icon: <TbLine size={18} /> },
  { tool: 'rubber', label: 'Rubber', icon: <BsEraserFill size={16} /> },
  { tool: 'bucket', label: 'Bucket (flood fill)', icon: <BsPaintBucket size={16} /> },
  { tool: 'pan', label: 'Pan', icon: <BsArrowsMove size={16} /> },
];

const btn = 'w-full px-3 py-2 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40';

export function FontToolbarContent(props: FontToolbarContentProps) {
  const { currentTool, onSelectTool, currentShade, onShadeChange, preset, onPresetChange, selectedGlyph, pixelSize, onPixelSizeChange } = props;
  const code = FIRST_CHAR + selectedGlyph;

  return (
    <div className="space-y-4 text-sm">
      <div className="border border-gray-600 rounded p-2">
        <div className="text-xs text-gray-400 mb-1">Selected</div>
        <div className="font-mono leading-tight">
          <div>#{selectedGlyph}</div>
          <div className="text-gray-400">
            ASCII {code} (${code.toString(16).toUpperCase().padStart(2, '0')})
          </div>
          <div className="text-lg mt-0.5">&apos;{glyphLabel(selectedGlyph)}&apos;</div>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Tools</div>
        <div className="flex gap-1">
          {TOOLS.map(({ tool, label, icon }) => (
            <button
              key={tool}
              title={label}
              aria-label={label}
              aria-pressed={currentTool === tool}
              onClick={() => onSelectTool(tool)}
              className={`p-2 rounded ${currentTool === tool ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Shade</div>
        <ShadePicker currentShade={currentShade} onShadeChange={onShadeChange} preset={preset} />
        <label className="block text-xs text-gray-400 mt-2 mb-1" htmlFor="palette-preset">Palette</label>
        <select
          id="palette-preset"
          value={preset.name}
          onChange={(e) => onPresetChange(PALETTE_PRESETS.find((p) => p.name === e.target.value) ?? PALETTE_PRESETS[0])}
          className="w-full bg-gray-700 rounded px-2 py-1"
        >
          {PALETTE_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <label className="block text-xs text-gray-400 mt-2" htmlFor="zoom">Zoom ({pixelSize}px)</label>
        <input id="zoom" type="range" min={4} max={40} value={pixelSize} onChange={(e) => onPixelSizeChange(Number(e.target.value))} className="w-full" />
      </div>

      <div className="space-y-1">
        <div className="text-xs text-gray-400">Glyph</div>
        <div className="flex gap-1">
          <button className={btn} onClick={props.onCopy}>Copy</button>
          <button className={btn} onClick={props.onPaste} disabled={!props.hasClipboard}>Paste</button>
        </div>
        <button className={btn} onClick={props.onClearGlyph}>Clear glyph</button>
        <button className={btn} onClick={props.onResetGlyph}>Reset to starter</button>
      </div>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <div className="space-y-1">
        <div className="text-xs text-gray-400">Font</div>
        <button className={btn} onClick={props.onLoadStarter}>Load starter font</button>
        <button className="w-full px-3 py-2 rounded text-sm bg-red-700 text-white hover:bg-red-600" onClick={props.onClearAll}>Clear all</button>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-gray-400">File</div>
        <button className={btn} onClick={props.onLoad}>Load project</button>
        <button className={btn} onClick={props.onSave}>Save project</button>
        <button className={btn} onClick={props.onImport2bpp}>Import .2bpp</button>
        <button className={btn} onClick={props.onExportASM}>Export RGBDS (.asm)</button>
        <button className={btn} onClick={props.onExportC}>Export C (.h)</button>
        <button className={btn} onClick={props.onExport2bpp}>Export .2bpp</button>
        <button className={btn} onClick={props.onExport1bpp}>Export .1bpp</button>
      </div>
    </div>
  );
}
