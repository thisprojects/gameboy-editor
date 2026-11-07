import { render, screen, fireEvent } from '@testing-library/react';
import { FontGrid } from '@/components/FontGrid';
import { FontPreview, layoutText } from '@/components/FontPreview';
import { FontToolbarContent } from '@/components/FontToolbarContent';
import { FontInstructionsModal, shouldShowFontInstructions } from '@/components/FontInstructionsModal';
import { PALETTE_PRESETS } from '@/constants';
import { starterGlyphs } from '@/utils/font';

describe('FontGrid', () => {
  function grid(onSelect = jest.fn()) {
    render(<FontGrid glyphs={starterGlyphs()} selected={3} onSelect={onSelect} preset={PALETTE_PRESETS[0]} />);
    const canvas = screen.getByTestId('font-grid');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 448, height: 168, right: 448, bottom: 168, x: 0, y: 0, toJSON: () => ({}) });
    return { canvas, onSelect };
  }

  it('selects the clicked glyph (28px cells, 16 columns)', () => {
    const { canvas, onSelect } = grid();
    fireEvent.click(canvas, { clientX: 28 * 2 + 5, clientY: 5 });
    expect(onSelect).toHaveBeenCalledWith(2);
    fireEvent.click(canvas, { clientX: 5, clientY: 28 * 5 + 5 });
    expect(onSelect).toHaveBeenCalledWith(80);
  });

  it('ignores clicks outside the grid', () => {
    const { canvas, onSelect } = grid();
    fireEvent.click(canvas, { clientX: 9999, clientY: 5 });
    fireEvent.click(canvas, { clientX: 5, clientY: 9999 });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('FontPreview', () => {
  it('lays out text with wrapping, newlines and unsupported characters', () => {
    expect(layoutText('AB')).toEqual([[33, 34]]);
    expect(layoutText('A\nB')).toEqual([[33], [34]]);
    expect(layoutText('é')).toEqual([[null]]);
    const wrapped = layoutText('x'.repeat(25));
    expect(wrapped).toHaveLength(2);
    expect(wrapped[0]).toHaveLength(20);
    expect(wrapped[1]).toHaveLength(5);
    expect(layoutText('')).toEqual([[]]);
  });

  it('renders a canvas sized for the text', () => {
    render(<FontPreview glyphs={starterGlyphs()} text={'Hi\nthere é'} preset={PALETTE_PRESETS[0]} />);
    const c = screen.getByTestId('font-preview') as HTMLCanvasElement;
    expect(c.width).toBe(20 * 16);
    expect(c.height).toBe(2 * 16);
  });
});

function toolbar(overrides: Record<string, unknown> = {}) {
  const fns = Object.fromEntries(
    ['onSelectTool','onShadeChange','onPresetChange','onPixelSizeChange','onCopy','onPaste','onClearGlyph','onResetGlyph',
     'onLoadStarter','onClearAll','onUndo','onRedo','onLoad','onSave','onImport2bpp','onExportASM','onExportC','onExport2bpp',
     'onExport1bpp'].map((k) => [k, jest.fn()])
  );
  const props = {
    currentTool: 'pencil', currentShade: 3, preset: PALETTE_PRESETS[0], selectedGlyph: 33, pixelSize: 20,
    hasClipboard: false, canUndo: true, canRedo: true, historyIndex: 1, ...fns, ...overrides,
  };
  render(<FontToolbarContent {...(props as unknown as React.ComponentProps<typeof FontToolbarContent>)} />);
  return props as typeof props & Record<string, jest.Mock>;
}

describe('FontToolbarContent', () => {
  it('shows the selected glyph info', () => {
    toolbar();
    expect(screen.getByText('#33')).toBeInTheDocument();
    expect(screen.getByText('ASCII 65 ($41)')).toBeInTheDocument();
    expect(screen.getByText("'A'")).toBeInTheDocument();
  });

  it('selects tools, shades, palette and zoom', () => {
    const p = toolbar();
    expect(screen.getByLabelText('Pencil')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByLabelText('Bucket (flood fill)'));
    expect(p.onSelectTool).toHaveBeenCalledWith('bucket');
    fireEvent.click(screen.getByLabelText('Shade 1'));
    expect(p.onShadeChange).toHaveBeenCalledWith(1);
    fireEvent.change(screen.getByLabelText('Palette'), { target: { value: 'Pocket' } });
    expect(p.onPresetChange).toHaveBeenCalledWith(PALETTE_PRESETS[2]);
    fireEvent.change(screen.getByLabelText('Palette'), { target: { value: 'zzz' } });
    expect(p.onPresetChange).toHaveBeenLastCalledWith(PALETTE_PRESETS[0]);
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '30' } });
    expect(p.onPixelSizeChange).toHaveBeenCalledWith(30);
  });

  it('disables Paste without a clipboard and enables it with one', () => {
    toolbar();
    expect(screen.getByText('Paste')).toBeDisabled();
  });

  it('fires glyph, font and file actions', () => {
    const p = toolbar({ hasClipboard: true });
    expect(screen.getByText('Paste')).toBeEnabled();
    for (const [label, fn] of [
      ['Copy', p.onCopy], ['Paste', p.onPaste], ['Clear glyph', p.onClearGlyph], ['Reset to starter', p.onResetGlyph],
      ['Load starter font', p.onLoadStarter], ['Clear all', p.onClearAll], ['Load project', p.onLoad],
      ['Save project', p.onSave], ['Import .2bpp', p.onImport2bpp], ['Export RGBDS (.asm)', p.onExportASM],
      ['Export C (.h)', p.onExportC], ['Export .2bpp', p.onExport2bpp], ['Export .1bpp', p.onExport1bpp],
    ] as const) {
      fireEvent.click(screen.getByText(label));
      expect(fn).toHaveBeenCalled();
    }
  });
});

describe('FontInstructionsModal', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing when closed', () => {
    const { container } = render(<FontInstructionsModal isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('closes, optionally persisting the preference', () => {
    const onClose = jest.fn();
    render(<FontInstructionsModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('Got it'));
    expect(shouldShowFontInstructions()).toBe(true);
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(shouldShowFontInstructions()).toBe(false);
  });
});
