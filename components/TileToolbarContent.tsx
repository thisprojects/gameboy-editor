'use client';

import { ToolbarSection } from './ToolbarSection';
import { ToolGrid } from './ToolGrid';
import { FileActions } from './FileActions';
import { TracingImagePicker } from './TracingImagePicker';

import { Tool } from '@/types';
import { BsPencilFill, BsEraserFill, BsPaintBucket, BsArrowsMove } from 'react-icons/bs';
import { TbLine } from 'react-icons/tb';
import { PALETTE_PRESETS, PalettePreset, MAX_TILES, MAX_TILES_WIDTH } from '@/constants';
import { ShadePicker } from './ShadePicker';
import { UndoRedoButtons } from './UndoRedoButtons';
import { NumberField } from './NumberField';

interface TileToolbarContentProps {
  currentTool: Tool;
  onSelectTool: (tool: Tool) => void;
  currentShade: number;
  onShadeChange: (shade: number) => void;
  preset: PalettePreset;
  onPresetChange: (preset: PalettePreset) => void;
  showTileNumbers: boolean;
  onShowTileNumbersChange: (show: boolean) => void;
  tilesWidth: number;
  tilesHeight: number;
  onResize: (width: number, height: number) => void;
  pixelSize: number;
  onPixelSizeChange: (size: number) => void;
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
  onImport2bpp: () => void;
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

const btn = 'w-full px-3 py-2 rounded text-sm bg-gray-700 text-gray-200 hover:bg-gray-600';

export function TileToolbarContent(props: TileToolbarContentProps) {
  const {
    currentTool, onSelectTool, currentShade, onShadeChange, preset, onPresetChange,
    showTileNumbers, onShowTileNumbersChange, tilesWidth, tilesHeight, onResize,
    pixelSize, onPixelSizeChange, backgroundImage, backgroundEnabled, backgroundOpacity,
    backgroundScale, backgroundAdjustMode, onBackgroundEnabledChange, onBackgroundOpacityChange,
    onBackgroundScaleChange, onBackgroundAdjustModeChange, onLoadBackgroundImage, onClearBackgroundImage,
  } = props;

  return (
    <div className="flex flex-1 flex-col gap-3 text-sm">
      <ToolbarSection title="Tools">
        <ToolGrid tools={TOOLS} current={currentTool} onSelect={onSelectTool} />
      </ToolbarSection>

      <ToolbarSection title="Shade">
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
      </ToolbarSection>

      <ToolbarSection title={<>Canvas size (tiles) — {tilesWidth * tilesHeight}/{MAX_TILES}</>}>
        <div className="flex items-center gap-2">
          <NumberField
            min={1} max={MAX_TILES_WIDTH} value={tilesWidth} aria-label="Width in tiles"
            onCommit={(n) => onResize(n, tilesHeight)}
            className="w-16 bg-gray-700 rounded px-2 py-1"
          />
          <span>×</span>
          <NumberField
            min={1} value={tilesHeight} aria-label="Height in tiles"
            onCommit={(n) => onResize(tilesWidth, n)}
            className="w-16 bg-gray-700 rounded px-2 py-1"
          />
        </div>
        <label className="flex items-center gap-2 mt-2 text-gray-300">
          <input type="checkbox" checked={showTileNumbers} onChange={(e) => onShowTileNumbersChange(e.target.checked)} />
          Show tile numbers
        </label>
        <label className="block text-xs text-gray-400 mt-2" htmlFor="zoom">Zoom ({pixelSize}px)</label>
        <input id="zoom" type="range" min={4} max={32} value={pixelSize} onChange={(e) => onPixelSizeChange(Number(e.target.value))} className="w-full" />
      </ToolbarSection>

      <ToolbarSection title="Tracing image" defaultOpen={false} openWhen={backgroundImage !== null}>
        {!backgroundImage ? (
          <TracingImagePicker onFile={onLoadBackgroundImage} />
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
      </ToolbarSection>

      <UndoRedoButtons onUndo={props.onUndo} onRedo={props.onRedo} canUndo={props.canUndo} canRedo={props.canRedo} historyIndex={props.historyIndex} />

      <FileActions
        onLoad={props.onLoad}
        onSave={props.onSave}
        imports={[
          { label: 'Import .2bpp', onClick: props.onImport2bpp },
        ]}
        exports={[
          { label: 'Export RGBDS (.asm)', onClick: props.onExportASM },
          { label: 'Export C (.h)', onClick: props.onExportC },
          { label: 'Export .2bpp', onClick: props.onExport2bpp },
        ]}
        clear={{ label: 'Clear', onClick: props.onClear }}
      />
    </div>
  );
}
