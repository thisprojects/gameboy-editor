'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMusicSequencer } from '@/hooks/useMusicSequencer';
import { useMusicProject } from '@/hooks/useMusicProject';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { EditorToolbar } from '@/components/EditorToolbar';
import { MusicToolbarContent } from '@/components/MusicToolbarContent';
import { MusicPatternCanvas, KEY_TO_NOTE_BASE, KEY_TO_NOTE_UP } from '@/components/MusicPatternCanvas';
import { ManageInstrumentsModal } from '@/components/ManageInstrumentsModal';
import { MusicInstructionsModal, shouldShowMusicInstructions } from '@/components/MusicInstructionsModal';
import { FileNameModal, FileNameAction } from '@/components/FileNameModal';
import { MAX_OCTAVE, MUSIC_CHANNELS } from '@/constants/music';

export default function MusicEditorPage() {
  const [fileName, setFileName] = useState('music');
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [modalAction, setModalAction] = useState<FileNameAction | null>(null);
  const [showInstrumentManager, setShowInstrumentManager] = useState(false);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInstructions(shouldShowMusicInstructions());
  }, []);

  const seq = useMusicSequencer();
  useUndoRedoShortcuts({ onUndo: seq.undo, onRedo: seq.redo });

  const { projectInputRef, saveProject, exportAsm, exportC, loadProject, triggerLoadDialog } = useMusicProject({
    patterns: seq.patterns,
    instruments: seq.instruments,
    orderList: seq.orderList,
    ticksPerRow: seq.ticksPerRow,
    fileName,
    setFileName,
    loadMusicData: seq.loadMusicData,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const lastRow = seq.selectedPattern.rows - 1;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        seq.setCursorRow(Math.max(0, seq.cursorRow - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        seq.setCursorRow(Math.min(lastRow, seq.cursorRow + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seq.setCursorChannel(Math.max(0, seq.cursorChannel - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seq.setCursorChannel(Math.min(MUSIC_CHANNELS - 1, seq.cursorChannel + 1));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        seq.clearCell(seq.cursorChannel, seq.cursorRow);
      } else if (e.key === '1') {
        e.preventDefault();
        seq.enterNoteOff(seq.cursorChannel, seq.cursorRow);
        seq.setCursorRow(Math.min(lastRow, seq.cursorRow + 1));
      } else {
        const key = e.key.toLowerCase();
        if (KEY_TO_NOTE_BASE[key]) {
          e.preventDefault();
          seq.enterNote(seq.cursorChannel, seq.cursorRow, KEY_TO_NOTE_BASE[key]);
          seq.setCursorRow(Math.min(lastRow, seq.cursorRow + 1));
        } else if (KEY_TO_NOTE_UP[key]) {
          e.preventDefault();
          const upOctave = Math.min(MAX_OCTAVE, (seq.channelOctave[seq.cursorChannel] ?? 4) + 1);
          seq.enterNote(seq.cursorChannel, seq.cursorRow, KEY_TO_NOTE_UP[key], upOctave);
          seq.setCursorRow(Math.min(lastRow, seq.cursorRow + 1));
        }
      }
    },
    [seq]
  );

  const handleModalConfirm = () => {
    switch (modalAction) {
      case 'save': saveProject(); break;
      case 'export': exportAsm(); break;
      case 'exportC': exportC(); break;
    }
    setModalAction(null);
  };

  return (
    <>
      <EditorToolbar
        isOpen={toolbarOpen}
        onToggle={() => setToolbarOpen(!toolbarOpen)}
        title="Music Editor"
        widthClassName="w-[220px]"
        infoId="music-editor-info"
        infoDescription="Compose Game Boy music across 4 channels (2 pulse, wave, noise). Preview with an emulated sound chip, then export RGBDS or C with a small player."
      >
        <MusicToolbarContent
          patterns={seq.patterns}
          orderList={seq.orderList}
          selectedPatternIndex={seq.selectedPatternIndex}
          onSelectPattern={seq.setSelectedPatternIndex}
          onAddPattern={seq.addPattern}
          onRemovePattern={seq.removePattern}
          patternRows={seq.selectedPattern.rows}
          onPatternRowsChange={seq.setPatternRows}
          onManageInstruments={() => setShowInstrumentManager(true)}
          ticksPerRow={seq.ticksPerRow}
          onTicksPerRowChange={seq.setTicksPerRow}
          onOrderListChange={seq.setOrderList}
          orderIndex={seq.orderIndex}
          isPlaying={seq.isPlaying}
          onPlay={seq.play}
          onStop={seq.stop}
          onUndo={seq.undo}
          onRedo={seq.redo}
          canUndo={seq.canUndo}
          canRedo={seq.canRedo}
          historyIndex={seq.historyIndex}
          onLoad={triggerLoadDialog}
          onSave={() => setModalAction('save')}
          onExportAsm={() => setModalAction('export')}
          onExportC={() => setModalAction('exportC')}
        />
      </EditorToolbar>

      <input ref={projectInputRef} type="file" accept=".json" onChange={loadProject} className="hidden" data-testid="project-input" />

      <div
        className={`min-h-screen transition-all duration-300 ${toolbarOpen ? 'ml-[220px]' : 'ml-0'}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-testid="music-area"
      >
        <div className="p-6 flex flex-col gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-2 text-right">
              {seq.selectedPattern.name} · click a cell, then play notes on your keyboard (Z-M / Q-U)
            </div>
            <MusicPatternCanvas
              pattern={seq.selectedPattern}
              instruments={seq.instruments}
              channelInstrument={seq.channelInstrument}
              onChannelInstrumentChange={seq.setChannelInstrument}
              channelOctave={seq.channelOctave}
              onChannelOctaveChange={seq.setChannelOctave}
              cursorRow={seq.cursorRow}
              cursorChannel={seq.cursorChannel}
              playingRow={seq.isPlaying && seq.playingPatternIndex === seq.selectedPatternIndex ? seq.playingRow : null}
              onSetCursor={(channel, row) => {
                seq.setCursorChannel(channel);
                seq.setCursorRow(row);
              }}
              onClearCell={seq.clearCell}
              onSetCell={seq.setCell}
            />
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
          href: '/music_examples.html',
          description:
            'the Music example plays an exported song with the small player included in the export.',
        }}
      />

      <ManageInstrumentsModal
        isOpen={showInstrumentManager}
        onClose={() => setShowInstrumentManager(false)}
        instruments={seq.instruments}
        editingInstrumentIndex={seq.editingInstrumentIndex}
        onSetEditingIndex={seq.setEditingInstrumentIndex}
        onAddInstrument={seq.addInstrument}
        onRemoveInstrument={seq.removeInstrument}
        canRemoveInstrument={seq.canRemoveInstrument}
        onUpdate={seq.updateInstrument}
        onSetWaveSample={seq.setWaveSample}
        onWaveStrokeStart={seq.pushHistory}
        onPreview={seq.previewInstrument}
      />

      <MusicInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </>
  );
}
