import { useRef, useCallback } from 'react';
import { MusicInstrument, MusicPattern, MusicProjectData } from '@/types/music';
import { isValidSong } from '@/utils/gbMusic';
import { exportMusicC, exportMusicRGBDS } from '@/utils/musicExport';
import { downloadBlob } from '@/utils/download';

interface SongData {
  patterns: MusicPattern[];
  instruments: MusicInstrument[];
  orderList: number[];
  ticksPerRow: number;
}

interface UseMusicProjectProps extends SongData {
  fileName: string;
  setFileName: (name: string) => void;
  loadMusicData: (data: SongData) => void;
}

export function useMusicProject({
  patterns,
  instruments,
  orderList,
  ticksPerRow,
  fileName,
  setFileName,
  loadMusicData,
}: UseMusicProjectProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);

  const saveProject = useCallback(() => {
    const project: MusicProjectData = { version: 1, type: 'music', patterns, instruments, orderList, ticksPerRow };
    downloadBlob(JSON.stringify(project), `${fileName}_music.json`, 'application/json');
  }, [patterns, instruments, orderList, ticksPerRow, fileName]);

  const exportAsm = useCallback(() => {
    downloadBlob(exportMusicRGBDS(fileName, { patterns, instruments, orderList, ticksPerRow }), `${fileName}.asm`, 'text/plain');
  }, [patterns, instruments, orderList, ticksPerRow, fileName]);

  const exportC = useCallback(() => {
    downloadBlob(exportMusicC(fileName, { patterns, instruments, orderList, ticksPerRow }), `${fileName}.h`, 'text/plain');
  }, [patterns, instruments, orderList, ticksPerRow, fileName]);

  const loadProject = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!isValidSong(data)) {
            alert('Invalid file: not a Game Boy music project.');
            return;
          }
          loadMusicData({
            patterns: data.patterns,
            instruments: data.instruments,
            orderList: data.orderList,
            ticksPerRow: data.ticksPerRow,
          });
          setFileName(file.name.replace(/_music\.json$|\.json$/, ''));
        } catch {
          alert('Failed to load project: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadMusicData, setFileName]
  );

  const triggerLoadDialog = useCallback(() => projectInputRef.current?.click(), []);

  return { projectInputRef, saveProject, exportAsm, exportC, loadProject, triggerLoadDialog };
}
