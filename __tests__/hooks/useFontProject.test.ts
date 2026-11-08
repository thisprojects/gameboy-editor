import { renderHook, act } from '@testing-library/react';
import { useFontProject } from '@/hooks/useFontProject';
import { downloadBlob } from '@/utils/download';
import { starterGlyphs, encodeGlyphs } from '@/utils/font';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

function setup() {
  const loadFontData = jest.fn();
  const setFileName = jest.fn();
  const hook = renderHook(() => useFontProject({ glyphs: starterGlyphs(), fileName: 'ui', setFileName, loadFontData }));
  return { ...hook, loadFontData, setFileName };
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

describe('useFontProject', () => {
  const dl = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('saves JSON', () => {
    const { result } = setup();
    act(() => result.current.saveProject());
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('"type":"font"'), 'ui_font.json', 'application/json');
  });

  it('exports asm, c, 2bpp and 1bpp', () => {
    const { result } = setup();
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.export2bpp(); result.current.export1bpp(); });
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('ui_font::'), 'ui.asm', 'text/plain');
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('ui_font[]'), 'ui.h', 'text/plain');
    expect((dl.mock.calls.find((c) => c[1] === 'ui.2bpp')![0] as Uint8Array).length).toBe(1536);
    expect((dl.mock.calls.find((c) => c[1] === 'ui.1bpp')![0] as Uint8Array).length).toBe(768);
  });

  it('loads a valid project', () => {
    mockReader(JSON.stringify({ version: 1, type: 'font', glyphs: starterGlyphs() }));
    const { result, loadFontData, setFileName } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'big_font.json'))));
    expect(loadFontData).toHaveBeenCalled();
    expect(setFileName).toHaveBeenCalledWith('big');
  });

  it.each([
    ['null', null],
    ['wrong type', { type: 'map', glyphs: starterGlyphs() }],
    ['wrong glyph count', { type: 'font', glyphs: starterGlyphs().slice(0, 5) }],
  ])('rejects invalid project (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, loadFontData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadFontData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects invalid JSON and ignores an empty selection', () => {
    mockReader('{oops');
    const { result, loadFontData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    act(() => {
      result.current.loadProject({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
      result.current.import2bpp({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(loadFontData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledTimes(1);
  });

  it('imports a 2bpp font', () => {
    mockReader(encodeGlyphs(starterGlyphs()).buffer as ArrayBuffer);
    const { result, loadFontData, setFileName } = setup();
    act(() => result.current.import2bpp(changeEvent(new File(['x'], 'gb.2BPP'))));
    expect(loadFontData).toHaveBeenCalledWith(expect.any(Array));
    expect(setFileName).toHaveBeenCalledWith('gb');
  });

  it('rejects a bad 2bpp font', () => {
    mockReader(new Uint8Array(7).buffer);
    const { result, loadFontData } = setup();
    act(() => result.current.import2bpp(changeEvent(new File(['x'], 'bad.2bpp'))));
    expect(loadFontData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
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
