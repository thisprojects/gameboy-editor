'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLevelDrawing } from '@/hooks/useLevelDrawing';
import { useLevelProject } from '@/hooks/useLevelProject';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { EditorToolbar } from '@/components/EditorToolbar';
import { LevelToolbarContent } from '@/components/LevelToolbarContent';
import { CellGridCanvas } from '@/components/CellGridCanvas';
import { FileNameModal, FileNameAction } from '@/components/FileNameModal';
import { LevelInstructionsModal, shouldShowLevelInstructions } from '@/components/LevelInstructionsModal';
import { PALETTE_PRESETS, PalettePreset, SCREEN_TILES_X, SCREEN_TILES_Y, TILE_SIZE } from '@/constants';
import { BGP_PRESETS } from '@/constants/map';
import { DEFAULT_LEVEL_ZOOM } from '@/constants/level';
import { applyPaletteRegister } from '@/constants/sprite';
import { MapTool } from '@/types/map';
import { renderMetatileCanvas } from '@/utils/render';

const STATUS: Record<MapTool, string> = {
  stamp: 'Click and drag to paint the selected metatile',
  rect: 'Drag to fill a rectangle with the selected metatile',
  fill: 'Click to flood-fill matching metatiles',
  pick: 'Click a cell to pick its metatile',
  rubber: 'Click and drag to erase (metatile 0)',
  pan: 'Click and drag to pan; scroll also pans, pinch or Ctrl/Cmd+scroll zooms',
};

export default function LevelEditorPage() {
  const [fileName, setFileName] = useState('level');
  const [modalAction, setModalAction] = useState<FileNameAction | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_LEVEL_ZOOM);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preset, setPreset] = useState<PalettePreset>(PALETTE_PRESETS[0]);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstructions(shouldShowLevelInstructions());
  }, []);

  const drawing = useLevelDrawing();
  useUndoRedoShortcuts({ onUndo: drawing.undo, onRedo: drawing.redo });

  const {
    projectInputRef, libraryInputRef, saveProject, exportASM, exportC, exportTilemap, export2bpp,
    loadProject, importLibrary, triggerLoadDialog, triggerLibraryDialog,
  } = useLevelProject({
    map: drawing.map,
    mw: drawing.mw,
    mh: drawing.mh,
    tiles: drawing.tiles,
    metatiles: drawing.metatiles,
    fileName,
    setFileName,
    loadProjectData: drawing.loadProjectData,
    setLibrary: drawing.setLibrary,
  });

  const displayPreset = useMemo(
    () => applyPaletteRegister(preset, BGP_PRESETS[drawing.bgpIndex].value),
    [preset, drawing.bgpIndex]
  );

  // Offscreen render of every metatile, redrawn only when the library or palette changes
  // (skipped during server prerendering, where there is no document; cells are only drawn in effects)
  const metatileCanvases = useMemo(
    () =>
      typeof document === 'undefined'
        ? []
        : drawing.metatiles.map((m) => renderMetatileCanvas(m.tiles, drawing.tiles, displayPreset)),
    [drawing.metatiles, drawing.tiles, displayPreset]
  );

  const { map, metatiles, mw, mh, showCollision, showViewport, scx, scy, rectStart, rectEnd, currentTool } = drawing;
  const cellSize = mw * TILE_SIZE * zoom;
  const cellHeight = mh * TILE_SIZE * zoom;

  const renderCell = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, w: number, h: number) => {
      const index = map[y][x];
      ctx.drawImage(metatileCanvases[index] ?? metatileCanvases[0], px, py, w, h);
      if (showCollision && metatiles[index]?.solid) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(px, py, w, h);
      }
    },
    [map, metatileCanvases, metatiles, showCollision]
  );

  const overlay = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const tilePx = TILE_SIZE * zoom;
      if (showViewport) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(scx * tilePx, scy * tilePx, SCREEN_TILES_X * tilePx, SCREEN_TILES_Y * tilePx);
      }
      if (currentTool === 'rect' && rectStart && rectEnd) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.fillRect(
          Math.min(rectStart.x, rectEnd.x) * cellSize,
          Math.min(rectStart.y, rectEnd.y) * cellHeight,
          (Math.abs(rectEnd.x - rectStart.x) + 1) * cellSize,
          (Math.abs(rectEnd.y - rectStart.y) + 1) * cellHeight
        );
      }
    },
    [showViewport, scx, scy, zoom, currentTool, rectStart, rectEnd, cellSize, cellHeight]
  );

  const onWheelZoom = useCallback((dir: 1 | -1) => setZoom((z) => Math.max(1, Math.min(6, z + dir))), []);

  const handleModalConfirm = () => {
    switch (modalAction) {
      case 'save': saveProject(); break;
      case 'export': exportASM(); break;
      case 'exportC': exportC(); break;
      case 'exportMap': exportTilemap(); break;
      case 'export2bpp': export2bpp(); break;
    }
    setModalAction(null);
  };

  return (
    <>
      <EditorToolbar
        isOpen={toolbarOpen}
        onToggle={() => setToolbarOpen(!toolbarOpen)}
        title="Level Editor"
        infoId="level-editor-info"
        infoDescription="Paint scrolling Game Boy levels (up to 256x256 tiles) from a metatile library, with collision flags."
      >
        <LevelToolbarContent
          currentTool={drawing.currentTool}
          onSelectTool={drawing.selectTool}
          tiles={drawing.tiles}
          metatiles={drawing.metatiles}
          mw={drawing.mw}
          mh={drawing.mh}
          selectedMetatile={drawing.selectedMetatile}
          onSelectMetatile={drawing.setSelectedMetatile}
          displayPreset={displayPreset}
          basePreset={preset}
          onPresetChange={setPreset}
          bgpIndex={drawing.bgpIndex}
          onBgpChange={drawing.setBgpIndex}
          width={drawing.width}
          height={drawing.height}
          onResize={drawing.resizeLevel}
          showGrid={drawing.showGrid}
          onShowGridChange={drawing.setShowGrid}
          showCollision={drawing.showCollision}
          onShowCollisionChange={drawing.setShowCollision}
          showViewport={drawing.showViewport}
          onShowViewportChange={drawing.setShowViewport}
          scx={drawing.scx}
          scy={drawing.scy}
          onMoveViewport={drawing.moveViewport}
          zoom={zoom}
          onZoomChange={setZoom}
          onUndo={drawing.undo}
          onRedo={drawing.redo}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          historyIndex={drawing.historyIndex}
          onLoad={triggerLoadDialog}
          onSave={() => setModalAction('save')}
          onImportLibrary={triggerLibraryDialog}
          onExportASM={() => setModalAction('export')}
          onExportC={() => setModalAction('exportC')}
          onExportTilemap={() => setModalAction('exportMap')}
          onExport2bpp={() => setModalAction('export2bpp')}
          onClear={drawing.clearMap}
        />
      </EditorToolbar>

      <input ref={projectInputRef} type="file" accept=".json" onChange={loadProject} className="hidden" data-testid="project-input" />
      <input ref={libraryInputRef} type="file" accept=".json" onChange={importLibrary} className="hidden" data-testid="library-input" />

      <div className={`min-h-screen transition-all duration-300 ${toolbarOpen ? 'ml-[220px]' : 'ml-0'}`}>
        <CellGridCanvas
          testId="level-canvas"
          cols={drawing.width}
          rows={drawing.height}
          cellSize={cellSize}
          cellHeight={cellHeight}
          renderCell={renderCell}
          overlay={overlay}
          showGrid={drawing.showGrid}
          panTool={drawing.currentTool === 'pan'}
          status={STATUS[drawing.currentTool]}
          hoverLabel={(x, y) => `Cell ${x},${y} — metatile ${drawing.map[y][x]}`}
          onBeginStroke={drawing.beginStroke}
          onContinueStroke={drawing.continueStroke}
          onEndStroke={drawing.endStroke}
          onWheelZoom={onWheelZoom}
        />
      </div>

      <FileNameModal
        isOpen={modalAction !== null}
        action={modalAction}
        fileName={fileName}
        onFileNameChange={setFileName}
        onConfirm={handleModalConfirm}
        onCancel={() => setModalAction(null)}
        docsLink={{
          href: '/level_examples.html',
          description:
            'the Level example draws the exported level, stops a sprite at solid metatiles and scrolls a camera.',
        }}
      />

      <LevelInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}
