import { useRef, useCallback } from 'react';
import { TilesetProject } from '@/types';
import { TILE_SIZE, MAX_TILES, MAX_TILES_WIDTH } from '@/constants';
import { countUsedTiles, decodeTileset, encodeTileset } from '@/utils/encode';
import { exportTilesC, exportTilesRGBDS } from '@/utils/export';
import { downloadBlob } from '@/utils/download';
import { isShade } from '@/utils/validate';

interface UseTileProjectProps {
  pixels: number[][];
  tilesWidth: number;
  tilesHeight: number;
  fileName: string;
  setFileName: (name: string) => void;
  loadProjectData: (width: number, height: number, pixels: number[][]) => void;
}

function isValidProject(data: unknown): data is TilesetProject {
  const p = data as Partial<TilesetProject> | null;
  if (!p || p.type !== 'tileset') return false;
  if (!Number.isInteger(p.tilesWidth) || !Number.isInteger(p.tilesHeight) || !Array.isArray(p.pixels)) return false;
  const w = p.tilesWidth as number;
  const h = p.tilesHeight as number;
  if (w < 1 || h < 1 || w > MAX_TILES_WIDTH || w * h > MAX_TILES) return false;
  return (
    p.pixels.length === h * TILE_SIZE &&
    p.pixels.every((row) => Array.isArray(row) && row.length === w * TILE_SIZE && row.every(isShade))
  );
}

export function useTileProject({
  pixels,
  tilesWidth,
  tilesHeight,
  fileName,
  setFileName,
  loadProjectData,
}: UseTileProjectProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const saveProject = useCallback(() => {
    const project: TilesetProject = { version: 1, type: 'tileset', tilesWidth, tilesHeight, pixels };
    downloadBlob(JSON.stringify(project), `${fileName}_tiles.json`, 'application/json');
  }, [tilesWidth, tilesHeight, pixels, fileName]);

  /** Encode used tiles, or alert and return null if nothing is drawn. */
  const getTileData = useCallback((): Uint8Array | null => {
    const count = countUsedTiles(pixels, tilesWidth, tilesHeight);
    if (count === 0) {
      alert('Nothing to export - draw something first!');
      return null;
    }
    return encodeTileset(pixels, tilesWidth, count);
  }, [pixels, tilesWidth, tilesHeight]);

  const exportASM = useCallback(() => {
    const data = getTileData();
    if (data) downloadBlob(exportTilesRGBDS(fileName, data), `${fileName}.asm`, 'text/plain');
  }, [getTileData, fileName]);

  const exportC = useCallback(() => {
    const data = getTileData();
    if (data) downloadBlob(exportTilesC(fileName, data), `${fileName}.h`, 'text/plain');
  }, [getTileData, fileName]);

  const export2bpp = useCallback(() => {
    const data = getTileData();
    if (data) downloadBlob(data as BlobPart, `${fileName}.2bpp`, 'application/octet-stream');
  }, [getTileData, fileName]);

  const loadProject = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!isValidProject(data)) {
            alert('Invalid file: not a Game Boy tileset project.');
            return;
          }
          loadProjectData(data.tilesWidth, data.tilesHeight, data.pixels);
          setFileName(file.name.replace(/_tiles\.json$|\.json$/, ''));
        } catch {
          alert('Failed to load project: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadProjectData, setFileName]
  );

  /** Import a raw .2bpp file as a tileset 16 tiles wide. */
  const import2bpp = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
        const decoded = decodeTileset(bytes, 16);
        if (!decoded || decoded.tilesWidth * decoded.tilesHeight > MAX_TILES) {
          alert('Invalid .2bpp file: size must be a multiple of 16 bytes and at most 384 tiles.');
          return;
        }
        loadProjectData(decoded.tilesWidth, decoded.tilesHeight, decoded.pixels);
        setFileName(file.name.replace(/\.2bpp$/, ''));
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    },
    [loadProjectData, setFileName]
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
    loadProject,
    import2bpp,
    triggerLoadDialog,
    triggerImportDialog,
  };
}
