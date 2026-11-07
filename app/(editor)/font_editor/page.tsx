'use client';

import { useState, useEffect } from 'react';
import { useFontDrawing } from '@/hooks/useFontDrawing';
import { useFontProject } from '@/hooks/useFontProject';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { EditorToolbar } from '@/components/EditorToolbar';
import { FontToolbarContent } from '@/components/FontToolbarContent';
import { FontGrid } from '@/components/FontGrid';
import { FontPreview } from '@/components/FontPreview';
import { TileCanvas } from '@/components/TileCanvas';
import { FileNameModal, FileNameAction } from '@/components/FileNameModal';
import { FontInstructionsModal, shouldShowFontInstructions } from '@/components/FontInstructionsModal';
import { PALETTE_PRESETS, PalettePreset } from '@/constants';
import { DEFAULT_GLYPH_ZOOM, DEFAULT_PREVIEW_TEXT } from '@/constants/font';

const noop = () => {};

export default function FontEditorPage() {
  const [fileName, setFileName] = useState('font');
  const [modalAction, setModalAction] = useState<FileNameAction | null>(null);
  const [pixelSize, setPixelSize] = useState(DEFAULT_GLYPH_ZOOM);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preset, setPreset] = useState<PalettePreset>(PALETTE_PRESETS[0]);
  const [previewText, setPreviewText] = useState(DEFAULT_PREVIEW_TEXT);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstructions(shouldShowFontInstructions());
  }, []);

  const drawing = useFontDrawing();
  useUndoRedoShortcuts({ onUndo: drawing.undo, onRedo: drawing.redo });

  const {
    projectInputRef, importInputRef, saveProject, exportASM, exportC, export2bpp, export1bpp,
    loadProject, import2bpp, triggerLoadDialog, triggerImportDialog,
  } = useFontProject({
    glyphs: drawing.glyphs,
    fileName,
    setFileName,
    loadFontData: drawing.loadFontData,
  });

  const handleModalConfirm = () => {
    switch (modalAction) {
      case 'save': saveProject(); break;
      case 'export': exportASM(); break;
      case 'exportC': exportC(); break;
      case 'export2bpp': export2bpp(); break;
      case 'export1bpp': export1bpp(); break;
    }
    setModalAction(null);
  };

  return (
    <>
      <EditorToolbar
        isOpen={toolbarOpen}
        onToggle={() => setToolbarOpen(!toolbarOpen)}
        title="Font Editor"
        infoId="font-editor-info"
        infoDescription="Edit a 96-glyph (ASCII 32-127) 8x8 font for the Game Boy. Each glyph is a 2bpp tile."
      >
        <FontToolbarContent
          currentTool={drawing.currentTool}
          onSelectTool={drawing.selectTool}
          currentShade={drawing.currentShade}
          onShadeChange={drawing.setCurrentShade}
          preset={preset}
          onPresetChange={setPreset}
          selectedGlyph={drawing.selectedGlyph}
          pixelSize={pixelSize}
          onPixelSizeChange={setPixelSize}
          hasClipboard={drawing.hasClipboard}
          onCopy={drawing.copyGlyph}
          onPaste={drawing.pasteGlyph}
          onClearGlyph={drawing.clearGlyph}
          onResetGlyph={drawing.resetGlyphToStarter}
          onLoadStarter={drawing.loadStarterFont}
          onClearAll={drawing.clearAll}
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
          onExport1bpp={() => setModalAction('export1bpp')}
        />
      </EditorToolbar>

      <input ref={projectInputRef} type="file" accept=".json" onChange={loadProject} className="hidden" data-testid="project-input" />
      <input ref={importInputRef} type="file" accept=".2bpp" onChange={import2bpp} className="hidden" data-testid="import-input" />

      <div className={`min-h-screen transition-all duration-300 ${toolbarOpen ? 'ml-[220px]' : 'ml-0'}`}>
        <TileCanvas
          heightClassName="h-[60vh]"
          pixels={drawing.pixels}
          tilesWidth={1}
          tilesHeight={1}
          pixelSize={pixelSize}
          preset={preset}
          showTileNumbers={false}
          currentTool={drawing.currentTool}
          lineStart={drawing.lineStart}
          linePreview={drawing.linePreview}
          isDrawing={drawing.isDrawing}
          backgroundImage={null}
          backgroundOpacity={0.3}
          backgroundEnabled={false}
          backgroundX={0}
          backgroundY={0}
          backgroundScale={1}
          backgroundAdjustMode={false}
          onSetIsDrawing={drawing.setIsDrawing}
          onStrokeStart={drawing.pushHistory}
          onSetPixel={drawing.setPixel}
          onDrawLine={drawing.drawLine}
          onSetLineStart={drawing.setLineStart}
          onSetLinePreview={drawing.setLinePreview}
          onBucketFill={drawing.bucketFill}
          onBackgroundMove={noop}
          onBackgroundScale={noop}
          onPixelSizeChange={setPixelSize}
        />

        <div className="px-4 pb-6 flex flex-wrap gap-6 items-start">
          <FontGrid glyphs={drawing.glyphs} selected={drawing.selectedGlyph} onSelect={drawing.selectGlyph} preset={preset} />
          <div className="space-y-2">
            <label className="block text-xs text-gray-400" htmlFor="preview-text">Preview text</label>
            <textarea
              id="preview-text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              rows={3}
              className="w-80 bg-gray-700 rounded px-2 py-1 text-sm font-mono"
            />
            <FontPreview glyphs={drawing.glyphs} text={previewText} preset={preset} />
          </div>
        </div>
      </div>

      <FileNameModal
        isOpen={modalAction !== null}
        action={modalAction}
        fileName={fileName}
        onFileNameChange={setFileName}
        onConfirm={handleModalConfirm}
        onCancel={() => setModalAction(null)}
        docsLink={{
          href: '/font_examples.html',
          description:
            'the Font example prints text on the screen using the exported font.',
        }}
      />

      <FontInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}
