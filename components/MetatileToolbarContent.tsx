'use client';

import { ToolbarSection } from './ToolbarSection';
import { ToolGrid } from './ToolGrid';
import { FileActions } from './FileActions';

import { Tile } from '@/types/map';
import { Metatile, MetatileTool } from '@/types/metatile';
import { BsBrushFill, BsEraserFill, BsPaintBucket, BsEyedropper } from 'react-icons/bs';
import { PALETTE_PRESETS, PalettePreset } from '@/constants';
import { MAX_METATILES, MAX_METATILE_EDGE } from '@/constants/level';
import { NumberField } from './NumberField';
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
  /** Metatile width and height in tiles */
  mw: number;
  mh: number;
  onSizeChange: (width: number, height: number) => void;
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
  const { currentTool, onSelectTool, tiles, selectedTile, onSelectTile, metatiles, selectedMetatile, onSelectMetatile, mw, mh, preset } = props;

  return (
    <div className="flex flex-1 flex-col gap-3 text-sm">
      <ToolbarSection title="Tools">
        <ToolGrid tools={TOOLS} current={currentTool} onSelect={onSelectTool} />
      </ToolbarSection>

      <ToolbarSection title={<>Tileset — tile {selectedTile} of {tiles.length}</>}>
        <TilePalette tiles={tiles} selected={selectedTile} onSelect={onSelectTile} preset={preset} />
        <button className={`${btn} mt-2`} onClick={props.onImportTileset}>Import tileset (.json / .2bpp)</button>
      </ToolbarSection>

      <ToolbarSection title={<>Metatile size (tiles, 1–{MAX_METATILE_EDGE}) — {mw * 8}×{mh * 8} px</>}>
        <div className="flex items-center gap-2">
          <NumberField min={1} max={MAX_METATILE_EDGE} value={mw} aria-label="Metatile width in tiles" onCommit={(n) => props.onSizeChange(n, mh)} className="w-16 bg-gray-700 rounded px-2 py-1" />
          <span>×</span>
          <NumberField min={1} max={MAX_METATILE_EDGE} value={mh} aria-label="Metatile height in tiles" onCommit={(n) => props.onSizeChange(mw, n)} className="w-16 bg-gray-700 rounded px-2 py-1" />
        </div>
        <p className="text-xs text-gray-500 mt-1">Any width × height, e.g. 1×4 for a long floor. Every metatile in the library shares it.</p>
      </ToolbarSection>

      <ToolbarSection title={<>Metatiles — {selectedMetatile} of {metatiles.length} (max {MAX_METATILES})</>}>
        <MetatilePalette metatiles={metatiles} tiles={tiles} selected={selectedMetatile} onSelect={onSelectMetatile} preset={preset} />
        <div className="flex gap-1 mt-2">
          <button className={small} data-tip="Add a new empty metatile to the library" onClick={props.onAddMetatile}>Add</button>
          <button className={small} data-tip="Copy the selected metatile into a new one" onClick={props.onDuplicateMetatile}>Duplicate</button>
          <button className={small} data-tip="Delete the selected metatile" onClick={props.onDeleteMetatile} disabled={metatiles.length <= 1}>Delete</button>
        </div>
        <button className={`${btn} mt-1`} onClick={props.onClearMetatile}>Clear metatile</button>
        <label className="flex items-center gap-2 mt-2 text-gray-300">
          <input type="checkbox" checked={props.solid} onChange={props.onToggleSolid} />
          Solid (collision)
        </label>
      </ToolbarSection>

      <ToolbarSection title="Display">
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
      </ToolbarSection>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <FileActions
        onLoad={props.onLoad}
        onSave={props.onSave}
        exports={[
          { label: 'Export RGBDS (.asm)', onClick: props.onExportASM },
          { label: 'Export C (.h)', onClick: props.onExportC },
          { label: 'Export tiles (.2bpp)', onClick: props.onExport2bpp },
        ]}
      />
    </div>
  );
}
