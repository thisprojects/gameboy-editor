import { useRef, useCallback } from 'react';
import { Metatile, MetatileProject } from '@/types/metatile';
import { Tile } from '@/types/map';
import { encodeTiles } from '@/utils/map';
import { dimsFields, isValidLibrary, maxTileIndex, readDims } from '@/utils/metatile';
import { exportMetatilesC, exportMetatilesRGBDS } from '@/utils/levelExport';
import { readTilesetFile } from '@/utils/tilesetImport';
import { downloadBlob } from '@/utils/download';

interface UseMetatileProjectProps {
  mw: number;
  mh: number;
  tiles: Tile[];
  metatiles: Metatile[];
  fileName: string;
  setFileName: (name: string) => void;
  loadProjectData: (data: { mw: number; mh: number; tiles: Tile[]; metatiles: Metatile[] }) => void;
  setTileset: (tiles: Tile[]) => void;
}

export function useMetatileProject({
  mw,
  mh,
  tiles,
  metatiles,
  fileName,
  setFileName,
  loadProjectData,
  setTileset,
}: UseMetatileProjectProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);
  const tilesetInputRef = useRef<HTMLInputElement>(null);

  const saveProject = useCallback(() => {
    const project: MetatileProject = { version: 1, type: 'metatiles', ...dimsFields({ mw, mh }), tiles, metatiles };
    downloadBlob(JSON.stringify(project), `${fileName}_metatiles.json`, 'application/json');
  }, [mw, mh, tiles, metatiles, fileName]);

  /** Tiles up to the highest index any metatile uses. */
  const exportInput = useCallback(
    () => ({ mw, mh, metatiles, tileData: encodeTiles(tiles.slice(0, maxTileIndex(metatiles) + 1)) }),
    [mw, mh, metatiles, tiles]
  );

  const exportASM = useCallback(() => {
    downloadBlob(exportMetatilesRGBDS(fileName, exportInput()), `${fileName}.asm`, 'text/plain');
  }, [exportInput, fileName]);

  const exportC = useCallback(() => {
    downloadBlob(exportMetatilesC(fileName, exportInput()), `${fileName}.h`, 'text/plain');
  }, [exportInput, fileName]);

  const export2bpp = useCallback(() => {
    downloadBlob(encodeTiles(tiles) as BlobPart, `${fileName}.2bpp`, 'application/octet-stream');
  }, [tiles, fileName]);

  const loadProject = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target?.result as string);
          const dims = readDims(d);
          if (d?.type !== 'metatiles' || !dims || !isValidLibrary(dims, d.tiles, d.metatiles)) {
            alert('Invalid file: not a Game Boy metatile project.');
            return;
          }
          loadProjectData({ ...dims, tiles: d.tiles, metatiles: d.metatiles });
          setFileName(file.name.replace(/_metatiles\.json$|\.json$/, ''));
        } catch {
          alert('Failed to load project: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadProjectData, setFileName]
  );

  const importTileset = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      readTilesetFile(file, setTileset);
    },
    [setTileset]
  );

  const triggerLoadDialog = useCallback(() => projectInputRef.current?.click(), []);
  const triggerTilesetDialog = useCallback(() => tilesetInputRef.current?.click(), []);

  return {
    projectInputRef,
    tilesetInputRef,
    saveProject,
    exportASM,
    exportC,
    export2bpp,
    loadProject,
    importTileset,
    triggerLoadDialog,
    triggerTilesetDialog,
  };
}
