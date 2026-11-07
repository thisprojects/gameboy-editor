'use client';

import { toolTitle } from '@/constants/toolHints';
import { Tool } from '@/types';
import { SpriteFrame } from '@/types/sprite';
import { BsPencilFill, BsEraserFill, BsPaintBucket, BsArrowsMove, BsPlayFill, BsStopFill } from 'react-icons/bs';
import { TbLine } from 'react-icons/tb';
import { PALETTE_PRESETS, PalettePreset } from '@/constants';
import { MAX_FRAMES, MAX_FRAME_TICKS, MAX_SPRITE_TILES_DIM, ObjSize } from '@/constants/sprite';
import { ShadePicker } from './ShadePicker';
import { UndoRedoButtons } from './UndoRedoButtons';
import { NumberField } from './NumberField';

interface SpriteToolbarContentProps {
  currentTool: Tool;
  onSelectTool: (tool: Tool) => void;
  currentShade: number;
  onShadeChange: (shade: number) => void;
  preset: PalettePreset;
  onPresetChange: (preset: PalettePreset) => void;
  palette: 0 | 1;
  onPaletteChange: (p: 0 | 1) => void;
  priority: boolean;
  onPriorityChange: (p: boolean) => void;
  objSize: ObjSize;
  onObjSizeChange: (s: ObjSize) => void;
  tilesWidth: number;
  tilesHeight: number;
  onResize: (width: number, height: number) => void;
  pixelSize: number;
  onPixelSizeChange: (size: number) => void;
  frames: SpriteFrame[];
  currentFrame: number;
  onSelectFrame: (i: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
  onDurationChange: (ticks: number) => void;
  onionSkin: boolean;
  onOnionSkinChange: (v: boolean) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  loop: boolean;
  onLoopChange: (v: boolean) => void;
  backgroundImage: HTMLImageElement | null;
  backgroundEnabled: boolean;
  backgroundOpacity: number;
  backgroundScale: number;
  backgroundAdjustMode: boolean;
  onBackgroundEnabledChange: (v: boolean) => void;
  onBackgroundOpacityChange: (v: number) => void;
  onBackgroundScaleChange: (v: number) => void;
  onBackgroundAdjustModeChange: (v: boolean) => void;
  onLoadBackgroundImage: (file: File) => void;
  onClearBackgroundImage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  onLoad: () => void;
  onSave: () => void;
  onExportASM: () => void;
  onExportC: () => void;
  onExport2bpp: () => void;
  onClear: () => void;
}

const TOOLS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
  { tool: 'pencil', label: 'Pencil', icon: <BsPencilFill size={16} /> },
  { tool: 'line', label: 'Line', icon: <TbLine size={18} /> },
  { tool: 'rubber', label: 'Rubber', icon: <BsEraserFill size={16} /> },
  { tool: 'bucket', label: 'Bucket (flood fill)', icon: <BsPaintBucket size={16} /> },
  { tool: 'pan', label: 'Pan', icon: <BsArrowsMove size={16} /> },
];

const btn = 'w-full px-3 py-2 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40';
const small = 'px-2 py-1 rounded text-xs bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40';

export function SpriteToolbarContent(props: SpriteToolbarContentProps) {
  const {
    currentTool, onSelectTool, currentShade, onShadeChange, preset, onPresetChange,
    palette, onPaletteChange, priority, onPriorityChange, objSize, onObjSizeChange,
    tilesWidth, tilesHeight, onResize, pixelSize, onPixelSizeChange,
    frames, currentFrame, onSelectFrame, onAddFrame, onDuplicateFrame, onDeleteFrame, onDurationChange,
    onionSkin, onOnionSkinChange, isPlaying, onTogglePlay, loop, onLoopChange,
    backgroundImage, backgroundEnabled, backgroundOpacity, backgroundScale, backgroundAdjustMode,
    onBackgroundEnabledChange, onBackgroundOpacityChange, onBackgroundScaleChange,
    onBackgroundAdjustModeChange, onLoadBackgroundImage, onClearBackgroundImage,
  } = props;

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
        <div className="text-xs text-gray-400 mb-1">Colour</div>
        <ShadePicker currentShade={currentShade} onShadeChange={onShadeChange} preset={preset} />
        <label className="block text-xs text-gray-400 mt-2 mb-1" htmlFor="palette-preset">Screen tint</label>
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
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Hardware attributes</div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="obj-size">OBJ size</label>
        <select
          id="obj-size"
          value={objSize}
          onChange={(e) => onObjSizeChange(e.target.value as ObjSize)}
          className="w-full bg-gray-700 rounded px-2 py-1"
        >
          <option value="8x8">8x8 (one OAM entry per tile)</option>
          <option value="8x16">8x16 (tile pairs)</option>
        </select>
        <label className="block text-xs text-gray-400 mt-2 mb-1" htmlFor="obp">Palette</label>
        <select
          id="obp"
          data-tip="Which object palette register (OBP0 or OBP1) this sprite uses; sets the palette bit of the OAM attribute"
          value={palette}
          onChange={(e) => onPaletteChange(Number(e.target.value) as 0 | 1)}
          className="w-full bg-gray-700 rounded px-2 py-1"
        >
          <option value={0}>OBP0 ($E4 normal)</option>
          <option value={1}>OBP1 ($1B inverted)</option>
        </select>
        <label className="flex items-center gap-2 mt-2 text-gray-300">
          <input type="checkbox" checked={priority} onChange={(e) => onPriorityChange(e.target.checked)} />
          Behind background (priority)
        </label>
        <p className="text-xs text-gray-500 mt-1">Colour 0 is transparent in-game.</p>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Size (tiles)</div>
        <div className="flex items-center gap-2">
          <NumberField
            min={1} max={MAX_SPRITE_TILES_DIM} value={tilesWidth} aria-label="Width in tiles"
            onCommit={(n) => onResize(n, tilesHeight)}
            className="w-16 bg-gray-700 rounded px-2 py-1"
          />
          <span>×</span>
          <NumberField
            min={1} max={MAX_SPRITE_TILES_DIM} value={tilesHeight} aria-label="Height in tiles"
            onCommit={(n) => onResize(tilesWidth, n)}
            className="w-16 bg-gray-700 rounded px-2 py-1"
          />
        </div>
        <label className="block text-xs text-gray-400 mt-2" htmlFor="zoom">Zoom ({pixelSize}px)</label>
        <input id="zoom" type="range" min={4} max={32} value={pixelSize} onChange={(e) => onPixelSizeChange(Number(e.target.value))} className="w-full" />
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">
          Frames — {currentFrame + 1}/{frames.length} (max {MAX_FRAMES})
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {frames.map((_, i) => (
            <button
              key={i}
              aria-label={`Frame ${i + 1}`}
              data-tip={`Edit frame ${i + 1}`}
              aria-pressed={i === currentFrame}
              onClick={() => onSelectFrame(i)}
              className={`w-7 h-7 rounded text-xs ${i === currentFrame ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-2">
          <button className={small} data-tip="Add a new empty animation frame" onClick={onAddFrame}>Add</button>
          <button className={small} data-tip="Copy the current frame into a new one" onClick={onDuplicateFrame}>Duplicate</button>
          <button className={small} data-tip="Delete the current frame" onClick={onDeleteFrame} disabled={frames.length <= 1}>Delete</button>
        </div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor="duration">Duration (1/60 s ticks)</label>
        <NumberField
          id="duration" min={1} max={MAX_FRAME_TICKS} value={frames[currentFrame].duration}
          onCommit={onDurationChange}
          className="w-20 bg-gray-700 rounded px-2 py-1"
        />
        <label className="flex items-center gap-2 mt-2 text-gray-300">
          <input type="checkbox" checked={onionSkin} onChange={(e) => onOnionSkinChange(e.target.checked)} />
          Onion skin (previous frame)
        </label>
        <div className="flex items-center gap-3 mt-2">
          <button
            className="flex items-center gap-1 px-3 py-1 rounded bg-green-700 text-white hover:bg-green-600 disabled:opacity-40"
            onClick={onTogglePlay}
            disabled={frames.length < 2}
            aria-label={isPlaying ? 'Stop' : 'Play'}
          >
            {isPlaying ? <BsStopFill size={14} /> : <BsPlayFill size={14} />}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <label className="flex items-center gap-1 text-gray-300">
            <input type="checkbox" checked={loop} onChange={(e) => onLoopChange(e.target.checked)} /> Loop
          </label>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Tracing image</div>
        {!backgroundImage ? (
          <input
            type="file" accept="image/*" aria-label="Load tracing image"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoadBackgroundImage(f); e.target.value = ''; }}
            className="w-full text-xs"
          />
        ) : (
          <div className="space-y-1">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={backgroundEnabled} onChange={(e) => onBackgroundEnabledChange(e.target.checked)} /> Show
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={backgroundAdjustMode} onChange={(e) => onBackgroundAdjustModeChange(e.target.checked)} /> Adjust (drag / scroll)
            </label>
            <label className="block text-xs text-gray-400">Opacity</label>
            <input type="range" min={0.05} max={1} step={0.05} value={backgroundOpacity} aria-label="Opacity" onChange={(e) => onBackgroundOpacityChange(Number(e.target.value))} className="w-full" />
            <label className="block text-xs text-gray-400">Scale ({backgroundScale.toFixed(1)}x)</label>
            <input type="range" min={0.1} max={5} step={0.1} value={backgroundScale} aria-label="Scale" onChange={(e) => onBackgroundScaleChange(Number(e.target.value))} className="w-full" />
            <button className={btn} onClick={onClearBackgroundImage}>Remove image</button>
          </div>
        )}
      </div>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <div className="space-y-1">
        <button className={btn} onClick={props.onLoad}>Load project</button>
        <button className={btn} onClick={props.onSave}>Save project</button>
        <button className={btn} onClick={props.onExportASM}>Export RGBDS (.asm)</button>
        <button className={btn} onClick={props.onExportC}>Export C (.h)</button>
        <button className={btn} onClick={props.onExport2bpp}>Export .2bpp (tiles)</button>
        <button className="w-full px-3 py-2 rounded text-sm bg-red-700 text-white hover:bg-red-600" onClick={props.onClear}>Clear frame</button>
      </div>
    </div>
  );
}
