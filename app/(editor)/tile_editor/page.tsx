'use client';

import { useState, useEffect } from 'react';
import { useTileDrawing } from '@/hooks/useTileDrawing';
import { useTileProject } from '@/hooks/useTileProject';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { EditorToolbar } from '@/components/EditorToolbar';
import { TileToolbarContent } from '@/components/TileToolbarContent';
import { TileCanvas } from '@/components/TileCanvas';
import { FileNameModal, FileNameAction } from '@/components/FileNameModal';
import { TileInstructionsModal, shouldShowTileInstructions } from '@/components/TileInstructionsModal';
import { DEFAULT_PIXEL_SIZE, PALETTE_PRESETS, PalettePreset } from '@/constants';

export default function TileEditorPage() {
  const [fileName, setFileName] = useState('tiles');
  const [modalAction, setModalAction] = useState<FileNameAction | null>(null);
  const [pixelSize, setPixelSize] = useState(DEFAULT_PIXEL_SIZE);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preset, setPreset] = useState<PalettePreset>(PALETTE_PRESETS[0]);
  const [showTileNumbers, setShowTileNumbers] = useState(true);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstructions(shouldShowTileInstructions());
  }, []);

  const drawing = useTileDrawing();
  useUndoRedoShortcuts({ onUndo: drawing.undo, onRedo: drawing.redo });

  const {
    projectInputRef, importInputRef, saveProject, exportASM, exportC, export2bpp,
    loadProject, import2bpp, triggerLoadDialog, triggerImportDialog,
  } = useTileProject({
    pixels: drawing.pixels,
    tilesWidth: drawing.tilesWidth,
    tilesHeight: drawing.tilesHeight,
    fileName,
    setFileName,
    loadProjectData: drawing.loadProjectData,
  });

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
        title="Tile Editor"
        infoId="tile-editor-info"
        infoDescription="Create 8x8 tiles for the Game Boy. Each pixel has one of 4 shades (2 bits per pixel). VRAM holds up to 384 tiles."
      >
        <TileToolbarContent
          currentTool={drawing.currentTool}
          onSelectTool={drawing.selectTool}
          currentShade={drawing.currentShade}
          onShadeChange={drawing.setCurrentShade}
          preset={preset}
          onPresetChange={setPreset}
          showTileNumbers={showTileNumbers}
          onShowTileNumbersChange={setShowTileNumbers}
          tilesWidth={drawing.tilesWidth}
          tilesHeight={drawing.tilesHeight}
          onResize={drawing.resizeCanvas}
          pixelSize={pixelSize}
          onPixelSizeChange={setPixelSize}
          backgroundImage={drawing.backgroundImage}
          backgroundEnabled={drawing.backgroundEnabled}
          backgroundOpacity={drawing.backgroundOpacity}
          backgroundScale={drawing.backgroundScale}
          backgroundAdjustMode={drawing.backgroundAdjustMode}
          onBackgroundEnabledChange={drawing.setBackgroundEnabled}
          onBackgroundOpacityChange={drawing.setBackgroundOpacity}
          onBackgroundScaleChange={drawing.setBackgroundScale}
          onBackgroundAdjustModeChange={drawing.setBackgroundAdjustMode}
          onLoadBackgroundImage={drawing.loadBackgroundImage}
          onClearBackgroundImage={drawing.clearBackgroundImage}
          onUndo={drawing.undo}
          onRedo={drawing.redo}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          historyIndex={drawing.historyIndex}
          onLoad={triggerLoadDialog}
          onSave={() => setModalAction('save')}
          onImport2bpp={triggerImportDialog}
          onExportASM={() => setModalAction('export')}
          onExportC={() => setModalAction('exportC')}
          onExport2bpp={() => setModalAction('export2bpp')}
          onClear={drawing.clearCanvas}
        />
      </EditorToolbar>

      <input ref={projectInputRef} type="file" accept=".json" onChange={loadProject} className="hidden" data-testid="project-input" />
      <input ref={importInputRef} type="file" accept=".2bpp" onChange={import2bpp} className="hidden" data-testid="import-input" />

      <div className={`min-h-screen transition-all duration-300 ${toolbarOpen ? 'ml-[220px]' : 'ml-0'}`}>
        <TileCanvas
          pixels={drawing.pixels}
          tilesWidth={drawing.tilesWidth}
          tilesHeight={drawing.tilesHeight}
          pixelSize={pixelSize}
          preset={preset}
          showTileNumbers={showTileNumbers}
          currentTool={drawing.currentTool}
          lineStart={drawing.lineStart}
          linePreview={drawing.linePreview}
          isDrawing={drawing.isDrawing}
          backgroundImage={drawing.backgroundImage}
          backgroundOpacity={drawing.backgroundOpacity}
          backgroundEnabled={drawing.backgroundEnabled}
          backgroundX={drawing.backgroundX}
          backgroundY={drawing.backgroundY}
          backgroundScale={drawing.backgroundScale}
          backgroundAdjustMode={drawing.backgroundAdjustMode}
          onSetIsDrawing={drawing.setIsDrawing}
          onStrokeStart={drawing.pushHistory}
          onSetPixel={drawing.setPixel}
          onDrawLine={drawing.drawLine}
          onSetLineStart={drawing.setLineStart}
          onSetLinePreview={drawing.setLinePreview}
          onBucketFill={drawing.bucketFill}
          onBackgroundMove={(x, y) => {
            drawing.setBackgroundX(x);
            drawing.setBackgroundY(y);
          }}
          onBackgroundScale={drawing.setBackgroundScale}
          onPixelSizeChange={setPixelSize}
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
          href: '/tile_examples.html',
          description:
            'the Tiles example loads the exported tile data into video memory and shows it, step by step, with RGBDS and an emulator.',
        }}
      />

      <TileInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}
