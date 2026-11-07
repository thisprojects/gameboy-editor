import { renderHook, act } from '@testing-library/react';
import { useTileDrawing } from '@/hooks/useTileDrawing';

describe('useTileDrawing', () => {
  beforeEach(() => {
    (global.alert as jest.Mock).mockClear();
  });

  it('starts with a blank 4x4 tile canvas', () => {
    const { result } = renderHook(() => useTileDrawing());
    expect(result.current.tilesWidth).toBe(4);
    expect(result.current.canvasWidth).toBe(32);
    expect(result.current.pixels.flat().every((p) => p === 0)).toBe(true);
    expect(result.current.currentShade).toBe(3);
  });

  it('draws with pencil and erases with rubber', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => result.current.setPixel(1, 1, false));
    expect(result.current.pixels[1][1]).toBe(3);
    act(() => result.current.setCurrentShade(2));
    act(() => result.current.setPixel(2, 1, false));
    expect(result.current.pixels[1][2]).toBe(2);
    act(() => result.current.setPixel(1, 1, true));
    expect(result.current.pixels[1][1]).toBe(0);
  });

  it('ignores out-of-range and no-op pixel writes', () => {
    const { result } = renderHook(() => useTileDrawing());
    const before = result.current.pixels;
    act(() => result.current.setPixel(500, 500, false));
    act(() => result.current.setPixel(0, 0, true)); // already 0
    expect(result.current.pixels).toBe(before);
  });

  it('draws lines (clipped to the canvas) with undo', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => result.current.drawLine({ x: 0, y: 0 }, { x: 3, y: 0 }));
    expect(result.current.pixels[0].slice(0, 4)).toEqual([3, 3, 3, 3]);
    act(() => result.current.undo());
    expect(result.current.pixels[0][0]).toBe(0);
    act(() => result.current.drawLine({ x: 30, y: 0 }, { x: 40, y: 0 }));
    expect(result.current.pixels[0][31]).toBe(3);
  });

  it('flood fills', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => result.current.setCurrentShade(1));
    act(() => result.current.bucketFill(0, 0));
    expect(result.current.pixels.flat().every((p) => p === 1)).toBe(true);
  });

  it('selecting a tool resets the line', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => {
      result.current.setLineStart({ x: 1, y: 1 });
      result.current.setLinePreview({ x: 2, y: 2 });
    });
    act(() => result.current.selectTool('rubber'));
    expect(result.current.currentTool).toBe('rubber');
    expect(result.current.lineStart).toBeNull();
    expect(result.current.linePreview).toBeNull();
  });

  it('clears the canvas', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => result.current.setPixel(0, 0, false));
    act(() => result.current.clearCanvas());
    expect(result.current.pixels[0][0]).toBe(0);
    expect(result.current.canUndo).toBe(true);
  });

  it('resizes preserving content and validates limits', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => result.current.setPixel(0, 0, false));
    act(() => result.current.resizeCanvas(2, 3));
    expect(result.current.tilesWidth).toBe(2);
    expect(result.current.pixels).toHaveLength(24);
    expect(result.current.pixels[0][0]).toBe(3);
    act(() => result.current.resizeCanvas(0, 3));
    act(() => result.current.resizeCanvas(21, 1));
    expect(result.current.tilesWidth).toBe(2);
    act(() => result.current.resizeCanvas(20, 20));
    expect(global.alert).toHaveBeenCalled();
    expect(result.current.tilesWidth).toBe(2);
    act(() => result.current.resizeCanvas(6, 2)); // grow
    expect(result.current.canvasWidth).toBe(48);
  });

  it('loads project data and clears history', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => result.current.setPixel(0, 0, false));
    act(() => result.current.loadProjectData(1, 1, Array.from({ length: 8 }, () => Array(8).fill(2))));
    expect(result.current.tilesWidth).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.pixels[3][3]).toBe(2);
  });

  it('manages the tracing image', () => {
    const { result } = renderHook(() => useTileDrawing());
    act(() => result.current.loadBackgroundImage(new File(['x'], 'a.png')));
    act(() => {
      result.current.setBackgroundX(3);
      result.current.setBackgroundScale(2);
      result.current.setBackgroundAdjustMode(true);
    });
    act(() => result.current.clearBackgroundImage());
    expect(result.current.backgroundImage).toBeNull();
    expect(result.current.backgroundX).toBe(0);
    expect(result.current.backgroundScale).toBe(1);
    expect(result.current.backgroundAdjustMode).toBe(false);
  });
});

describe('useTileDrawing - review fixes (round 2)', () => {
  beforeEach(() => (global.alert as jest.Mock).mockClear());

  it('ignores sizes that are not whole numbers', () => {
    const { result } = renderHook(() => useTileDrawing());
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
      const { result } = renderHook(() => useTileDrawing());
      act(() => result.current.loadBackgroundImage(new File(['x'], 'a.png')));
      expect(FakeImage.last.src).toBe('mock-url');
      expect(URL.revokeObjectURL).not.toHaveBeenCalled(); // still needed while loading
      act(() => FakeImage.last.onload!());
      expect(result.current.backgroundImage).toBe(FakeImage.last);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('releases the file URL when the image cannot be loaded', () => {
      const { result } = renderHook(() => useTileDrawing());
      act(() => result.current.loadBackgroundImage(new File(['x'], 'broken.png')));
      act(() => FakeImage.last.onerror!());
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
      expect(result.current.backgroundImage).toBeNull();
    });
  });
});

