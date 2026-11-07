'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMetatileDrawing } from '@/hooks/useMetatileDrawing';
import { useMetatileProject } from '@/hooks/useMetatileProject';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { EditorToolbar } from '@/components/EditorToolbar';
import { MetatileToolbarContent } from '@/components/MetatileToolbarContent';
import { CellGridCanvas } from '@/components/CellGridCanvas';
import { FileNameModal, FileNameAction } from '@/components/FileNameModal';
import { MetatileInstructionsModal, shouldShowMetatileInstructions } from '@/components/MetatileInstructionsModal';
import { PALETTE_PRESETS, PalettePreset, TILE_SIZE } from '@/constants';
import { DEFAULT_METATILE_ZOOM } from '@/constants/level';
import { MetatileTool } from '@/types/metatile';
import { renderTileCanvas } from '@/utils/render';

const STATUS: Record<MetatileTool, string> = {
  stamp: 'Click and drag to place the selected tile',
  fill: 'Click to flood-fill matching tiles',
  pick: 'Click a cell to pick its tile',
  rubber: 'Click and drag to erase (tile 0)',
};

export default function MetatileEditorPage() {
  const [fileName, setFileName] = useState('metatiles');
  const [modalAction, setModalAction] = useState<FileNameAction | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_METATILE_ZOOM);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preset, setPreset] = useState<PalettePreset>(PALETTE_PRESETS[0]);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstructions(shouldShowMetatileInstructions());
  }, []);

  const drawing = useMetatileDrawing();
  useUndoRedoShortcuts({ onUndo: drawing.undo, onRedo: drawing.redo });

  const {
    projectInputRef, tilesetInputRef, saveProject, exportASM, exportC, export2bpp,
    loadProject, importTileset, triggerLoadDialog, triggerTilesetDialog,
  } = useMetatileProject({
    mw: drawing.mw,
    mh: drawing.mh,
    tiles: drawing.tiles,
    metatiles: drawing.metatiles,
    fileName,
    setFileName,
    loadProjectData: drawing.loadProjectData,
    setTileset: drawing.setTileset,
  });

  // Offscreen render of each tile, redrawn only when the tileset or palette changes
  // (skipped during server prerendering, where there is no document; cells are only drawn in effects)
  const tileCanvases = useMemo(
    () => (typeof document === 'undefined' ? [] : drawing.tiles.map((t) => renderTileCanvas(t, preset))),
    [drawing.tiles, preset]
  );
  const grid = drawing.current.tiles;

  const renderCell = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, w: number, h: number) => {
      ctx.drawImage(tileCanvases[grid[y][x]] ?? tileCanvases[0], px, py, w, h);
    },
    [tileCanvases, grid]
  );

  const onWheelZoom = useCallback((dir: 1 | -1) => setZoom((z) => Math.max(2, Math.min(16, z + dir))), []);

  const handleModalConfirm = () => {
    switch (modalAction) {
      case 'save': saveProject(); break;
      case 'export': exportASM(); break;
      case 'exportC': exportC(); break;
      case 'export2bpp': export2bpp(); break;
    }
    setModalAction(null);
  };

  return (
    <>
      <EditorToolbar
        isOpen={toolbarOpen}
        onToggle={() => setToolbarOpen(!toolbarOpen)}
        title="Metatile Editor"
        infoId="metatile-editor-info"
        infoDescription="Build metatiles of any width and height (2x2, 4x4, 1x4...) from tiles. Metatiles are the building blocks of the Level Editor."
      >
        <MetatileToolbarContent
          currentTool={drawing.currentTool}
          onSelectTool={drawing.selectTool}
          tiles={drawing.tiles}
          selectedTile={drawing.selectedTile}
          onSelectTile={drawing.setSelectedTile}
          metatiles={drawing.metatiles}
          selectedMetatile={drawing.selectedMetatile}
          onSelectMetatile={drawing.selectMetatile}
          mw={drawing.mw}
          mh={drawing.mh}
          onSizeChange={drawing.setSize}
          solid={drawing.current.solid}
          onToggleSolid={drawing.toggleSolid}
          onAddMetatile={drawing.addMetatile}
          onDuplicateMetatile={drawing.duplicateMetatile}
          onDeleteMetatile={drawing.deleteMetatile}
          onClearMetatile={drawing.clearMetatile}
          preset={preset}
          onPresetChange={setPreset}
          showGrid={showGrid}
          onShowGridChange={setShowGrid}
          zoom={zoom}
          onZoomChange={setZoom}
          onUndo={drawing.undo}
          onRedo={drawing.redo}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          historyIndex={drawing.historyIndex}
          onLoad={triggerLoadDialog}
          onSave={() => setModalAction('save')}
          onImportTileset={triggerTilesetDialog}
          onExportASM={() => setModalAction('export')}
          onExportC={() => setModalAction('exportC')}
          onExport2bpp={() => setModalAction('export2bpp')}
        />
      </EditorToolbar>

      <input ref={projectInputRef} type="file" accept=".json" onChange={loadProject} className="hidden" data-testid="project-input" />
      <input ref={tilesetInputRef} type="file" accept=".json,.2bpp" onChange={importTileset} className="hidden" data-testid="tileset-input" />

      <div className={`min-h-screen transition-all duration-300 ${toolbarOpen ? 'ml-[220px]' : 'ml-0'}`}>
        <CellGridCanvas
          testId="metatile-canvas"
          cols={drawing.mw}
          rows={drawing.mh}
          cellSize={TILE_SIZE * zoom}
          renderCell={renderCell}
          showGrid={showGrid}
          panTool={false}
          status={STATUS[drawing.currentTool]}
          hoverLabel={(x, y) => `Cell ${x},${y} — tile ${grid[y][x]}`}
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
            'the Level example uses exported metatiles to draw a level, with collision and a scrolling camera.',
        }}
      />

      <MetatileInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}
