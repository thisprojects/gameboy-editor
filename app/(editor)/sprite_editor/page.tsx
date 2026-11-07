'use client';

import { useState, useEffect } from 'react';
import { useSpriteDrawing } from '@/hooks/useSpriteDrawing';
import { useSpriteProject } from '@/hooks/useSpriteProject';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { EditorToolbar } from '@/components/EditorToolbar';
import { SpriteToolbarContent } from '@/components/SpriteToolbarContent';
import { TileCanvas } from '@/components/TileCanvas';
import { FileNameModal, FileNameAction } from '@/components/FileNameModal';
import { SpriteInstructionsModal, shouldShowSpriteInstructions } from '@/components/SpriteInstructionsModal';
import { DEFAULT_PIXEL_SIZE, PALETTE_PRESETS, PalettePreset } from '@/constants';
import { OBP_PRESETS, applyPaletteRegister } from '@/constants/sprite';

export default function SpriteEditorPage() {
  const [fileName, setFileName] = useState('sprite');
  const [modalAction, setModalAction] = useState<FileNameAction | null>(null);
  const [pixelSize, setPixelSize] = useState(DEFAULT_PIXEL_SIZE);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preset, setPreset] = useState<PalettePreset>(PALETTE_PRESETS[0]);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstructions(shouldShowSpriteInstructions());
  }, []);

  const drawing = useSpriteDrawing();
  useUndoRedoShortcuts({ onUndo: drawing.undo, onRedo: drawing.redo });

  const { projectInputRef, saveProject, exportASM, exportC, export2bpp, loadProject, triggerLoadDialog } =
    useSpriteProject({
      frames: drawing.frames,
      tilesWidth: drawing.tilesWidth,
      tilesHeight: drawing.tilesHeight,
      objSize: drawing.objSize,
      palette: drawing.palette,
      priority: drawing.priority,
      fileName,
      setFileName,
      loadProjectData: drawing.loadProjectData,
    });

  // The canvas shows colour indices through the selected OBP register
  const displayPreset = applyPaletteRegister(preset, OBP_PRESETS[drawing.palette].value);

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
        title="Sprite Editor"
        infoId="sprite-editor-info"
        infoDescription="Create animated Game Boy sprites from 8x8 or 8x16 hardware sprites. Colour 0 is transparent; up to 32 frames."
      >
        <SpriteToolbarContent
          currentTool={drawing.currentTool}
          onSelectTool={drawing.selectTool}
          currentShade={drawing.currentShade}
          onShadeChange={drawing.setCurrentShade}
          preset={displayPreset}
          onPresetChange={setPreset}
          palette={drawing.palette}
          onPaletteChange={drawing.setPalette}
          priority={drawing.priority}
          onPriorityChange={drawing.setPriority}
          objSize={drawing.objSize}
          onObjSizeChange={drawing.setObjSize}
          tilesWidth={drawing.tilesWidth}
          tilesHeight={drawing.tilesHeight}
          onResize={drawing.resizeCanvas}
          pixelSize={pixelSize}
          onPixelSizeChange={setPixelSize}
          frames={drawing.frames}
          currentFrame={drawing.currentFrame}
          onSelectFrame={drawing.selectFrame}
          onAddFrame={drawing.addFrame}
          onDuplicateFrame={drawing.duplicateFrame}
          onDeleteFrame={drawing.deleteFrame}
          onDurationChange={drawing.setFrameDuration}
          onionSkin={drawing.onionSkin}
          onOnionSkinChange={drawing.setOnionSkin}
          isPlaying={drawing.isPlaying}
          onTogglePlay={drawing.togglePlay}
          loop={drawing.loop}
          onLoopChange={drawing.setLoop}
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
          onExportASM={() => setModalAction('export')}
          onExportC={() => setModalAction('exportC')}
          onExport2bpp={() => setModalAction('export2bpp')}
          onClear={drawing.clearFrame}
        />
      </EditorToolbar>

      <input ref={projectInputRef} type="file" accept=".json" onChange={loadProject} className="hidden" data-testid="project-input" />

      <div className={`min-h-screen transition-all duration-300 ${toolbarOpen ? 'ml-[220px]' : 'ml-0'}`}>
        <TileCanvas
          pixels={drawing.pixels}
          onionPixels={drawing.isPlaying ? null : drawing.onionPixels}
          tilesWidth={drawing.tilesWidth}
          tilesHeight={drawing.tilesHeight}
          pixelSize={pixelSize}
          preset={displayPreset}
          showTileNumbers={false}
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
          href: '/sprite_examples.html',
          description:
            'the Sprites example animates and moves an exported sprite using the sprite table (OAM).',
        }}
      />

      <SpriteInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}
