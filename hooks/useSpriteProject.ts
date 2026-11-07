import { useRef, useCallback } from 'react';
import { SpriteFrame, SpriteProject } from '@/types/sprite';
import { TILE_SIZE } from '@/constants';
import { MAX_FRAMES, MAX_FRAME_TICKS, MAX_SPRITE_TILES_DIM, ObjSize } from '@/constants/sprite';
import { layoutSprite } from '@/utils/sprite';
import { exportSpriteC, exportSpriteRGBDS } from '@/utils/spriteExport';
import { downloadBlob } from '@/utils/download';
import { isIntIn, isShade } from '@/utils/validate';

/** A sprite's tile numbers are one byte each. */
export const MAX_SPRITE_EXPORT_TILES = 256;

interface LoadedSprite {
  tilesWidth: number;
  tilesHeight: number;
  frames: SpriteFrame[];
  objSize: ObjSize;
  palette: 0 | 1;
  priority: boolean;
}

interface UseSpriteProjectProps {
  frames: SpriteFrame[];
  tilesWidth: number;
  tilesHeight: number;
  objSize: ObjSize;
  palette: 0 | 1;
  priority: boolean;
  fileName: string;
  setFileName: (name: string) => void;
  loadProjectData: (data: LoadedSprite) => void;
}

function isValidProject(data: unknown): data is SpriteProject {
  const p = data as Partial<SpriteProject> | null;
  if (!p || p.type !== 'sprite') return false;
  const { tilesWidth: w, tilesHeight: h, frames } = p;
  if (!Number.isInteger(w) || !Number.isInteger(h) || !Array.isArray(frames)) return false;
  if (w! < 1 || h! < 1 || w! > MAX_SPRITE_TILES_DIM || h! > MAX_SPRITE_TILES_DIM) return false;
  if (p.objSize !== '8x8' && p.objSize !== '8x16') return false;
  if (p.objSize === '8x16' && h! % 2 !== 0) return false;
  if (p.palette !== 0 && p.palette !== 1) return false;
  if (typeof p.priority !== 'boolean') return false;
  if (frames.length < 1 || frames.length > MAX_FRAMES) return false;
  return frames.every(
    (f) =>
      isIntIn(f?.duration, 1, MAX_FRAME_TICKS) &&
      Array.isArray(f.pixels) &&
      f.pixels.length === h! * TILE_SIZE &&
      f.pixels.every((row) => Array.isArray(row) && row.length === w! * TILE_SIZE && row.every(isShade))
  );
}

export function useSpriteProject({
  frames,
  tilesWidth,
  tilesHeight,
  objSize,
  palette,
  priority,
  fileName,
  setFileName,
  loadProjectData,
}: UseSpriteProjectProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);

  const saveProject = useCallback(() => {
    const project: SpriteProject = { version: 1, type: 'sprite', tilesWidth, tilesHeight, objSize, palette, priority, frames };
    downloadBlob(JSON.stringify(project), `${fileName}_sprite.json`, 'application/json');
  }, [tilesWidth, tilesHeight, objSize, palette, priority, frames, fileName]);

  /** Lay the sprite out as hardware sprites, or alert and return null if nothing is drawn. */
  const getLayout = useCallback(() => {
    const layout = layoutSprite(frames, tilesWidth, tilesHeight, objSize);
    if (layout.tileCount === 0) {
      alert('Nothing to export - draw something first!');
      return null;
    }
    if (layout.tileCount > MAX_SPRITE_EXPORT_TILES) {
      alert(
        `This sprite needs ${layout.tileCount} tiles but the sprite table stores tile numbers in one byte (at most ${MAX_SPRITE_EXPORT_TILES}). ` +
          'Use fewer or smaller frames, or leave more tiles empty.'
      );
      return null;
    }
    return layout;
  }, [frames, tilesWidth, tilesHeight, objSize]);

  const exportInput = useCallback(
    (layout: NonNullable<ReturnType<typeof getLayout>>) => ({
      layout,
      durations: frames.map((f) => f.duration),
      palette,
      priority,
    }),
    [frames, palette, priority]
  );

  const exportASM = useCallback(() => {
    const layout = getLayout();
    if (layout) downloadBlob(exportSpriteRGBDS(fileName, exportInput(layout)), `${fileName}.asm`, 'text/plain');
  }, [getLayout, exportInput, fileName]);

  const exportC = useCallback(() => {
    const layout = getLayout();
    if (layout) downloadBlob(exportSpriteC(fileName, exportInput(layout)), `${fileName}.h`, 'text/plain');
  }, [getLayout, exportInput, fileName]);

  const export2bpp = useCallback(() => {
    const layout = getLayout();
    if (layout) downloadBlob(layout.data as BlobPart, `${fileName}.2bpp`, 'application/octet-stream');
  }, [getLayout, fileName]);

  const loadProject = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!isValidProject(data)) {
            alert('Invalid file: not a Game Boy sprite project.');
            return;
          }
          loadProjectData(data);
          setFileName(file.name.replace(/_sprite\.json$|\.json$/, ''));
        } catch {
          alert('Failed to load project: invalid JSON.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadProjectData, setFileName]
  );

  const triggerLoadDialog = useCallback(() => projectInputRef.current?.click(), []);

  return { projectInputRef, saveProject, exportASM, exportC, export2bpp, loadProject, triggerLoadDialog };
}
