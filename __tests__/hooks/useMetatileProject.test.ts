import { renderHook, act } from '@testing-library/react';
import { useMetatileProject } from '@/hooks/useMetatileProject';
import { downloadBlob } from '@/utils/download';
import { createBlankTile, createSolidTile } from '@/utils/map';
import { createMetatile } from '@/utils/metatile';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

const tiles = [createBlankTile(), createSolidTile(3), createSolidTile(2)];
const metatiles = [createMetatile(2, 2, 0), createMetatile(2, 2, 1, true)];

function setup() {
  const loadProjectData = jest.fn();
  const setFileName = jest.fn();
  const setTileset = jest.fn();
  const hook = renderHook(() =>
    useMetatileProject({ mw: 2, mh: 2, tiles, metatiles, fileName: 'set', setFileName, loadProjectData, setTileset })
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

const project = () => ({ version: 1, type: 'metatiles', size: 2, tiles, metatiles });

describe('useMetatileProject', () => {
  const dl = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('saves JSON', () => {
    const { result } = setup();
    act(() => result.current.saveProject());
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('"type":"metatiles"'), 'set_metatiles.json', 'application/json');
  });

  it('exports only the tiles the metatiles use, plus the full 2bpp', () => {
    const { result } = setup();
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.export2bpp(); });
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('SET_TILE_COUNT EQU 2'), 'set.asm', 'text/plain'); // max index 1 -> 2 tiles
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('set_metatiles[]'), 'set.h', 'text/plain');
    expect((dl.mock.calls.find((c) => c[1] === 'set.2bpp')![0] as Uint8Array).length).toBe(48);
  });

  it('loads a valid project', () => {
    mockReader(JSON.stringify(project()));
    const { result, loadProjectData, setFileName } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'cave_metatiles.json'))));
    expect(loadProjectData).toHaveBeenCalledWith(expect.objectContaining({ mw: 2, mh: 2 }));
    expect(setFileName).toHaveBeenCalledWith('cave');
  });

  it.each([
    ['null', null],
    ['wrong type', { ...project(), type: 'level' }],
    ['bad library', { ...project(), size: 3 }],
  ])('rejects an invalid project (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects invalid JSON and ignores empty selections', () => {
    mockReader('{oops');
    const { result, loadProjectData, setTileset } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    act(() => {
      result.current.loadProject({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
      result.current.importTileset({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(setTileset).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledTimes(1);
  });

  it('imports a tileset through the shared reader', () => {
    const bytes = new Uint8Array(32);
    bytes[16] = 0xff;
    mockReader(bytes.buffer);
    const { result, setTileset } = setup();
    act(() => result.current.importTileset(changeEvent(new File(['x'], 'tiles.2bpp'))));
    expect(setTileset.mock.calls[0][0]).toHaveLength(2);
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
