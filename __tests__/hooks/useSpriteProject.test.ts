import { renderHook, act } from '@testing-library/react';
import { useSpriteProject } from '@/hooks/useSpriteProject';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

const blank = (w: number, h: number) => Array.from({ length: h }, () => Array(w).fill(0));
const frame = (draw = false) => {
  const pixels = blank(8, 8);
  if (draw) pixels[0][0] = 3;
  return { pixels, duration: 6 };
};

function setup(frames = [frame(true)]) {
  const loadProjectData = jest.fn();
  const setFileName = jest.fn();
  const hook = renderHook(() =>
    useSpriteProject({
      frames, tilesWidth: 1, tilesHeight: 1, objSize: '8x8', palette: 0, priority: false,
      fileName: 'hero', setFileName, loadProjectData,
    })
  );
  return { ...hook, loadProjectData, setFileName };
}

const changeEvent = (file: File) => ({ target: { files: [file], value: 'x' } }) as unknown as React.ChangeEvent<HTMLInputElement>;

function mockReader(result: string) {
  jest.spyOn(global, 'FileReader').mockImplementation(function (this: FileReader) {
    const self = this as unknown as { onload: (e: unknown) => void };
    (this as unknown as Record<string, unknown>).readAsText = () => self.onload({ target: { result } });
    return this;
  } as unknown as typeof FileReader);
}

const valid = {
  version: 1, type: 'sprite', tilesWidth: 1, tilesHeight: 2, objSize: '8x16', palette: 1, priority: true,
  frames: [{ pixels: blank(8, 16), duration: 4 }],
};

describe('useSpriteProject', () => {
  const dl = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('saves JSON', () => {
    const { result } = setup();
    act(() => result.current.saveProject());
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('"type":"sprite"'), 'hero_sprite.json', 'application/json');
  });

  it('refuses to export an empty sprite', () => {
    const { result } = setup([frame(false)]);
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.export2bpp(); });
    expect(global.alert).toHaveBeenCalledTimes(3);
    expect(dl).not.toHaveBeenCalled();
  });

  it('exports asm, c and 2bpp', () => {
    const { result } = setup();
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.export2bpp(); });
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('hero_frame0'), 'hero.asm', 'text/plain');
    expect(dl).toHaveBeenCalledWith(expect.stringContaining('hero_frames[]'), 'hero.h', 'text/plain');
    const call = dl.mock.calls.find((c) => c[1] === 'hero.2bpp')!;
    expect((call[0] as Uint8Array).length).toBe(16);
  });

  it('loads a valid project', () => {
    mockReader(JSON.stringify(valid));
    const { result, loadProjectData, setFileName } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'boss_sprite.json'))));
    expect(loadProjectData).toHaveBeenCalledWith(expect.objectContaining({ objSize: '8x16', palette: 1 }));
    expect(setFileName).toHaveBeenCalledWith('boss');
  });

  it.each([
    ['null', null],
    ['wrong type', { ...valid, type: 'tileset' }],
    ['non-integer size', { ...valid, tilesWidth: 1.5 }],
    ['too big', { ...valid, tilesWidth: 9 }],
    ['bad obj size', { ...valid, objSize: '16x16' }],
    ['odd height in 8x16', { ...valid, tilesHeight: 1, frames: [{ pixels: blank(8, 8), duration: 4 }] }],
    ['bad palette', { ...valid, palette: 2 }],
    ['bad priority', { ...valid, priority: 'yes' }],
    ['no frames', { ...valid, frames: [] }],
    ['too many frames', { ...valid, frames: Array(33).fill({ pixels: blank(8, 16), duration: 4 }) }],
    ['bad duration', { ...valid, frames: [{ pixels: blank(8, 16), duration: 0 }] }],
    ['bad dims', { ...valid, frames: [{ pixels: blank(8, 8), duration: 4 }] }],
    ['bad shade', { ...valid, frames: [{ pixels: blank(8, 16).map((r) => r.map(() => 7)), duration: 4 }] }],
  ])('rejects invalid project (%s)', (_n, data) => {
    mockReader(JSON.stringify(data));
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    expect(loadProjectData).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('rejects invalid JSON and ignores empty selections', () => {
    mockReader('{oops');
    const { result, loadProjectData } = setup();
    act(() => result.current.loadProject(changeEvent(new File(['x'], 'a.json'))));
    act(() => result.current.loadProject({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>));
    expect(loadProjectData).not.toHaveBeenCalled();
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

describe('useSpriteProject - limits and strict loading', () => {
  const dl2 = downloadBlob as jest.Mock;
  beforeEach(() => {
    dl2.mockClear();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  /** n frames of a fully drawn tilesW x tilesH sprite */
  const fullFrames = (n: number, w: number, h: number) =>
    Array.from({ length: n }, () => ({ pixels: Array.from({ length: h * 8 }, () => Array(w * 8).fill(3)), duration: 6 }));
  const setupWith = (frames: { pixels: number[][]; duration: number }[], w: number, h: number) =>
    renderHook(() =>
      useSpriteProject({ frames, tilesWidth: w, tilesHeight: h, objSize: '8x8', palette: 0, priority: false, fileName: 'big', setFileName: jest.fn(), loadProjectData: jest.fn() })
    );

  it('refuses to export a sprite that needs more than 256 tiles (tile numbers are one byte)', () => {
    const { result } = setupWith(fullFrames(32, 4, 4), 4, 4); // 512 tiles
    act(() => { result.current.exportASM(); result.current.exportC(); result.current.export2bpp(); });
    expect(global.alert).toHaveBeenCalledTimes(3);
    expect((global.alert as jest.Mock).mock.calls[0][0]).toMatch(/512 tiles.*at most 256/);
    expect(dl2).not.toHaveBeenCalled();
  });

  it('exports a sprite that uses exactly 256 tiles, and the highest tile number fits in a byte', () => {
    const { result } = setupWith(fullFrames(16, 4, 4), 4, 4); // 16 x 16 = 256 tiles
    act(() => result.current.exportASM());
    expect(global.alert).not.toHaveBeenCalled();
    const asm = dl2.mock.calls[0][0] as string;
    expect(asm).toContain('BIG_TILE_COUNT EQU 256');
    expect(asm).toContain(', 255, $00'); // the last tile is number 255
    expect(asm).not.toMatch(/, 25[6-9], \$|, 2[6-9]\d, \$|, [3-9]\d\d, \$/);
  });

  describe('loading rejects values a plain range check would let through', () => {
    const base = () => ({
      version: 1, type: 'sprite', tilesWidth: 1, tilesHeight: 1, objSize: '8x8', palette: 0, priority: false,
      frames: [{ pixels: Array.from({ length: 8 }, () => Array(8).fill(0)), duration: 6 }],
    });
    const load = (project: unknown) => {
      jest.spyOn(global, 'FileReader').mockImplementation(function (this: FileReader) {
        const self = this as unknown as { onload: (e: unknown) => void };
        (this as unknown as Record<string, unknown>).readAsText = () => self.onload({ target: { result: JSON.stringify(project) } });
        return this;
      } as unknown as typeof FileReader);
      const loadProjectData = jest.fn();
      const { result } = renderHook(() =>
        useSpriteProject({ frames: [], tilesWidth: 1, tilesHeight: 1, objSize: '8x8', palette: 0, priority: false, fileName: 'x', setFileName: jest.fn(), loadProjectData })
      );
      act(() => result.current.loadProject({ target: { files: [new File(['x'], 'a.json')], value: 'x' } } as unknown as React.ChangeEvent<HTMLInputElement>));
      return loadProjectData;
    };
    const withPixel = (v: unknown) => {
      const p = base();
      (p.frames[0].pixels[2] as unknown[])[3] = v;
      return p;
    };

    it('accepts a normal project', () => expect(load(base())).toHaveBeenCalled());
    it.each([['null', null], ['a string', '2'], ['a fraction', 1.5], ['too big', 4]])('rejects a pixel that is %s', (_n, v) => {
      expect(load(withPixel(v))).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalled();
    });
    it.each([['over 255', 256], ['a fraction', 6.5], ['zero', 0], ['text', '6']])('rejects a frame duration that is %s', (_n, duration) => {
      const p = base();
      (p.frames[0] as { duration: unknown }).duration = duration;
      expect(load(p)).not.toHaveBeenCalled();
    });
    it('accepts the longest duration, 255', () => {
      const p = base();
      p.frames[0].duration = 255;
      expect(load(p)).toHaveBeenCalled();
    });
  });
});

