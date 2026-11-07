'use client';

import { useState, useEffect } from 'react';
import { useMapDrawing } from '@/hooks/useMapDrawing';
import { useMapProject } from '@/hooks/useMapProject';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { EditorToolbar } from '@/components/EditorToolbar';
import { MapToolbarContent } from '@/components/MapToolbarContent';
import { MapCanvas } from '@/components/MapCanvas';
import { FileNameModal, FileNameAction } from '@/components/FileNameModal';
import { MapInstructionsModal, shouldShowMapInstructions } from '@/components/MapInstructionsModal';
import { PALETTE_PRESETS, PalettePreset } from '@/constants';
import { BGP_PRESETS, DEFAULT_MAP_ZOOM, ExportArea } from '@/constants/map';
import { applyPaletteRegister } from '@/constants/sprite';

export default function MapEditorPage() {
  const [fileName, setFileName] = useState('map');
  const [modalAction, setModalAction] = useState<FileNameAction | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_MAP_ZOOM);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preset, setPreset] = useState<PalettePreset>(PALETTE_PRESETS[0]);
  const [exportArea, setExportArea] = useState<ExportArea>('full');

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstructions(shouldShowMapInstructions());
  }, []);

  const drawing = useMapDrawing();
  useUndoRedoShortcuts({ onUndo: drawing.undo, onRedo: drawing.redo });

  const {
    projectInputRef, tilesetInputRef, saveProject, exportASM, exportC, exportTilemap, export2bpp,
    loadProject, importTileset, triggerLoadDialog, triggerTilesetDialog,
  } = useMapProject({
    map: drawing.map,
    tiles: drawing.tiles,
    scx: drawing.scx,
    scy: drawing.scy,
    exportArea,
    fileName,
    setFileName,
    loadProjectData: drawing.loadProjectData,
    setTileset: drawing.setTileset,
  });

  const displayPreset = applyPaletteRegister(preset, BGP_PRESETS[drawing.bgpIndex].value);

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
        title="Map Editor"
        infoId="map-editor-info"
        infoDescription="Paint the Game Boy's 32x32 background tile map. The screen shows a 20x18 tile window that scrolls with SCX/SCY."
      >
        <MapToolbarContent
          currentTool={drawing.currentTool}
          onSelectTool={drawing.selectTool}
          tiles={drawing.tiles}
          selectedTile={drawing.selectedTile}
          onSelectTile={drawing.setSelectedTile}
          displayPreset={displayPreset}
          basePreset={preset}
          onPresetChange={setPreset}
          bgpIndex={drawing.bgpIndex}
          onBgpChange={drawing.setBgpIndex}
          showGrid={drawing.showGrid}
          onShowGridChange={drawing.setShowGrid}
          showViewport={drawing.showViewport}
          onShowViewportChange={drawing.setShowViewport}
          scx={drawing.scx}
          scy={drawing.scy}
          onMoveViewport={drawing.moveViewport}
          zoom={zoom}
          onZoomChange={setZoom}
          exportArea={exportArea}
          onExportAreaChange={setExportArea}
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
          onExportTilemap={() => setModalAction('exportMap')}
          onExport2bpp={() => setModalAction('export2bpp')}
          onClear={drawing.clearMap}
        />
      </EditorToolbar>

      <input ref={projectInputRef} type="file" accept=".json" onChange={loadProject} className="hidden" data-testid="project-input" />
      <input ref={tilesetInputRef} type="file" accept=".json,.2bpp" onChange={importTileset} className="hidden" data-testid="tileset-input" />

      <div className={`min-h-screen transition-all duration-300 ${toolbarOpen ? 'ml-[220px]' : 'ml-0'}`}>
        <MapCanvas
          map={drawing.map}
          tiles={drawing.tiles}
          preset={displayPreset}
          zoom={zoom}
          currentTool={drawing.currentTool}
          showGrid={drawing.showGrid}
          showViewport={drawing.showViewport}
          scx={drawing.scx}
          scy={drawing.scy}
          rectStart={drawing.rectStart}
          rectEnd={drawing.rectEnd}
          onBeginStroke={drawing.beginStroke}
          onContinueStroke={drawing.continueStroke}
          onEndStroke={drawing.endStroke}
          onZoomChange={setZoom}
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
          href: '/map_examples.html',
          description:
            'the Map example copies the exported tile map into the background map and scrolls it.',
        }}
      />

      <MapInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}
