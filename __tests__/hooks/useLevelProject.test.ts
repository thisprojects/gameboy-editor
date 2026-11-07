import { renderHook, act } from '@testing-library/react';
import { useLevelProject } from '@/hooks/useLevelProject';
import { downloadBlob } from '@/utils/download';
import { createBlankTile, createSolidTile } from '@/utils/map';
import { createMetatile } from '@/utils/metatile';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

const tiles = [createBlankTile(), createSolidTile(3), createSolidTile(2)];
const metatiles = [createMetatile(2, 2, 0), createMetatile(2, 2, 1, true)];
const map = [[0, 1, 1], [1, 0, 0]];

function setup() {
  const loadProjectData = jest.fn();
  const setFileName = jest.fn();
  const setLibrary = jest.fn();
  const hook = renderHook(() =>
    useLevelProject({ map, mw: 2, mh: 2, tiles, metatiles, fileName: 'lvl', setFileName, loadProjectData, setLibrary })
  );
  return { ...hook, loadProjectData, setFileName, setLibrary };
}

const changeEvent = (file: File) => ({ target: { files: [file], value: 'x' } }) as unknown as React.ChangeEvent<HTMLInputElement>;

function mockReader(result: string) {
  jest.spyOn(global, 'FileReader').mockImplementation(function (this: FileReader) {
    const self = this as unknown as { onload: (e: unknown) => void };
    (this as unknown as Record<string, unknown>).readAsText = () => self.onload({ target: { result } });
    return this;
  } as unknown as typeof FileReader);
}

const level = () => ({ version: 1, type: 'level', size: 2, tiles, metatiles, map });
const library = () => ({ version: 1, type: 'metatiles', size: 2, tiles, metatiles });

describe('useLevelProject', () => {
  const dl = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('saves JSON', () => {
    const { result } = setup();
    act(() => result.current.saveProject());
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('"type":"level"'), 'lvl_level.json', 'application/json');
  });

  it('exports asm, c, expanded tilemap and tiles', () => {
    const { result } = setup();
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.exportTilemap(); result.current.export2bpp(); });
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('lvl_map::'), 'lvl.asm', 'text/plain');
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('lvl_map[]'), 'lvl.h', 'text/plain');
    const tm = dl.mock.calls.find((c) => c[1] === 'lvl.tilemap')![0] as Uint8Array;
    expect(tm).toHaveLength(6 * 4); // 3x2 metatiles of 2x2 tiles
    expect(Array.from(tm.slice(0, 6))).toEqual([0, 0, 1, 1, 1, 1]);
    expect((dl.mock.calls.find((c) => c[1] === 'lvl.2bpp')![0] as Uint8Array).length).toBe(48);
  });

  it('loads a valid level project', () => {
    mockReader(JSON.stringify(level()));
    const { result, loadProjectData, setFileName } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'boss_level.json'))));
    expect(loadProjectData).toHaveBeenCalledWith({ map, library: { mw: 2, mh: 2, tiles, metatiles } });
    expect(setFileName).toHaveBeenCalledWith('boss');
  });

  it.each([
    ['null', null],
    ['wrong type', { ...level(), type: 'map' }],
    ['bad library', { ...level(), size: 3 }],
    ['bad map', { ...level(), map: [[0, 9]] }],
  ])('rejects an invalid level project (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('imports a metatile library', () => {
    mockReader(JSON.stringify(library()));
    const { result, setLibrary } = setup();
    act(() => result.current.importLibrary(changeEvent(new File(['x'], 'set_metatiles.json'))));
    expect(setLibrary).toHaveBeenCalledWith({ mw: 2, mh: 2, tiles, metatiles });
  });

  it.each([
    ['null', null],
    ['wrong type', { ...library(), type: 'level' }],
    ['bad library', { ...library(), metatiles: [] }],
  ])('rejects an invalid library (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, setLibrary } = setup();
    act(() => result.current.importLibrary(changeEvent(new File(['x'], 'a.json'))));
    expect(setLibrary).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects invalid JSON and ignores empty selections', () => {
    mockReader('{oops');
    const { result, loadProjectData, setLibrary } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    act(() => result.current.importLibrary(changeEvent(new File(['x'], 'a.json'))));
    act(() => {
      result.current.loadProject({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
      result.current.importLibrary({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(setLibrary).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledTimes(2);
  });

  it('trigger functions click the hidden inputs', () => {
    const { result } = setup();
    const click = jest.fn();
    (result.current.projectInputRef as { current: unknown }).current = { click };
    (result.current.libraryInputRef as { current: unknown }).current = { click };
    act(() => { result.current.triggerLoadDialog(); result.current.triggerLibraryDialog(); });
    expect(click).toHaveBeenCalledTimes(2);
  });
});
