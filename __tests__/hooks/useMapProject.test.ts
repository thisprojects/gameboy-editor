import { renderHook, act } from '@testing-library/react';
import { useMapProject } from '@/hooks/useMapProject';
import { downloadBlob } from '@/utils/download';
import { createEmptyMap, createBlankTile, createSolidTile } from '@/utils/map';
import { ExportArea } from '@/constants/map';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

function setup(exportArea: ExportArea = 'full', map = createEmptyMap()) {
  const loadProjectData = jest.fn();
  const setFileName = jest.fn();
  const setTileset = jest.fn();
  const tiles = [createBlankTile(), createSolidTile(3)];
  const hook = renderHook(() =>
    useMapProject({ map, tiles, scx: 0, scy: 0, exportArea, fileName: 'lvl', setFileName, loadProjectData, setTileset })
  );
  return { ...hook, loadProjectData, setFileName, setTileset };
}

const changeEvent = (file: File) => ({ target: { files: [file], value: 'x' } }) as unknown as React.ChangeEvent<HTMLInputElement>;

function mockReader(result: string | ArrayBuffer) {
  jest.spyOn(global as unknown as Record<string, jest.Mock>, 'FileReader').mockImplementation(function (this: FileReader) {
    const self = this as unknown as { onload: (e: unknown) => void };
    (this as unknown as Record<string, unknown>).readAsText = () => self.onload({ target: { result } });
    (this as unknown as Record<string, unknown>).readAsArrayBuffer = () => self.onload({ target: { result } });
    return this;
  });
}

const validProject = () => ({ version: 1, type: 'map', map: createEmptyMap(), tiles: [createBlankTile(), createSolidTile(2)] });
const tilesetProject = (pixels: number[][], w = 1, h = 1) => ({ version: 1, type: 'tileset', tilesWidth: w, tilesHeight: h, pixels });
const blankPixels = (w: number, h: number) => Array.from({ length: h * 8 }, () => Array(w * 8).fill(0));

describe('useMapProject', () => {
  const dl = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('saves JSON', () => {
    const { result } = setup();
    act(() => result.current.saveProject());
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('"type":"map"'), 'lvl_map.json', 'application/json');
  });

  it('exports asm, c, tilemap and tiles', () => {
    const map = createEmptyMap();
    map[0][0] = 1;
    const { result } = setup('full', map);
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.exportTilemap(); result.current.export2bpp(); });
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('lvl_map::'), 'lvl.asm', 'text/plain');
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('lvl_map[]'), 'lvl.h', 'text/plain');
    const tm = dl.mock.calls.find((c) => c[1] === 'lvl.tilemap')!;
    expect((tm[0] as Uint8Array).length).toBe(1024);
    const bpp = dl.mock.calls.find((c) => c[1] === 'lvl.2bpp')!;
    expect((bpp[0] as Uint8Array).length).toBe(32);
  });

  it('crops the export area and only includes used tiles', () => {
    const { result } = setup('viewport');
    act(() => result.current.exportTilemap());
    expect((dl.mock.calls[0][0] as Uint8Array).length).toBe(20 * 18);
    dl.mockClear();
    act(() => result.current.exportASM());
    expect(dl.mock.calls[0][0]).toContain('LVL_TILE_COUNT EQU 1'); // only tile 0 referenced
  });

  it('loads a valid project', () => {
    mockReader(JSON.stringify(validProject()));
    const { result, loadProjectData, setFileName } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'cave_map.json'))));
    expect(loadProjectData).toHaveBeenCalledWith(expect.objectContaining({ tiles: expect.any(Array) }));
    expect(setFileName).toHaveBeenCalledWith('cave');
  });

  it.each([
    ['null', null],
    ['wrong type', { ...validProject(), type: 'sprite' }],
    ['bad tiles', { ...validProject(), tiles: [] }],
    ['wrong map size', { ...validProject(), map: [[0]] }],
    ['index out of range', (() => { const p = validProject(); p.map[0][0] = 9; return p; })()],
    ['short row', (() => { const p = validProject(); p.map[3] = [0]; return p; })()],
  ])('rejects invalid project (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects invalid JSON and ignores an empty selection', () => {
    mockReader('{oops');
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    act(() => result.current.loadProject({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>));
    act(() => result.current.importTileset({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledTimes(1);
  });

  describe('importTileset', () => {
    it('imports a tile editor project, trimming trailing blank tiles', () => {
      const px = blankPixels(2, 1);
      px[0][8] = 3; // second tile non-empty
      mockReader(JSON.stringify(tilesetProject(px, 2, 1)));
      const { result, setTileset } = setup();
      act(() => result.current.importTileset(changeEvent(new File(['x'], 'tiles.json'))));
      expect(setTileset).toHaveBeenCalledWith(expect.arrayContaining([]));
      expect(setTileset.mock.calls[0][0]).toHaveLength(2);
    });

    it('trims a mostly blank tileset', () => {
      mockReader(JSON.stringify(tilesetProject(blankPixels(4, 1), 4, 1)));
      const { result, setTileset } = setup();
      act(() => result.current.importTileset(changeEvent(new File(['x'], 'tiles.json'))));
      expect(setTileset.mock.calls[0][0]).toHaveLength(1);
    });

    it('imports raw .2bpp', () => {
      const bytes = new Uint8Array(32);
      bytes[16] = 0xff;
      mockReader(bytes.buffer);
      const { result, setTileset } = setup();
      act(() => result.current.importTileset(changeEvent(new File(['x'], 'font.2BPP'))));
      expect(setTileset.mock.calls[0][0]).toHaveLength(2);
    });

    it('rejects a bad .2bpp', () => {
      mockReader(new Uint8Array(5).buffer);
      const { result, setTileset } = setup();
      act(() => result.current.importTileset(changeEvent(new File(['x'], 'bad.2bpp'))));
      expect(setTileset).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalled();
    });

    it('rejects a .2bpp with more than 256 tiles', () => {
      const bytes = new Uint8Array(16 * 300).fill(1);
      mockReader(bytes.buffer);
      const { result, setTileset } = setup();
      act(() => result.current.importTileset(changeEvent(new File(['x'], 'big.2bpp'))));
      expect(setTileset).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalled();
    });

    it.each([
      ['wrong type', { type: 'sprite' }],
      ['bad dimensions', { type: 'tileset', tilesWidth: 1, tilesHeight: 1, pixels: [[0]] }],
      ['bad shades', tilesetProject(blankPixels(1, 1).map((r) => r.map(() => 9)))],
    ])('rejects an invalid tileset json (%s)', (_n, data) => {
      mockReader(JSON.stringify(data));
      const { result, setTileset } = setup();
      act(() => result.current.importTileset(changeEvent(new File(['x'], 't.json'))));
      expect(setTileset).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalled();
    });

    it('rejects invalid tileset JSON text', () => {
      mockReader('nope');
      const { result, setTileset } = setup();
      act(() => result.current.importTileset(changeEvent(new File(['x'], 't.json'))));
      expect(setTileset).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalled();
    });
  });

  it('trigger functions click the hidden inputs', () => {
    const { result } = setup();
    const click = jest.fn();
    (result.current.projectInputRef as { current: unknown }).current = { click };
    (result.current.tilesetInputRef as { current: unknown }).current = { click };
    act(() => { result.current.triggerLoadDialog(); result.current.triggerTilesetDialog(); });
    expect(click).toHaveBeenCalledTimes(2);
  });
});
