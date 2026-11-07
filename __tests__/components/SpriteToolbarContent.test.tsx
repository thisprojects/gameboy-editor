import { render, screen, fireEvent } from '@testing-library/react';
import { SpriteToolbarContent } from '@/components/SpriteToolbarContent';
import { SpriteInstructionsModal, shouldShowSpriteInstructions } from '@/components/SpriteInstructionsModal';
import { PALETTE_PRESETS } from '@/constants';

const blank = Array.from({ length: 8 }, () => Array(8).fill(0));

function setup(overrides: Record<string, unknown> = {}) {
  const fns = Object.fromEntries(
    ['onSelectTool','onShadeChange','onPresetChange','onPaletteChange','onPriorityChange','onObjSizeChange','onResize',
     'onPixelSizeChange','onSelectFrame','onAddFrame','onDuplicateFrame','onDeleteFrame','onDurationChange','onOnionSkinChange',
     'onTogglePlay','onLoopChange','onBackgroundEnabledChange','onBackgroundOpacityChange','onBackgroundScaleChange',
     'onBackgroundAdjustModeChange','onLoadBackgroundImage','onClearBackgroundImage','onUndo','onRedo','onLoad','onSave',
     'onExportASM','onExportC','onExport2bpp','onClear'].map((k) => [k, jest.fn()])
  );
  const props = {
    currentTool: 'pencil', currentShade: 3, preset: PALETTE_PRESETS[0], palette: 0, priority: false, objSize: '8x8',
    tilesWidth: 2, tilesHeight: 2, pixelSize: 16,
    frames: [{ pixels: blank, duration: 6 }, { pixels: blank, duration: 9 }], currentFrame: 1,
    onionSkin: true, isPlaying: false, loop: true,
    backgroundImage: null, backgroundEnabled: true, backgroundOpacity: 0.3, backgroundScale: 1, backgroundAdjustMode: false,
    canUndo: true, canRedo: true, historyIndex: 2,
    ...fns, ...overrides,
  };
  render(<SpriteToolbarContent {...(props as unknown as React.ComponentProps<typeof SpriteToolbarContent>)} />);
  return props as typeof props & Record<string, jest.Mock>;
}

describe('SpriteToolbarContent', () => {
  it('selects tools, shade and tint', () => {
    const p = setup();
    expect(screen.getByLabelText('Pencil')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByLabelText('Rubber'));
    expect(p.onSelectTool).toHaveBeenCalledWith('rubber');
    fireEvent.click(screen.getByLabelText('Shade 2'));
    expect(p.onShadeChange).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'Grey' } });
    expect(p.onPresetChange).toHaveBeenCalledWith(PALETTE_PRESETS[1]);
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'zzz' } });
    expect(p.onPresetChange).toHaveBeenLastCalledWith(PALETTE_PRESETS[0]);
  });

  it('changes hardware attributes', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText('OBJ size'), { target: { value: '8x16' } });
    expect(p.onObjSizeChange).toHaveBeenCalledWith('8x16');
    fireEvent.change(screen.getByLabelText('Palette'), { target: { value: '1' } });
    expect(p.onPaletteChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByLabelText(/Behind background/));
    expect(p.onPriorityChange).toHaveBeenCalledWith(true);
  });

  it('resizes and zooms', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText('Width in tiles'), { target: { value: '3' } });
    expect(p.onResize).toHaveBeenCalledWith(3, 2);
    fireEvent.change(screen.getByLabelText('Height in tiles'), { target: { value: '4' } });
    expect(p.onResize).toHaveBeenCalledWith(2, 4);
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '20' } });
    expect(p.onPixelSizeChange).toHaveBeenCalledWith(20);
  });

  it('manages frames, duration, onion skin and playback', () => {
    const p = setup();
    expect(screen.getByLabelText('Frame 2')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByLabelText('Frame 1'));
    expect(p.onSelectFrame).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Duplicate'));
    fireEvent.click(screen.getByText('Delete'));
    expect(p.onAddFrame).toHaveBeenCalled();
    expect(p.onDuplicateFrame).toHaveBeenCalled();
    expect(p.onDeleteFrame).toHaveBeenCalled();
    expect(screen.getByLabelText(/Duration/)).toHaveValue(9);
    fireEvent.change(screen.getByLabelText(/Duration/), { target: { value: '12' } });
    expect(p.onDurationChange).toHaveBeenCalledWith(12);
    fireEvent.click(screen.getByLabelText(/Onion skin/));
    expect(p.onOnionSkinChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByLabelText('Play'));
    expect(p.onTogglePlay).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Loop'));
    expect(p.onLoopChange).toHaveBeenCalledWith(false);
  });

  it('shows Stop while playing and disables Play/Delete with one frame', () => {
    setup({ isPlaying: true });
    expect(screen.getByLabelText('Stop')).toBeInTheDocument();
  });

  it('disables play and delete for a single frame', () => {
    setup({ frames: [{ pixels: blank, duration: 6 }], currentFrame: 0 });
    expect(screen.getByLabelText('Play')).toBeDisabled();
    expect(screen.getByText('Delete')).toBeDisabled();
  });

  it('fires file actions', () => {
    const p = setup();
    for (const [label, fn] of [
      ['Load project', p.onLoad], ['Save project', p.onSave], ['Export RGBDS (.asm)', p.onExportASM],
      ['Export C (.h)', p.onExportC], ['Export .2bpp (tiles)', p.onExport2bpp], ['Clear frame', p.onClear],
    ] as const) {
      fireEvent.click(screen.getByText(label));
      expect(fn).toHaveBeenCalled();
    }
  });

  it('loads a tracing image', () => {
    const p = setup();
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Load tracing image'), { target: { files: [file] } });
    expect(p.onLoadBackgroundImage).toHaveBeenCalledWith(file);
    fireEvent.change(screen.getByLabelText('Load tracing image'), { target: { files: [] } });
    expect(p.onLoadBackgroundImage).toHaveBeenCalledTimes(1);
  });

  it('shows tracing controls when an image is loaded', () => {
    const p = setup({ backgroundImage: {} });
    fireEvent.click(screen.getByLabelText('Show'));
    expect(p.onBackgroundEnabledChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByLabelText(/Adjust/));
    expect(p.onBackgroundAdjustModeChange).toHaveBeenCalledWith(true);
    fireEvent.change(screen.getByLabelText('Opacity'), { target: { value: '0.5' } });
    expect(p.onBackgroundOpacityChange).toHaveBeenCalledWith(0.5);
    fireEvent.change(screen.getByLabelText('Scale'), { target: { value: '2' } });
    expect(p.onBackgroundScaleChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByText('Remove image'));
    expect(p.onClearBackgroundImage).toHaveBeenCalled();
  });
});

describe('SpriteInstructionsModal', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing when closed', () => {
    const { container } = render(<SpriteInstructionsModal isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('closes, optionally persisting the preference', () => {
    const onClose = jest.fn();
    render(<SpriteInstructionsModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('Got it'));
    expect(shouldShowSpriteInstructions()).toBe(true);
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(shouldShowSpriteInstructions()).toBe(false);
  });
});
