import { useRef, useCallback } from 'react';
import { FontProject } from '@/types/font';
import { Tile } from '@/types/map';
import { decodeGlyphs, encodeGlyphs, encodeGlyphs1bpp, isValidGlyphs } from '@/utils/font';
import { exportFontC, exportFontRGBDS } from '@/utils/fontExport';
import { downloadBlob } from '@/utils/download';

interface UseFontProjectProps {
  glyphs: Tile[];
  fileName: string;
  setFileName: (name: string) => void;
  loadFontData: (glyphs: Tile[]) => void;
}

export function useFontProject({ glyphs, fileName, setFileName, loadFontData }: UseFontProjectProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const saveProject = useCallback(() => {
    const project: FontProject = { version: 1, type: 'font', glyphs };
    downloadBlob(JSON.stringify(project), `${fileName}_font.json`, 'application/json');
  }, [glyphs, fileName]);

  const exportASM = useCallback(() => {
    downloadBlob(exportFontRGBDS(fileName, encodeGlyphs(glyphs)), `${fileName}.asm`, 'text/plain');
  }, [glyphs, fileName]);

  const exportC = useCallback(() => {
    downloadBlob(exportFontC(fileName, encodeGlyphs(glyphs)), `${fileName}.h`, 'text/plain');
  }, [glyphs, fileName]);

  const export2bpp = useCallback(() => {
    downloadBlob(encodeGlyphs(glyphs) as BlobPart, `${fileName}.2bpp`, 'application/octet-stream');
  }, [glyphs, fileName]);

  const export1bpp = useCallback(() => {
    downloadBlob(encodeGlyphs1bpp(glyphs) as BlobPart, `${fileName}.1bpp`, 'application/octet-stream');
  }, [glyphs, fileName]);

  const loadProject = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data?.type !== 'font' || !isValidGlyphs(data.glyphs)) {
            alert('Invalid file: not a Game Boy font project.');
            return;
          }
          loadFontData(data.glyphs);
          setFileName(file.name.replace(/_font\.json$|\.json$/, ''));
        } catch {
          alert('Failed to load project: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadFontData, setFileName]
  );

  /** Import raw 2bpp glyphs (1-96 tiles, in ASCII order starting at space). */
  const import2bpp = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const decoded = decodeGlyphs(new Uint8Array(ev.target?.result as ArrayBuffer));
        if (!decoded) {
          alert('Invalid .2bpp file: size must be a multiple of 16 bytes and at most 96 glyphs (1536 bytes).');
          return;
        }
        loadFontData(decoded);
        setFileName(file.name.replace(/\.2bpp$/i, ''));
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    },
    [loadFontData, setFileName]
  );

  const triggerLoadDialog = useCallback(() => projectInputRef.current?.click(), []);
  const triggerImportDialog = useCallback(() => importInputRef.current?.click(), []);

  return {
    projectInputRef,
    importInputRef,
    saveProject,
    exportASM,
    exportC,
    export2bpp,
    export1bpp,
    loadProject,
    import2bpp,
    triggerLoadDialog,
    triggerImportDialog,
  };
}
