import { layoutFrame } from '@/utils/sprite';
import { renderHook, act } from '@testing-library/react';
import { useSpriteDrawing } from '@/hooks/useSpriteDrawing';

const blank = (w: number, h: number) => Array.from({ length: h }, () => Array(w).fill(0));

describe('useSpriteDrawing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('starts with one blank 16x16 frame', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    expect(result.current.frames).toHaveLength(1);
    expect(result.current.pixels).toHaveLength(16);
    expect(result.current.objSize).toBe('8x8');
    expect(result.current.onionPixels).toBeNull();
  });

  it('draws, erases, ignores no-ops and out of range', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setPixel(1, 1, false));
    expect(result.current.pixels[1][1]).toBe(3);
    const before = result.current.frames;
    act(() => result.current.setPixel(99, 99, false));
    act(() => result.current.setPixel(5, 5, true));
    expect(result.current.frames).toBe(before);
    act(() => result.current.setPixel(1, 1, true));
    expect(result.current.pixels[1][1]).toBe(0);
  });

  it('lines, fill, tool select and clear affect only the current frame', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.drawLine({ x: 0, y: 0 }, { x: 15, y: 0 }));
    expect(result.current.pixels[0].every((p) => p === 3)).toBe(true);
    act(() => result.current.undo());
    expect(result.current.pixels[0][0]).toBe(0);
    act(() => result.current.setCurrentShade(2));
    act(() => result.current.bucketFill(0, 0));
    expect(result.current.pixels[8][8]).toBe(2);
    act(() => {
      result.current.setLineStart({ x: 1, y: 1 });
      result.current.setLinePreview({ x: 2, y: 2 });
    });
    act(() => result.current.selectTool('line'));
    expect(result.current.lineStart).toBeNull();
    act(() => result.current.clearFrame());
    expect(result.current.pixels[8][8]).toBe(0);
  });

  it('adds, duplicates, selects and deletes frames', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setPixel(0, 0, false));
    act(() => result.current.duplicateFrame());
    expect(result.current.frames).toHaveLength(2);
    expect(result.current.currentFrame).toBe(1);
    expect(result.current.pixels[0][0]).toBe(3);
    expect(result.current.onionPixels).toBe(result.current.frames[0].pixels);
    act(() => result.current.addFrame());
    expect(result.current.frames).toHaveLength(3);
    expect(result.current.pixels[0][0]).toBe(0);
    act(() => result.current.setOnionSkin(false));
    expect(result.current.onionPixels).toBeNull();
    act(() => result.current.selectFrame(0));
    expect(result.current.currentFrame).toBe(0);
    act(() => result.current.deleteFrame());
    expect(result.current.frames).toHaveLength(2);
    act(() => result.current.deleteFrame());
    act(() => result.current.deleteFrame()); // last frame cannot be deleted
    expect(result.current.frames).toHaveLength(1);
  });

  it('limits to 32 frames', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    for (let i = 0; i < 31; i++) act(() => result.current.addFrame());
    expect(result.current.frames).toHaveLength(32);
    act(() => result.current.addFrame());
    act(() => result.current.duplicateFrame());
    expect(result.current.frames).toHaveLength(32);
    expect(global.alert).toHaveBeenCalledTimes(2);
  });

  it('clamps the frame index after undoing a frame add', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.addFrame());
    expect(result.current.currentFrame).toBe(1);
    act(() => result.current.undo());
    expect(result.current.currentFrame).toBe(0);
    expect(result.current.pixels).toBeDefined();
  });

  it('sets and clamps durations', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setFrameDuration(20));
    expect(result.current.frames[0].duration).toBe(20);
    act(() => result.current.setFrameDuration(0));
    expect(result.current.frames[0].duration).toBe(1);
    act(() => result.current.setFrameDuration(9999));
    expect(result.current.frames[0].duration).toBe(255);
  });

  it('resizes all frames preserving content and validates', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setPixel(0, 0, false));
    act(() => result.current.addFrame());
    act(() => result.current.resizeCanvas(3, 1));
    expect(result.current.tilesWidth).toBe(3);
    expect(result.current.frames.every((f) => f.pixels.length === 8 && f.pixels[0].length === 24)).toBe(true);
    act(() => result.current.selectFrame(0));
    expect(result.current.pixels[0][0]).toBe(3);
    act(() => result.current.resizeCanvas(5, 1));
    act(() => result.current.resizeCanvas(1, 0));
    expect(result.current.tilesWidth).toBe(3);
    act(() => result.current.resizeCanvas(4, 4)); // grow
    expect(result.current.tilesHeight).toBe(4);
  });

  it('8x16 mode requires an even height', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.resizeCanvas(1, 3));
    act(() => result.current.setObjSize('8x16')); // rounds 3 up to 4
    expect(result.current.objSize).toBe('8x16');
    expect(result.current.tilesHeight).toBe(4);
    act(() => result.current.resizeCanvas(1, 3));
    expect(global.alert).toHaveBeenCalled();
    expect(result.current.tilesHeight).toBe(4);
    act(() => result.current.setObjSize('8x8'));
    expect(result.current.objSize).toBe('8x8');
  });

  it('8x16 with even height keeps size on switch', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setPixel(0, 0, false));
    act(() => result.current.setObjSize('8x16'));
    expect(result.current.tilesHeight).toBe(2);
    act(() => result.current.resizeCanvas(1, 3 + 0)); // odd rejected
    act(() => result.current.resizeCanvas(2, 4));
    expect(result.current.pixels[0][0]).toBe(3);
  });

  it('keeps pixels when 8x16 rounds an odd height up', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.resizeCanvas(1, 1));
    act(() => result.current.setPixel(2, 2, false));
    act(() => result.current.setObjSize('8x16'));
    expect(result.current.tilesHeight).toBe(2);
    expect(result.current.pixels[2][2]).toBe(3);
  });

  describe('playback', () => {
    it('advances frames by duration and loops', () => {
      const { result } = renderHook(() => useSpriteDrawing());
      act(() => result.current.setFrameDuration(6)); // 100 ms
      act(() => result.current.addFrame());
      act(() => result.current.selectFrame(0));
      act(() => result.current.togglePlay());
      expect(result.current.isPlaying).toBe(true);
      act(() => jest.advanceTimersByTime(100));
      expect(result.current.currentFrame).toBe(1);
      act(() => jest.advanceTimersByTime(100));
      expect(result.current.currentFrame).toBe(0); // looped
      act(() => result.current.togglePlay());
      expect(result.current.isPlaying).toBe(false);
    });

    it('stops at the end when not looping', () => {
      const { result } = renderHook(() => useSpriteDrawing());
      act(() => result.current.addFrame());
      act(() => result.current.selectFrame(0));
      act(() => result.current.setLoop(false));
      act(() => result.current.togglePlay());
      act(() => jest.advanceTimersByTime(100));
      expect(result.current.currentFrame).toBe(1);
      act(() => jest.advanceTimersByTime(100));
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentFrame).toBe(1);
    });

    it('does not play a single frame', () => {
      const { result } = renderHook(() => useSpriteDrawing());
      act(() => result.current.togglePlay());
      expect(result.current.isPlaying).toBe(false);
    });
  });

  it('loads project data, resetting history and playback', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setPixel(0, 0, false));
    act(() =>
      result.current.loadProjectData({
        tilesWidth: 1,
        tilesHeight: 2,
        frames: [{ pixels: blank(8, 16), duration: 9 }],
        objSize: '8x16',
        palette: 1,
        priority: true,
      })
    );
    expect(result.current.tilesHeight).toBe(2);
    expect(result.current.objSize).toBe('8x16');
    expect(result.current.palette).toBe(1);
    expect(result.current.priority).toBe(true);
    expect(result.current.canUndo).toBe(false);
  });

  it('manages the tracing image', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.loadBackgroundImage(new File(['x'], 'a.png')));
    act(() => {
      result.current.setBackgroundX(3);
      result.current.setBackgroundAdjustMode(true);
    });
    act(() => result.current.clearBackgroundImage());
    expect(result.current.backgroundImage).toBeNull();
    expect(result.current.backgroundX).toBe(0);
    expect(result.current.backgroundAdjustMode).toBe(false);
  });
});

describe('useSpriteDrawing - OBJ size and undo', () => {
  beforeEach(() => {
    (global.alert as jest.Mock).mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('undo after switching to 8x16 restores the height AND the mode, so no tile row is lost on export', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.resizeCanvas(1, 3));
    act(() => result.current.setPixel(0, 20, false)); // a pixel in the third tile row
    act(() => result.current.setObjSize('8x16'));
    expect(result.current.tilesHeight).toBe(4);
    expect(result.current.objSize).toBe('8x16');
    act(() => result.current.undo());
    expect(result.current.tilesHeight).toBe(3);
    expect(result.current.objSize).toBe('8x8'); // not left on 8x16 with an odd height
    const layout = layoutFrame(result.current.pixels, result.current.tilesWidth, result.current.tilesHeight, result.current.objSize);
    expect(layout.entries).toHaveLength(1); // the third row is still exported
    act(() => result.current.redo());
    expect(result.current.objSize).toBe('8x16');
    expect(result.current.tilesHeight).toBe(4);
  });

  it('switching mode with an even height is also undoable, and choosing the current mode changes nothing', () => {
    const { result } = renderHook(() => useSpriteDrawing()); // 2x2 tiles
    act(() => result.current.setObjSize('8x8'));
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.setObjSize('8x16'));
    expect(result.current.objSize).toBe('8x16');
    expect(result.current.tilesHeight).toBe(2);
    act(() => result.current.undo());
    expect(result.current.objSize).toBe('8x8');
  });

  it('a stream of duration edits is one undo step', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    for (const d of [7, 8, 9, 10, 11]) act(() => result.current.setFrameDuration(d));
    expect(result.current.frames[0].duration).toBe(11);
    act(() => result.current.undo());
    expect(result.current.frames[0].duration).toBe(6);
    expect(result.current.canUndo).toBe(false);
  });

  it('duration edits on different frames are separate undo steps', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.addFrame()); // now on frame 1
    act(() => result.current.setFrameDuration(20));
    act(() => result.current.selectFrame(0));
    act(() => result.current.setFrameDuration(30));
    act(() => result.current.undo());
    expect(result.current.frames[0].duration).toBe(6);
    expect(result.current.frames[1].duration).toBe(20);
    act(() => result.current.undo());
    expect(result.current.frames[1].duration).toBe(6);
  });

  it('loading a project sets the OBJ size and clears history', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setObjSize('8x16'));
    act(() =>
      result.current.loadProjectData({
        tilesWidth: 1,
        tilesHeight: 1,
        frames: [{ pixels: Array.from({ length: 8 }, () => Array(8).fill(0)), duration: 3 }],
        objSize: '8x8',
        palette: 0,
        priority: false,
      })
    );
    expect(result.current.objSize).toBe('8x8');
    expect(result.current.canUndo).toBe(false);
  });
});

describe('useSpriteDrawing - review fixes (round 2)', () => {
  beforeEach(() => (global.alert as jest.Mock).mockClear());

  it('ignores sizes that are not whole numbers', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    const before = [result.current.tilesWidth, result.current.tilesHeight];
    act(() => result.current.resizeCanvas(2.5, 3));
    act(() => result.current.resizeCanvas(2, 1.5));
    act(() => result.current.resizeCanvas(NaN, 2));
    expect([result.current.tilesWidth, result.current.tilesHeight]).toEqual(before);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.resizeCanvas(3, 2));
    expect([result.current.tilesWidth, result.current.tilesHeight]).toEqual([3, 2]);
  });

  describe('tracing image', () => {
    class FakeImage {
      static last: FakeImage;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      constructor() {
        FakeImage.last = this;
      }
    }
    const realImage = global.Image;
    beforeEach(() => {
      (global as unknown as { Image: unknown }).Image = FakeImage;
      (URL.createObjectURL as jest.Mock).mockClear();
      (URL.revokeObjectURL as jest.Mock).mockClear();
    });
    afterEach(() => {
      global.Image = realImage;
    });

    it('releases the file URL once the image has loaded', () => {
      const { result } = renderHook(() => useSpriteDrawing());
      act(() => result.current.loadBackgroundImage(new File(['x'], 'a.png')));
      expect(FakeImage.last.src).toBe('mock-url');
      expect(URL.revokeObjectURL).not.toHaveBeenCalled(); // still needed while loading
      act(() => FakeImage.last.onload!());
      expect(result.current.backgroundImage).toBe(FakeImage.last);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('releases the file URL when the image cannot be loaded', () => {
      const { result } = renderHook(() => useSpriteDrawing());
      act(() => result.current.loadBackgroundImage(new File(['x'], 'broken.png')));
      act(() => FakeImage.last.onerror!());
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
      expect(result.current.backgroundImage).toBeNull();
    });
  });
});

describe('useSpriteDrawing - edit stream after undo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('a duration edit right after an undo gets its own undo step', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setFrameDuration(20));
    act(() => result.current.undo());
    expect(result.current.frames[0].duration).toBe(6);
    act(() => result.current.setFrameDuration(30));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.frames[0].duration).toBe(6);
  });

  it('and after a redo', () => {
    const { result } = renderHook(() => useSpriteDrawing());
    act(() => result.current.setFrameDuration(20));
    act(() => result.current.undo());
    act(() => result.current.redo());
    act(() => result.current.setFrameDuration(25));
    act(() => result.current.undo());
    expect(result.current.frames[0].duration).toBe(20);
  });
});

