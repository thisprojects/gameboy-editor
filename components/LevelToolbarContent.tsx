'use client';

import { toolTitle } from '@/constants/toolHints';
import { MapTool, Tile } from '@/types/map';
import { Metatile } from '@/types/metatile';
import { BsBrushFill, BsEraserFill, BsPaintBucket, BsArrowsMove, BsBoundingBoxCircles, BsEyedropper } from 'react-icons/bs';
import { PALETTE_PRESETS, PalettePreset, SCREEN_TILES_X, SCREEN_TILES_Y } from '@/constants';
import { BGP_PRESETS } from '@/constants/map';
import { maxLevelMetatiles } from '@/constants/level';
import { MetatilePalette } from './MetatilePalette';
import { UndoRedoButtons } from './UndoRedoButtons';
import { NumberField } from './NumberField';

interface LevelToolbarContentProps {
  currentTool: MapTool;
  onSelectTool: (tool: MapTool) => void;
  tiles: Tile[];
  metatiles: Metatile[];
  /** Metatile width and height in tiles */
  mw: number;
  mh: number;
  selectedMetatile: number;
  onSelectMetatile: (i: number) => void;
  /** Preset after BGP has been applied (what the canvas shows) */
  displayPreset: PalettePreset;
  basePreset: PalettePreset;
  onPresetChange: (preset: PalettePreset) => void;
  bgpIndex: number;
  onBgpChange: (i: number) => void;
  width: number;
  height: number;
  onResize: (w: number, h: number) => void;
  showGrid: boolean;
  onShowGridChange: (v: boolean) => void;
  showCollision: boolean;
  onShowCollisionChange: (v: boolean) => void;
  showViewport: boolean;
  onShowViewportChange: (v: boolean) => void;
  scx: number;
  scy: number;
  onMoveViewport: (x: number, y: number) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  onLoad: () => void;
  onSave: () => void;
  onImportLibrary: () => void;
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
  { tool: 'pick', label: 'Pick metatile', icon: <BsEyedropper size={16} /> },
  { tool: 'rubber', label: 'Rubber', icon: <BsEraserFill size={16} /> },
  { tool: 'pan', label: 'Pan', icon: <BsArrowsMove size={16} /> },
];

const btn = 'w-full px-3 py-2 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600';

export function LevelToolbarContent(props: LevelToolbarContentProps) {
  const {
    currentTool, onSelectTool, tiles, metatiles, mw, mh, selectedMetatile, onSelectMetatile, displayPreset, basePreset,
    onPresetChange, bgpIndex, onBgpChange, width, height, onResize, scx, scy, onMoveViewport,
  } = props;
  const maxW = maxLevelMetatiles(mw);
  const maxH = maxLevelMetatiles(mh);

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs text-gray-400 mb-1">Tools</div>
        <div className="flex flex-wrap gap-1">
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
        <div className="text-xs text-gray-400 mb-1">
          Metatiles — {selectedMetatile} of {metatiles.length} ({mw}×{mh} tiles)
        </div>
        <MetatilePalette metatiles={metatiles} tiles={tiles} selected={selectedMetatile} onSelect={onSelectMetatile} preset={displayPreset} />
        <button className={`${btn} mt-2`} onClick={props.onImportLibrary}>Import metatiles (.json)</button>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">
          Level size (metatiles, max {maxW}×{maxH}) — {width * mw}×{height * mh} tiles
        </div>
        <div className="flex items-center gap-2">
          <NumberField min={1} max={maxW} value={width} aria-label="Width in metatiles" onCommit={(n) => onResize(n, height)} className="w-16 bg-gray-700 rounded px-2 py-1" />
          <span>×</span>
          <NumberField min={1} max={maxH} value={height} aria-label="Height in metatiles" onCommit={(n) => onResize(width, n)} className="w-16 bg-gray-700 rounded px-2 py-1" />
        </div>
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
          <input type="checkbox" checked={props.showGrid} onChange={(e) => props.onShowGridChange(e.target.checked)} /> Show grid
        </label>
        <label className="flex items-center gap-2 text-gray-300 mt-1">
          <input type="checkbox" checked={props.showCollision} onChange={(e) => props.onShowCollisionChange(e.target.checked)} /> Show collision
        </label>
        <label className="flex items-center gap-2 text-gray-300 mt-1">
          <input type="checkbox" checked={props.showViewport} onChange={(e) => props.onShowViewportChange(e.target.checked)} />
          Show {SCREEN_TILES_X}×{SCREEN_TILES_Y} screen
        </label>
        <div className="flex items-center gap-2 mt-2">
          <label htmlFor="scx" className="text-xs text-gray-400">SCX</label>
          <NumberField id="scx" min={0} value={scx} onCommit={(n) => onMoveViewport(n, scy)} className="w-14 bg-gray-700 rounded px-2 py-1" />
          <label htmlFor="scy" className="text-xs text-gray-400">SCY</label>
          <NumberField id="scy" min={0} value={scy} onCommit={(n) => onMoveViewport(scx, n)} className="w-14 bg-gray-700 rounded px-2 py-1" />
        </div>
        <p className="text-xs text-gray-500 mt-1">Screen position in tiles.</p>
        <label className="block text-xs text-gray-400 mt-2" htmlFor="zoom">Zoom ({props.zoom}x)</label>
        <input id="zoom" type="range" min={1} max={6} value={props.zoom} onChange={(e) => props.onZoomChange(Number(e.target.value))} className="w-full" />
      </div>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <div className="space-y-1">
        <button className={btn} onClick={props.onLoad}>Load project</button>
        <button className={btn} onClick={props.onSave}>Save project</button>
        <button className={btn} onClick={props.onExportASM}>Export RGBDS (.asm)</button>
        <button className={btn} onClick={props.onExportC}>Export C (.h)</button>
        <button className={btn} onClick={props.onExportTilemap}>Export tile map (.tilemap)</button>
        <button className={btn} onClick={props.onExport2bpp}>Export tiles (.2bpp)</button>
        <button className="w-full px-3 py-2 rounded text-sm bg-red-700 text-white hover:bg-red-600" onClick={props.onClear}>Clear level</button>
      </div>
    </div>
  );
}
