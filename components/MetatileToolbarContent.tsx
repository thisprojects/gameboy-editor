'use client';

import { toolTitle } from '@/constants/toolHints';
import { Tile } from '@/types/map';
import { Metatile, MetatileTool } from '@/types/metatile';
import { BsBrushFill, BsEraserFill, BsPaintBucket, BsEyedropper } from 'react-icons/bs';
import { PALETTE_PRESETS, PalettePreset } from '@/constants';
import { METATILE_SIZES, MAX_METATILES } from '@/constants/level';
import { TilePalette } from './TilePalette';
import { MetatilePalette } from './MetatilePalette';
import { UndoRedoButtons } from './UndoRedoButtons';

interface MetatileToolbarContentProps {
  currentTool: MetatileTool;
  onSelectTool: (tool: MetatileTool) => void;
  tiles: Tile[];
  selectedTile: number;
  onSelectTile: (i: number) => void;
  metatiles: Metatile[];
  selectedMetatile: number;
  onSelectMetatile: (i: number) => void;
  size: number;
  onSizeChange: (size: number) => void;
  solid: boolean;
  onToggleSolid: () => void;
  onAddMetatile: () => void;
  onDuplicateMetatile: () => void;
  onDeleteMetatile: () => void;
  onClearMetatile: () => void;
  preset: PalettePreset;
  onPresetChange: (preset: PalettePreset) => void;
  showGrid: boolean;
  onShowGridChange: (v: boolean) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  onLoad: () => void;
  onSave: () => void;
  onImportTileset: () => void;
  onExportASM: () => void;
  onExportC: () => void;
  onExport2bpp: () => void;
}

const TOOLS: { tool: MetatileTool; label: string; icon: React.ReactNode }[] = [
  { tool: 'stamp', label: 'Stamp', icon: <BsBrushFill size={16} /> },
  { tool: 'fill', label: 'Fill', icon: <BsPaintBucket size={16} /> },
  { tool: 'pick', label: 'Pick tile', icon: <BsEyedropper size={16} /> },
  { tool: 'rubber', label: 'Rubber', icon: <BsEraserFill size={16} /> },
];

const btn = 'w-full px-3 py-2 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40';
const small = 'flex-1 px-2 py-1 rounded text-xs bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40';

export function MetatileToolbarContent(props: MetatileToolbarContentProps) {
  const { currentTool, onSelectTool, tiles, selectedTile, onSelectTile, metatiles, selectedMetatile, onSelectMetatile, size, preset } = props;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs text-gray-400 mb-1">Tools</div>
        <div className="flex gap-1">
          {TOOLS.map(({ tool, label, icon }) => (
            <button
              key={tool}
              title={toolTitle(label)}
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
        <div className="text-xs text-gray-400 mb-1">Tileset — tile {selectedTile} of {tiles.length}</div>
        <TilePalette tiles={tiles} selected={selectedTile} onSelect={onSelectTile} preset={preset} />
        <button className={`${btn} mt-2`} onClick={props.onImportTileset}>Import tileset (.json / .2bpp)</button>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="meta-size">Metatile size</label>
        <select
          id="meta-size"
          value={size}
          onChange={(e) => props.onSizeChange(Number(e.target.value))}
          className="w-full bg-gray-700 rounded px-2 py-1"
        >
          {METATILE_SIZES.map((s) => (
            <option key={s} value={s}>{s}×{s} tiles ({s * 8}×{s * 8} px)</option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">
          Metatiles — {selectedMetatile} of {metatiles.length} (max {MAX_METATILES})
        </div>
        <MetatilePalette metatiles={metatiles} tiles={tiles} selected={selectedMetatile} onSelect={onSelectMetatile} preset={preset} />
        <div className="flex gap-1 mt-2">
          <button className={small} onClick={props.onAddMetatile}>Add</button>
          <button className={small} onClick={props.onDuplicateMetatile}>Duplicate</button>
          <button className={small} onClick={props.onDeleteMetatile} disabled={metatiles.length <= 1}>Delete</button>
        </div>
        <button className={`${btn} mt-1`} onClick={props.onClearMetatile}>Clear metatile</button>
        <label className="flex items-center gap-2 mt-2 text-gray-300">
          <input type="checkbox" checked={props.solid} onChange={props.onToggleSolid} />
          Solid (collision)
        </label>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="tint">Screen tint</label>
        <select
          id="tint"
          value={preset.name}
          onChange={(e) => props.onPresetChange(PALETTE_PRESETS.find((p) => p.name === e.target.value) ?? PALETTE_PRESETS[0])}
          className="w-full bg-gray-700 rounded px-2 py-1"
        >
          {PALETTE_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 mt-2 text-gray-300">
          <input type="checkbox" checked={props.showGrid} onChange={(e) => props.onShowGridChange(e.target.checked)} /> Show grid
        </label>
        <label className="block text-xs text-gray-400 mt-2" htmlFor="zoom">Zoom ({props.zoom}x)</label>
        <input id="zoom" type="range" min={2} max={16} value={props.zoom} onChange={(e) => props.onZoomChange(Number(e.target.value))} className="w-full" />
      </div>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <div className="space-y-1">
        <button className={btn} onClick={props.onLoad}>Load project</button>
        <button className={btn} onClick={props.onSave}>Save project</button>
        <button className={btn} onClick={props.onExportASM}>Export RGBDS (.asm)</button>
        <button className={btn} onClick={props.onExportC}>Export C (.h)</button>
        <button className={btn} onClick={props.onExport2bpp}>Export tiles (.2bpp)</button>
      </div>
    </div>
  );
}
