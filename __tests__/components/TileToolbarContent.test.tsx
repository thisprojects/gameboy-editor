import { render, screen, fireEvent } from '@testing-library/react';
import { TileToolbarContent } from '@/components/TileToolbarContent';
import { ShadePicker } from '@/components/ShadePicker';
import { PALETTE_PRESETS } from '@/constants';

function setup(overrides: Record<string, unknown> = {}) {
  const props = {
    currentTool: 'pencil',
    onSelectTool: jest.fn(),
    currentShade: 3,
    onShadeChange: jest.fn(),
    preset: PALETTE_PRESETS[0],
    onPresetChange: jest.fn(),
    showTileNumbers: true,
    onShowTileNumbersChange: jest.fn(),
    tilesWidth: 4,
    tilesHeight: 4,
    onResize: jest.fn(),
    pixelSize: 16,
    onPixelSizeChange: jest.fn(),
    backgroundImage: null,
    backgroundEnabled: true,
    backgroundOpacity: 0.3,
    backgroundScale: 1,
    backgroundAdjustMode: false,
    onBackgroundEnabledChange: jest.fn(),
    onBackgroundOpacityChange: jest.fn(),
    onBackgroundScaleChange: jest.fn(),
    onBackgroundAdjustModeChange: jest.fn(),
    onLoadBackgroundImage: jest.fn(),
    onClearBackgroundImage: jest.fn(),
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    canUndo: true,
    canRedo: true,
    historyIndex: 2,
    onLoad: jest.fn(),
    onSave: jest.fn(),
    onImport2bpp: jest.fn(),
    onExportASM: jest.fn(),
    onExportC: jest.fn(),
    onExport2bpp: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
  render(<TileToolbarContent {...(props as unknown as React.ComponentProps<typeof TileToolbarContent>)} />);
  return props;
}

describe('TileToolbarContent', () => {
  it('selects tools and marks the active one', () => {
    const p = setup();
    expect(screen.getByLabelText('Pencil')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByLabelText('Line'));
    expect(p.onSelectTool).toHaveBeenCalledWith('line');
  });

  it('changes shade and palette', () => {
    const p = setup();
    fireEvent.click(screen.getByLabelText('Shade 1'));
    expect(p.onShadeChange).toHaveBeenCalledWith(1);
    fireEvent.change(screen.getByLabelText('Palette'), { target: { value: 'Grey' } });
    expect(p.onPresetChange).toHaveBeenCalledWith(PALETTE_PRESETS[1]);
    fireEvent.change(screen.getByLabelText('Palette'), { target: { value: 'nope' } });
    expect(p.onPresetChange).toHaveBeenLastCalledWith(PALETTE_PRESETS[0]);
  });

  it('resizes, zooms, toggles tile numbers', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText('Width in tiles'), { target: { value: '6' } });
    expect(p.onResize).toHaveBeenCalledWith(6, 4);
    fireEvent.change(screen.getByLabelText('Height in tiles'), { target: { value: '2' } });
    expect(p.onResize).toHaveBeenCalledWith(4, 2);
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '20' } });
    expect(p.onPixelSizeChange).toHaveBeenCalledWith(20);
    fireEvent.click(screen.getByLabelText('Show tile numbers'));
    expect(p.onShowTileNumbersChange).toHaveBeenCalledWith(false);
  });

  it('fires file actions', () => {
    const p = setup();
    for (const [label, fn] of [
      ['Load project', p.onLoad], ['Save project', p.onSave], ['Import .2bpp', p.onImport2bpp],
      ['Export RGBDS (.asm)', p.onExportASM], ['Export C (.h)', p.onExportC],
      ['Export .2bpp', p.onExport2bpp], ['Clear', p.onClear],
    ] as const) {
      fireEvent.click(screen.getByText(label));
      expect(fn).toHaveBeenCalled();
    }
  });

  it('loads a tracing image from the file input', () => {
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

describe('ShadePicker', () => {
  it('marks the selected shade and annotates shade 0', () => {
    render(<ShadePicker currentShade={0} onShadeChange={jest.fn()} preset={PALETTE_PRESETS[0]} />);
    expect(screen.getByLabelText('Shade 0')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Shade 0')).toHaveAttribute('title', expect.stringContaining('transparent'));
    expect(screen.getByLabelText('Shade 2')).toHaveAttribute('aria-checked', 'false');
  });
});
