import { useRef, useCallback } from 'react';
import { LevelProject, Metatile } from '@/types/metatile';
import { Tile } from '@/types/map';
import { encodeTiles } from '@/utils/map';
import { expandMap, isValidLevelMap, isValidLibrary, maxTileIndex } from '@/utils/metatile';
import { exportLevelC, exportLevelRGBDS } from '@/utils/levelExport';
import { downloadBlob } from '@/utils/download';

interface Library {
  size: number;
  tiles: Tile[];
  metatiles: Metatile[];
}

interface UseLevelProjectProps {
  map: number[][];
  size: number;
  tiles: Tile[];
  metatiles: Metatile[];
  fileName: string;
  setFileName: (name: string) => void;
  loadProjectData: (data: { map: number[][]; library: Library }) => void;
  setLibrary: (lib: Library) => void;
}

export function useLevelProject({
  map,
  size,
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
    const project: LevelProject = { version: 1, type: 'level', size, tiles, metatiles, map };
    downloadBlob(JSON.stringify(project), `${fileName}_level.json`, 'application/json');
  }, [size, tiles, metatiles, map, fileName]);

  /** Tiles up to the highest index any metatile uses. */
  const exportInput = useCallback(
    () => ({ size, metatiles, map, tileData: encodeTiles(tiles.slice(0, maxTileIndex(metatiles) + 1)) }),
    [size, metatiles, map, tiles]
  );

  const exportASM = useCallback(() => {
    downloadBlob(exportLevelRGBDS(fileName, exportInput()), `${fileName}.asm`, 'text/plain');
  }, [exportInput, fileName]);

  const exportC = useCallback(() => {
    downloadBlob(exportLevelC(fileName, exportInput()), `${fileName}.h`, 'text/plain');
  }, [exportInput, fileName]);

  /** Raw tile index map with every metatile expanded (width*size x height*size bytes). */
  const exportTilemap = useCallback(() => {
    const expanded = expandMap(map, metatiles, size);
    downloadBlob(Uint8Array.from(expanded.flat()) as BlobPart, `${fileName}.tilemap`, 'application/octet-stream');
  }, [map, metatiles, size, fileName]);

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
          if (
            d?.type !== 'level' ||
            !isValidLibrary(d.size, d.tiles, d.metatiles) ||
            !isValidLevelMap(d.map, d.size, d.metatiles.length)
          ) {
            alert('Invalid file: not a Game Boy level project.');
            return;
          }
          loadProjectData({ map: d.map, library: { size: d.size, tiles: d.tiles, metatiles: d.metatiles } });
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
          if (d?.type !== 'metatiles' || !isValidLibrary(d.size, d.tiles, d.metatiles)) {
            alert('Invalid file: not a Game Boy metatile project.');
            return;
          }
          setLibrary({ size: d.size, tiles: d.tiles, metatiles: d.metatiles });
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
