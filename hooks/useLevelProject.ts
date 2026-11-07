import { useRef, useCallback } from 'react';
import { LevelProject, Metatile } from '@/types/metatile';
import { Tile } from '@/types/map';
import { encodeTiles } from '@/utils/map';
import { dimsFields, expandMap, isValidLevelMap, isValidLibrary, maxTileIndex, readDims } from '@/utils/metatile';
import { exportLevelC, exportLevelRGBDS } from '@/utils/levelExport';
import { downloadBlob } from '@/utils/download';

interface Library {
  mw: number;
  mh: number;
  tiles: Tile[];
  metatiles: Metatile[];
}

interface UseLevelProjectProps {
  map: number[][];
  mw: number;
  mh: number;
  tiles: Tile[];
  metatiles: Metatile[];
  fileName: string;
  setFileName: (name: string) => void;
  loadProjectData: (data: { map: number[][]; library: Library }) => void;
  setLibrary: (lib: Library) => void;
}

export function useLevelProject({
  map,
  mw,
  mh,
  tiles,
  metatiles,
  fileName,
  setFileName,
  loadProjectData,
  setLibrary,
}: UseLevelProjectProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const saveProject = useCallback(() => {
    const project: LevelProject = { version: 1, type: 'level', ...dimsFields({ mw, mh }), tiles, metatiles, map };
    downloadBlob(JSON.stringify(project), `${fileName}_level.json`, 'application/json');
  }, [mw, mh, tiles, metatiles, map, fileName]);

  /** Tiles up to the highest index any metatile uses. */
  const exportInput = useCallback(
    () => ({ mw, mh, metatiles, map, tileData: encodeTiles(tiles.slice(0, maxTileIndex(metatiles) + 1)) }),
    [mw, mh, metatiles, map, tiles]
  );

  const exportASM = useCallback(() => {
    downloadBlob(exportLevelRGBDS(fileName, exportInput()), `${fileName}.asm`, 'text/plain');
  }, [exportInput, fileName]);

  const exportC = useCallback(() => {
    downloadBlob(exportLevelC(fileName, exportInput()), `${fileName}.h`, 'text/plain');
  }, [exportInput, fileName]);

  /** Raw tile index map with every metatile expanded (level width * metatile width x level height * metatile height bytes). */
  const exportTilemap = useCallback(() => {
    const expanded = expandMap(map, metatiles, mh);
    downloadBlob(Uint8Array.from(expanded.flat()) as BlobPart, `${fileName}.tilemap`, 'application/octet-stream');
  }, [map, metatiles, mh, fileName]);

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
          if (
            d?.type !== 'level' ||
            !dims ||
            !isValidLibrary(dims, d.tiles, d.metatiles) ||
            !isValidLevelMap(d.map, dims, d.metatiles.length)
          ) {
            alert('Invalid file: not a Game Boy level project.');
            return;
          }
          loadProjectData({ map: d.map, library: { ...dims, tiles: d.tiles, metatiles: d.metatiles } });
          setFileName(file.name.replace(/_level\.json$|\.json$/, ''));
        } catch {
          alert('Failed to load project: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadProjectData, setFileName]
  );

  /** Import a metatile library saved from the metatile editor. */
  const importLibrary = useCallback(
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
          setLibrary({ ...dims, tiles: d.tiles, metatiles: d.metatiles });
        } catch {
          alert('Failed to import library: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [setLibrary]
  );

  const triggerLoadDialog = useCallback(() => projectInputRef.current?.click(), []);
  const triggerLibraryDialog = useCallback(() => libraryInputRef.current?.click(), []);

  return {
    projectInputRef,
    libraryInputRef,
    saveProject,
    exportASM,
    exportC,
    exportTilemap,
    export2bpp,
    loadProject,
    importLibrary,
    triggerLoadDialog,
    triggerLibraryDialog,
  };
}
