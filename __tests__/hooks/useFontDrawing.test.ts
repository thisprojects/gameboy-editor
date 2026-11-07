import { renderHook, act } from '@testing-library/react';
import { useFontDrawing } from '@/hooks/useFontDrawing';

describe('useFontDrawing', () => {
  it('starts with the starter font and "A" selected', () => {
    const { result } = renderHook(() => useFontDrawing());
    expect(result.current.glyphs).toHaveLength(96);
    expect(result.current.selectedGlyph).toBe(33);
    expect(result.current.pixels.flat().some((v) => v === 3)).toBe(true);
    expect(result.current.hasClipboard).toBe(false);
  });

  it('selects glyphs within range only', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => result.current.selectGlyph(5));
    expect(result.current.selectedGlyph).toBe(5);
    act(() => result.current.selectGlyph(-1));
    act(() => result.current.selectGlyph(96));
    expect(result.current.selectedGlyph).toBe(5);
  });

  it('draws and erases only on the selected glyph', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => result.current.selectGlyph(0)); // space: blank
    act(() => result.current.setCurrentShade(2));
    act(() => result.current.setPixel(1, 1, false));
    expect(result.current.glyphs[0][1][1]).toBe(2);
    expect(result.current.glyphs[1][1][1]).toBe(0);
    act(() => result.current.setPixel(1, 1, true));
    expect(result.current.glyphs[0][1][1]).toBe(0);
  });

  it('ignores no-op and out-of-range pixel writes', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => result.current.selectGlyph(0));
    const before = result.current.glyphs;
    act(() => result.current.setPixel(99, 99, false));
    act(() => result.current.setPixel(0, 0, true)); // already 0
    expect(result.current.glyphs).toBe(before);
  });

  it('draws lines (clipped), fills, and undoes', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => result.current.selectGlyph(0));
    act(() => result.current.drawLine({ x: 0, y: 0 }, { x: 12, y: 0 }));
    expect(result.current.pixels[0].every((v) => v === 3)).toBe(true);
    act(() => result.current.undo());
    expect(result.current.pixels[0].every((v) => v === 0)).toBe(true);
    act(() => result.current.setCurrentShade(1));
    act(() => result.current.bucketFill(0, 0));
    expect(result.current.pixels.flat().every((v) => v === 1)).toBe(true);
  });

  it('tool selection and glyph selection reset the line', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => {
      result.current.setLineStart({ x: 1, y: 1 });
      result.current.setLinePreview({ x: 2, y: 2 });
    });
    act(() => result.current.selectTool('line'));
    expect(result.current.currentTool).toBe('line');
    expect(result.current.lineStart).toBeNull();
    act(() => result.current.setLineStart({ x: 1, y: 1 }));
    act(() => result.current.selectGlyph(2));
    expect(result.current.lineStart).toBeNull();
    expect(result.current.linePreview).toBeNull();
  });

  it('clears a glyph and everything', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => result.current.clearGlyph());
    expect(result.current.pixels.flat().every((v) => v === 0)).toBe(true);
    expect(result.current.glyphs[34].flat().some((v) => v === 3)).toBe(true);
    act(() => result.current.clearAll());
    expect(result.current.glyphs.every((g) => g.flat().every((v) => v === 0))).toBe(true);
    act(() => result.current.undo());
    expect(result.current.glyphs[34].flat().some((v) => v === 3)).toBe(true);
  });

  it('restores starter glyph or the whole starter font', () => {
    const { result } = renderHook(() => useFontDrawing());
    const original = result.current.pixels.map((r) => [...r]);
    act(() => result.current.clearGlyph());
    act(() => result.current.resetGlyphToStarter());
    expect(result.current.pixels).toEqual(original);
    act(() => result.current.clearAll());
    act(() => result.current.loadStarterFont());
    expect(result.current.pixels).toEqual(original);
  });

  it('copies and pastes glyphs, independent of later edits', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => result.current.pasteGlyph()); // no clipboard: no-op
    expect(result.current.canUndo).toBe(false);
    const a = result.current.pixels.map((r) => [...r]);
    act(() => result.current.copyGlyph());
    expect(result.current.hasClipboard).toBe(true);
    act(() => result.current.selectGlyph(0));
    act(() => result.current.pasteGlyph());
    expect(result.current.pixels).toEqual(a);
    act(() => result.current.setPixel(0, 0, false)); // edit the pasted copy
    act(() => result.current.selectGlyph(1));
    act(() => result.current.pasteGlyph());
    expect(result.current.pixels).toEqual(a); // clipboard unchanged
  });

  it('loads font data and clears history', () => {
    const { result } = renderHook(() => useFontDrawing());
    act(() => result.current.clearGlyph());
    const blank = Array.from({ length: 96 }, () => Array.from({ length: 8 }, () => Array(8).fill(2)));
    act(() => result.current.loadFontData(blank));
    expect(result.current.pixels[0][0]).toBe(2);
    expect(result.current.canUndo).toBe(false);
  });
});
