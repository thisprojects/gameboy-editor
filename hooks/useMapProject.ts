import { useRef, useCallback } from 'react';
import { MapProject, Tile } from '@/types/map';
import { MAP_SIZE, ExportArea } from '@/constants/map';
import { cropMap, encodeTiles, isValidTileset, mapBytes, maxUsedIndex } from '@/utils/map';
import { readTilesetFile } from '@/utils/tilesetImport';
import { exportMapC, exportMapRGBDS } from '@/utils/mapExport';
import { downloadBlob } from '@/utils/download';

interface UseMapProjectProps {
  map: number[][];
  tiles: Tile[];
  scx: number;
  scy: number;
  exportArea: ExportArea;
  fileName: string;
  setFileName: (name: string) => void;
  loadProjectData: (data: { map: number[][]; tiles: Tile[] }) => void;
  setTileset: (tiles: Tile[]) => void;
}

function isValidProject(data: unknown): data is MapProject {
  const p = data as Partial<MapProject> | null;
  if (!p || p.type !== 'map' || !isValidTileset(p.tiles)) return false;
  const tiles = p.tiles;
  return (
    Array.isArray(p.map) &&
    p.map.length === MAP_SIZE &&
    p.map.every(
      (row) =>
        Array.isArray(row) && row.length === MAP_SIZE && row.every((t) => Number.isInteger(t) && t >= 0 && t < tiles.length)
    )
  );
}

export function useMapProject({
  map,
  tiles,
  scx,
  scy,
  exportArea,
  fileName,
  setFileName,
  loadProjectData,
  setTileset,
}: UseMapProjectProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);
  const tilesetInputRef = useRef<HTMLInputElement>(null);

  const saveProject = useCallback(() => {
    const project: MapProject = { version: 1, type: 'map', map, tiles };
    downloadBlob(JSON.stringify(project), `${fileName}_map.json`, 'application/json');
  }, [map, tiles, fileName]);

  /** Cropped map plus the tiles it needs (up to the highest index used). */
  const prepare = useCallback(() => {
    const cropped = cropMap(map, exportArea, scx, scy);
    const used = tiles.slice(0, maxUsedIndex(cropped) + 1);
    return { map: cropped, tileData: encodeTiles(used) };
  }, [map, tiles, exportArea, scx, scy]);

  const exportASM = useCallback(() => {
    downloadBlob(exportMapRGBDS(fileName, prepare()), `${fileName}.asm`, 'text/plain');
  }, [prepare, fileName]);

  const exportC = useCallback(() => {
    downloadBlob(exportMapC(fileName, prepare()), `${fileName}.h`, 'text/plain');
  }, [prepare, fileName]);

  const exportTilemap = useCallback(() => {
    downloadBlob(mapBytes(prepare().map) as BlobPart, `${fileName}.tilemap`, 'application/octet-stream');
  }, [prepare, fileName]);

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
          const data = JSON.parse(ev.target?.result as string);
          if (!isValidProject(data)) {
            alert('Invalid file: not a Game Boy map project.');
            return;
          }
          loadProjectData({ map: data.map, tiles: data.tiles });
          setFileName(file.name.replace(/_map\.json$|\.json$/, ''));
        } catch {
          alert('Failed to load project: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadProjectData, setFileName]
  );

  /** Import a tileset from a tile editor project (.json) or raw .2bpp data. */
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
    exportTilemap,
    export2bpp,
    loadProject,
    importTileset,
    triggerLoadDialog,
    triggerTilesetDialog,
  };
}
