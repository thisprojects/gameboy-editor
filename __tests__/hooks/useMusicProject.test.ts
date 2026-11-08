import { renderHook, act } from '@testing-library/react';
import { useMusicProject } from '@/hooks/useMusicProject';
import { downloadBlob } from '@/utils/download';
import { createPattern } from '@/utils/gbMusic';
import { PRESET_INSTRUMENTS } from '@/constants/musicPresets';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

const instruments = PRESET_INSTRUMENTS.map((p, i) => ({ id: `i${i}`, ...p }));
const patterns = [createPattern('p0', 'P0', 4)];
const song = { patterns, instruments, orderList: [0], ticksPerRow: 6 };

function setup() {
  const loadMusicData = jest.fn();
  const setFileName = jest.fn();
  const hook = renderHook(() => useMusicProject({ ...song, fileName: 'tune', setFileName, loadMusicData }));
  return { ...hook, loadMusicData, setFileName };
}

const changeEvent = (file: File) => ({ target: { files: [file], value: 'x' } }) as unknown as React.ChangeEvent<HTMLInputElement>;

function mockReader(result: string) {
  jest.spyOn(global as unknown as Record<string, jest.Mock>, 'FileReader').mockImplementation(function (this: FileReader) {
    const self = this as unknown as { onload: (e: unknown) => void };
    (this as unknown as Record<string, unknown>).readAsText = () => self.onload({ target: { result } });
    return this;
  });
}

describe('useMusicProject', () => {
  const dl = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('saves JSON', () => {
    const { result } = setup();
    act(() => result.current.saveProject());
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('"type":"music"'), 'tune_music.json', 'application/json');
  });

  it('exports RGBDS and C', () => {
    const { result } = setup();
    act(() => { result.current.exportAsm(); result.current.exportC(); });
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('tune_update::'), 'tune.asm', 'text/plain');
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('static void tune_update'), 'tune.h', 'text/plain');
  });

  it('round-trips a saved project', () => {
    const { result, loadMusicData, setFileName } = setup();
    act(() => result.current.saveProject());
    mockReader(dl.mock.calls[0][0] as string);
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'cave_music.json'))));
    expect(loadMusicData).toHaveBeenCalledWith({ patterns, instruments, orderList: [0], ticksPerRow: 6 });
    expect(setFileName).toHaveBeenCalledWith('cave');
  });

  it.each([
    ['null', null],
    ['wrong type', { ...song, type: 'font' }],
    ['bad order', { version: 1, type: 'music', ...song, orderList: [5] }],
  ])('rejects an invalid project (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, loadMusicData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadMusicData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects invalid JSON and ignores an empty selection', () => {
    mockReader('{oops');
    const { result, loadMusicData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    act(() => result.current.loadProject({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>));
    expect(loadMusicData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledTimes(1);
  });

  it('trigger clicks the hidden input', () => {
    const { result } = setup();
    const click = jest.fn();
    (result.current.projectInputRef as { current: unknown }).current = { click };
    act(() => result.current.triggerLoadDialog());
    expect(click).toHaveBeenCalled();
  });
});
