'use client';

import { MapTool, Tile } from '@/types/map';
import { BsBrushFill, BsEraserFill, BsPaintBucket, BsArrowsMove, BsBoundingBoxCircles, BsEyedropper } from 'react-icons/bs';
import { PALETTE_PRESETS, PalettePreset, SCREEN_TILES_X, SCREEN_TILES_Y } from '@/constants';
import { BGP_PRESETS, ExportArea, MAP_SIZE } from '@/constants/map';
import { TilePalette } from './TilePalette';
import { UndoRedoButtons } from './UndoRedoButtons';
import { NumberField } from './NumberField';

interface MapToolbarContentProps {
  currentTool: MapTool;
  onSelectTool: (tool: MapTool) => void;
  tiles: Tile[];
  selectedTile: number;
  onSelectTile: (i: number) => void;
  /** Preset after BGP has been applied (what the canvas shows) */
  displayPreset: PalettePreset;
  basePreset: PalettePreset;
  onPresetChange: (preset: PalettePreset) => void;
  bgpIndex: number;
  onBgpChange: (i: number) => void;
  showGrid: boolean;
  onShowGridChange: (v: boolean) => void;
  showViewport: boolean;
  onShowViewportChange: (v: boolean) => void;
  scx: number;
  scy: number;
  onMoveViewport: (x: number, y: number) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  exportArea: ExportArea;
  onExportAreaChange: (a: ExportArea) => void;
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
  onExportTilemap: () => void;
  onExport2bpp: () => void;
  onClear: () => void;
}

const TOOLS: { tool: MapTool; label: string; icon: React.ReactNode }[] = [
  { tool: 'stamp', label: 'Stamp', icon: <BsBrushFill size={16} /> },
  { tool: 'rect', label: 'Rectangle', icon: <BsBoundingBoxCircles size={16} /> },
  { tool: 'fill', label: 'Fill', icon: <BsPaintBucket size={16} /> },
  { tool: 'pick', label: 'Pick tile', icon: <BsEyedropper size={16} /> },
  { tool: 'rubber', label: 'Rubber', icon: <BsEraserFill size={16} /> },
  { tool: 'pan', label: 'Pan', icon: <BsArrowsMove size={16} /> },
];

const btn = 'w-full px-3 py-2 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600';

export function MapToolbarContent(props: MapToolbarContentProps) {
  const {
    currentTool, onSelectTool, tiles, selectedTile, onSelectTile, displayPreset, basePreset, onPresetChange,
    bgpIndex, onBgpChange, showGrid, onShowGridChange, showViewport, onShowViewportChange, scx, scy,
    onMoveViewport, zoom, onZoomChange, exportArea, onExportAreaChange,
  } = props;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs text-gray-400 mb-1">Tools</div>
        <div className="flex flex-wrap gap-1">
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
        <div className="text-xs text-gray-400 mb-1">
          Tileset — tile {selectedTile} of {tiles.length}
        </div>
        <TilePalette tiles={tiles} selected={selectedTile} onSelect={onSelectTile} preset={displayPreset} />
        <button className={`${btn} mt-2`} onClick={props.onImportTileset}>Import tileset (.json / .2bpp)</button>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="bgp">Background palette</label>
        <select id="bgp" value={bgpIndex} onChange={(e) => onBgpChange(Number(e.target.value))} className="w-full bg-gray-700 rounded px-2 py-1">
          {BGP_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>{p.name}</option>
          ))}
        </select>
        <label className="block text-xs text-gray-400 mt-2 mb-1" htmlFor="tint">Screen tint</label>
        <select
          id="tint"
          value={basePreset.name}
          onChange={(e) => onPresetChange(PALETTE_PRESETS.find((p) => p.name === e.target.value) ?? PALETTE_PRESETS[0])}
          className="w-full bg-gray-700 rounded px-2 py-1"
        >
          {PALETTE_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">View</div>
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" checked={showGrid} onChange={(e) => onShowGridChange(e.target.checked)} /> Show grid
        </label>
        <label className="flex items-center gap-2 text-gray-300 mt-1">
          <input type="checkbox" checked={showViewport} onChange={(e) => onShowViewportChange(e.target.checked)} />
          Show {SCREEN_TILES_X}×{SCREEN_TILES_Y} screen
        </label>
        <div className="flex items-center gap-2 mt-2">
          <label htmlFor="scx" className="text-xs text-gray-400">SCX</label>
          <NumberField id="scx" min={0} max={MAP_SIZE - 1} value={scx} onCommit={(n) => onMoveViewport(n, scy)} className="w-14 bg-gray-700 rounded px-2 py-1" />
          <label htmlFor="scy" className="text-xs text-gray-400">SCY</label>
          <NumberField id="scy" min={0} max={MAP_SIZE - 1} value={scy} onCommit={(n) => onMoveViewport(scx, n)} className="w-14 bg-gray-700 rounded px-2 py-1" />
        </div>
        <p className="text-xs text-gray-500 mt-1">In tiles; the screen wraps around the 32×32 map.</p>
        <label className="block text-xs text-gray-400 mt-2" htmlFor="zoom">Zoom ({zoom}x)</label>
        <input id="zoom" type="range" min={1} max={8} value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} className="w-full" />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="area">Export area</label>
        <select id="area" value={exportArea} onChange={(e) => onExportAreaChange(e.target.value as ExportArea)} className="w-full bg-gray-700 rounded px-2 py-1">
          <option value="full">Full map (32×32)</option>
          <option value="viewport">Screen (20×18 at SCX/SCY)</option>
          <option value="used">Used area (tile 0 counts as empty)</option>
        </select>
      </div>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <div className="space-y-1">
        <button className={btn} onClick={props.onLoad}>Load project</button>
        <button className={btn} onClick={props.onSave}>Save project</button>
        <button className={btn} onClick={props.onExportASM}>Export RGBDS (.asm)</button>
        <button className={btn} onClick={props.onExportC}>Export C (.h)</button>
        <button className={btn} onClick={props.onExportTilemap}>Export map (.tilemap)</button>
        <button className={btn} onClick={props.onExport2bpp}>Export tiles (.2bpp)</button>
        <button className="w-full px-3 py-2 rounded text-sm bg-red-700 text-white hover:bg-red-600" onClick={props.onClear}>Clear map</button>
      </div>
    </div>
  );
}
