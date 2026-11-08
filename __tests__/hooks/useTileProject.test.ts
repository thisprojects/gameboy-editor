import { renderHook, act } from '@testing-library/react';
import { useTileProject } from '@/hooks/useTileProject';
import { createEmptyPixels } from '@/utils/drawing';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

function setup(pixels = createEmptyPixels(16, 8)) {
  const loadProjectData = jest.fn();
  const setFileName = jest.fn();
  const hook = renderHook(() =>
    useTileProject({ pixels, tilesWidth: 2, tilesHeight: 1, fileName: 'hero', setFileName, loadProjectData })
  );
  return { ...hook, loadProjectData, setFileName };
}

function changeEvent(file: File): React.ChangeEvent<HTMLInputElement> {
  return { target: { files: [file], value: 'x' } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

/** Make FileReader resolve synchronously with the given result. */
function mockReader(result: string | ArrayBuffer) {
  jest.spyOn(global as unknown as Record<string, jest.Mock>, 'FileReader').mockImplementation(function (this: FileReader) {
    const self = this as unknown as { onload: (e: unknown) => void };
    (this as unknown as Record<string, unknown>).readAsText = () => self.onload({ target: { result } });
    (this as unknown as Record<string, unknown>).readAsArrayBuffer = () => self.onload({ target: { result } });
    return this;
  });
}

describe('useTileProject', () => {
  const dl = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks()); // restores FileReader spy

  it('saves project JSON', () => {
    const { result } = setup();
    act(() => result.current.saveProject());
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('"type":"tileset"'), 'hero_tiles.json', 'application/json');
  });

  it('refuses to export an empty tileset', () => {
    const { result } = setup();
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.export2bpp(); });
    expect(global.alert).toHaveBeenCalledTimes(3);
    expect(dl).not.toHaveBeenCalled();
  });

  it('exports asm, c and 2bpp when there is content', () => {
    const px = createEmptyPixels(16, 8);
    px[0][0] = 3;
    const { result } = setup(px);
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.export2bpp(); });
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('hero_tiles::'), 'hero.asm', 'text/plain');
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('hero_tiles[]'), 'hero.h', 'text/plain');
    const call = dl.mock.calls.find((c) => c[1] === 'hero.2bpp')!;
    expect((call[0] as Uint8Array).length).toBe(16);
  });

  it('loads a valid project', () => {
    const project = { version: 1, type: 'tileset', tilesWidth: 1, tilesHeight: 1, pixels: createEmptyPixels(8, 8) };
    mockReader(JSON.stringify(project));
    const { result, loadProjectData, setFileName } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'boss_tiles.json'))));
    expect(loadProjectData).toHaveBeenCalledWith(1, 1, project.pixels);
    expect(setFileName).toHaveBeenCalledWith('boss');
  });

  it.each([
    ['wrong type', { type: 'scene' }],
    ['bad shade', { type: 'tileset', tilesWidth: 1, tilesHeight: 1, pixels: Array.from({ length: 8 }, () => Array(8).fill(9)) }],
    ['null shade', { type: 'tileset', tilesWidth: 1, tilesHeight: 1, pixels: Array.from({ length: 8 }, () => Array(8).fill(null)) }],
    ['fractional shade', { type: 'tileset', tilesWidth: 1, tilesHeight: 1, pixels: Array.from({ length: 8 }, () => Array(8).fill(1.5)) }],
    ['text shade', { type: 'tileset', tilesWidth: 1, tilesHeight: 1, pixels: Array.from({ length: 8 }, () => Array(8).fill('2')) }],
    ['bad dimensions', { type: 'tileset', tilesWidth: 1, tilesHeight: 1, pixels: [[0]] }],
    ['too wide', { type: 'tileset', tilesWidth: 99, tilesHeight: 1, pixels: [] }],
    ['null', null],
  ])('rejects invalid project (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects invalid JSON', () => {
    mockReader('{not json');
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('ignores a load with no file', () => {
    const { result, loadProjectData } = setup();
    act(() => {
      result.current.loadProject({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
      result.current.import2bpp({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(loadProjectData).not.toHaveBeenCalled();
  });

  it('imports a .2bpp file', () => {
    mockReader(new Uint8Array(32).buffer);
    const { result, loadProjectData, setFileName } = setup();
    act(() => result.current.import2bpp(changeEvent(new File(['x'], 'font.2bpp'))));
    expect(loadProjectData).toHaveBeenCalledWith(2, 1, expect.any(Array));
    expect(setFileName).toHaveBeenCalledWith('font');
  });

  it('rejects bad .2bpp files', () => {
    mockReader(new Uint8Array(10).buffer);
    const { result, loadProjectData } = setup();
    act(() => result.current.import2bpp(changeEvent(new File(['x'], 'bad.2bpp'))));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects .2bpp files over 384 tiles', () => {
    mockReader(new Uint8Array(16 * 400).buffer);
    const { result, loadProjectData } = setup();
    act(() => result.current.import2bpp(changeEvent(new File(['x'], 'big.2bpp'))));
    expect(loadProjectData).not.toHaveBeenCalled();
  });

  it('trigger functions click the hidden inputs', () => {
    const { result } = setup();
    const click = jest.fn();
    (result.current.projectInputRef as { current: unknown }).current = { click };
    (result.current.importInputRef as { current: unknown }).current = { click };
    act(() => { result.current.triggerLoadDialog(); result.current.triggerImportDialog(); });
    expect(click).toHaveBeenCalledTimes(2);
  });
});
