import { render, screen, fireEvent } from '@testing-library/react';
import { CellGridCanvas } from '@/components/CellGridCanvas';
import { MetatilePalette } from '@/components/MetatilePalette';
import { MetatileToolbarContent } from '@/components/MetatileToolbarContent';
import { LevelToolbarContent } from '@/components/LevelToolbarContent';
import { MetatileInstructionsModal, shouldShowMetatileInstructions } from '@/components/MetatileInstructionsModal';
import { LevelInstructionsModal, shouldShowLevelInstructions } from '@/components/LevelInstructionsModal';
import { PALETTE_PRESETS } from '@/constants';
import { createBlankTile, createSolidTile } from '@/utils/map';
import { createMetatile } from '@/utils/metatile';

const rect = (w: number, h: number) => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });
const tiles = [createBlankTile(), createSolidTile(3)];
const metatiles = Array.from({ length: 7 }, (_, i) => createMetatile(2, 2, i % 2, i === 3));

describe('CellGridCanvas', () => {
  function setup(overrides: Record<string, unknown> = {}) {
    const props = {
      cols: 4, rows: 3, cellSize: 10, renderCell: jest.fn(), overlay: jest.fn(), showGrid: true, panTool: false,
      status: 'status text', hoverLabel: (x: number, y: number) => `cell ${x},${y}`,
      onBeginStroke: jest.fn(), onContinueStroke: jest.fn(), onEndStroke: jest.fn(), onWheelZoom: jest.fn(),
      ...overrides,
    };
    render(<CellGridCanvas {...(props as unknown as React.ComponentProps<typeof CellGridCanvas>)} />);
    const canvas = screen.getByTestId('cell-grid-canvas');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(40, 30));
    return { props, canvas };
  }
  const at = (x: number, y: number, extra = {}) => ({ clientX: x * 10 + 5, clientY: y * 10 + 5, ...extra });

  it('draws non-square cells with their own height', () => {
    const { props } = setup({ showGrid: false, cellHeight: 40 } as never);
    expect(props.renderCell).toHaveBeenCalledWith(expect.anything(), 3, 2, 30, 80, 10, 40);
  });

  it('renders every cell and the overlay', () => {
    const { props } = setup({ showGrid: false });
    expect(props.renderCell).toHaveBeenCalledTimes(12);
    expect(props.renderCell).toHaveBeenCalledWith(expect.anything(), 3, 2, 30, 20, 10, 10);
    expect(props.overlay).toHaveBeenCalled();
  });

  it('works without an overlay and with a grid', () => {
    const { props } = setup({ overlay: undefined });
    expect(props.renderCell).toHaveBeenCalled();
    expect(screen.getByText('status text')).toBeInTheDocument();
  });

  it('translates mouse positions to cells', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, at(3, 2));
    expect(props.onBeginStroke).toHaveBeenCalledWith({ x: 3, y: 2 });
    fireEvent.mouseMove(canvas, at(1, 1));
    expect(props.onContinueStroke).toHaveBeenCalledWith({ x: 1, y: 1 });
    expect(screen.getByText('cell 1,1')).toBeInTheDocument();
    fireEvent.mouseUp(canvas, at(1, 1));
    expect(props.onEndStroke).toHaveBeenCalledWith({ x: 1, y: 1 });
  });

  it('shows the default hint without a hover label and ignores presses outside', () => {
    const { props, canvas } = setup({ hoverLabel: undefined });
    fireEvent.mouseMove(canvas, at(1, 1));
    expect(screen.getByText(/Scroll or right-click drag to pan/)).toBeInTheDocument();
    fireEvent.mouseDown(canvas, { clientX: 999, clientY: 5 });
    fireEvent.mouseMove(canvas, { clientX: 999, clientY: 5 });
    expect(props.onBeginStroke).not.toHaveBeenCalled();
    expect(props.onContinueStroke).toHaveBeenCalledTimes(1);
    fireEvent.mouseLeave(canvas);
    expect(props.onEndStroke).toHaveBeenCalledWith(null);
  });

  it('pans with right/middle button without painting', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, at(1, 1, { button: 2 }));
    fireEvent.mouseMove(canvas, at(2, 2));
    fireEvent.mouseUp(canvas);
    fireEvent.mouseDown(canvas, at(1, 1, { button: 1 }));
    fireEvent.mouseLeave(canvas);
    expect(props.onBeginStroke).not.toHaveBeenCalled();
    expect(props.onContinueStroke).not.toHaveBeenCalled();
    expect(props.onEndStroke).not.toHaveBeenCalled();
  });

  it('pan tool pans with the left button and never begins a stroke', () => {
    const { props, canvas } = setup({ panTool: true });
    fireEvent.mouseDown(canvas, at(1, 1));
    fireEvent.mouseUp(canvas);
    fireEvent.mouseDown(canvas, at(1, 1, { button: 3 }));
    expect(props.onBeginStroke).not.toHaveBeenCalled();
  });

  it('wheel zooms in and out', () => {
    const { props, canvas } = setup();
    fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
    fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
    expect(props.onWheelZoom).toHaveBeenNthCalledWith(1, 1);
    expect(props.onWheelZoom).toHaveBeenNthCalledWith(2, -1);
  });

  it('prevents the context menu', () => {
    const { canvas } = setup();
    expect(fireEvent.contextMenu(canvas)).toBe(false);
  });
});

describe('MetatilePalette', () => {
  function palette(onSelect = jest.fn()) {
    render(<MetatilePalette metatiles={metatiles} tiles={tiles} selected={2} onSelect={onSelect} preset={PALETTE_PRESETS[0]} />);
    const canvas = screen.getByTestId('metatile-palette');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(180, 72));
    return { canvas, onSelect };
  }

  it('selects the clicked metatile (36px cells, 5 columns)', () => {
    const { canvas, onSelect } = palette();
    fireEvent.click(canvas, { clientX: 40, clientY: 5 });
    expect(onSelect).toHaveBeenCalledWith(1);
    fireEvent.click(canvas, { clientX: 5, clientY: 40 });
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it('ignores clicks past the last metatile or outside', () => {
    const { canvas, onSelect } = palette();
    fireEvent.click(canvas, { clientX: 150, clientY: 40 }); // index 9 > 6
    fireEvent.click(canvas, { clientX: 999, clientY: 5 });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

function metatileToolbar(overrides: Record<string, unknown> = {}) {
  const fns = Object.fromEntries(
    ['onSelectTool','onSelectTile','onSelectMetatile','onSizeChange','onToggleSolid','onAddMetatile','onDuplicateMetatile',
     'onDeleteMetatile','onClearMetatile','onPresetChange','onShowGridChange','onZoomChange','onUndo','onRedo','onLoad','onSave',
     'onImportTileset','onExportASM','onExportC','onExport2bpp'].map((k) => [k, jest.fn()])
  );
  const props = {
    currentTool: 'stamp', tiles, selectedTile: 1, metatiles, selectedMetatile: 3, mw: 2, mh: 2, solid: true,
    preset: PALETTE_PRESETS[0], showGrid: true, zoom: 8, canUndo: true, canRedo: true, historyIndex: 1, ...fns, ...overrides,
  };
  render(<MetatileToolbarContent {...(props as unknown as React.ComponentProps<typeof MetatileToolbarContent>)} />);
  return props as typeof props & Record<string, jest.Mock>;
}

describe('MetatileToolbarContent', () => {
  it('selects tools', () => {
    const p = metatileToolbar();
    expect(screen.getByLabelText('Stamp')).toHaveAttribute('aria-pressed', 'true');
    for (const [label, tool] of [['Fill', 'fill'], ['Pick tile', 'pick'], ['Rubber', 'rubber']]) {
      fireEvent.click(screen.getByLabelText(label));
      expect(p.onSelectTool).toHaveBeenCalledWith(tool);
    }
  });

  it('shows counts, changes size, toggles solid', () => {
    const p = metatileToolbar();
    expect(screen.getByText('Tileset — tile 1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/Metatiles — 3 of 7/)).toBeInTheDocument();
    const w = screen.getByLabelText('Metatile width in tiles');
    fireEvent.change(w, { target: { value: '1' } });
    fireEvent.blur(w);
    expect(p.onSizeChange).toHaveBeenCalledWith(1, 2);
    const h = screen.getByLabelText('Metatile height in tiles');
    fireEvent.change(h, { target: { value: '4' } });
    fireEvent.blur(h);
    expect(p.onSizeChange).toHaveBeenCalledWith(2, 4);
    expect(screen.getByLabelText('Solid (collision)')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Solid (collision)'));
    expect(p.onToggleSolid).toHaveBeenCalled();
  });

  it('manages the library and view options', () => {
    const p = metatileToolbar();
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Duplicate'));
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Clear metatile'));
    fireEvent.click(screen.getByText(/Import tileset/));
    expect(p.onAddMetatile).toHaveBeenCalled();
    expect(p.onDuplicateMetatile).toHaveBeenCalled();
    expect(p.onDeleteMetatile).toHaveBeenCalled();
    expect(p.onClearMetatile).toHaveBeenCalled();
    expect(p.onImportTileset).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'Grey' } });
    expect(p.onPresetChange).toHaveBeenCalledWith(PALETTE_PRESETS[1]);
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'zzz' } });
    expect(p.onPresetChange).toHaveBeenLastCalledWith(PALETTE_PRESETS[0]);
    fireEvent.click(screen.getByLabelText('Show grid'));
    expect(p.onShowGridChange).toHaveBeenCalledWith(false);
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '12' } });
    expect(p.onZoomChange).toHaveBeenCalledWith(12);
  });

  it('disables Delete with one metatile and fires file actions', () => {
    const p = metatileToolbar({ metatiles: [metatiles[0]], selectedMetatile: 0 });
    expect(screen.getByText('Delete')).toBeDisabled();
    for (const [label, fn] of [
      ['Load project', p.onLoad], ['Save project', p.onSave], ['Export RGBDS (.asm)', p.onExportASM],
      ['Export C (.h)', p.onExportC], ['Export tiles (.2bpp)', p.onExport2bpp],
    ] as const) {
      fireEvent.click(screen.getByText(label));
      expect(fn).toHaveBeenCalled();
    }
  });
});

function levelToolbar(overrides: Record<string, unknown> = {}) {
  const fns = Object.fromEntries(
    ['onSelectTool','onSelectMetatile','onPresetChange','onBgpChange','onResize','onShowGridChange','onShowCollisionChange',
     'onShowViewportChange','onMoveViewport','onZoomChange','onUndo','onRedo','onLoad','onSave','onImportLibrary','onExportASM',
     'onExportC','onExportTilemap','onExport2bpp','onClear'].map((k) => [k, jest.fn()])
  );
  const props = {
    currentTool: 'stamp', tiles, metatiles, mw: 2, mh: 2, selectedMetatile: 1, displayPreset: PALETTE_PRESETS[0], basePreset: PALETTE_PRESETS[0],
    bgpIndex: 0, width: 16, height: 12, showGrid: true, showCollision: true, showViewport: true, scx: 4, scy: 5, zoom: 2,
    canUndo: true, canRedo: true, historyIndex: 1, ...fns, ...overrides,
  };
  render(<LevelToolbarContent {...(props as unknown as React.ComponentProps<typeof LevelToolbarContent>)} />);
  return props as typeof props & Record<string, jest.Mock>;
}

describe('LevelToolbarContent', () => {
  it('selects tools and the library', () => {
    const p = levelToolbar();
    expect(screen.getByLabelText('Stamp')).toHaveAttribute('aria-pressed', 'true');
    for (const [label, tool] of [['Select area', 'select'], ['Fill', 'fill'], ['Pick metatile', 'pick'], ['Rubber', 'rubber'], ['Pan', 'pan']]) {
      fireEvent.click(screen.getByLabelText(label));
      expect(p.onSelectTool).toHaveBeenCalledWith(tool);
    }
    expect(screen.getByText(/Metatiles — 1 of 7 \(2×2 tiles\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Import metatiles/));
    expect(p.onImportLibrary).toHaveBeenCalled();
  });

  it('resizes the level and shows the tile dimensions', () => {
    const p = levelToolbar();
    expect(screen.getByText(/max 128×128\) — 32×24 tiles/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Width in metatiles'), { target: { value: '20' } });
    expect(p.onResize).toHaveBeenCalledWith(20, 12);
    fireEvent.change(screen.getByLabelText('Height in metatiles'), { target: { value: '9' } });
    expect(p.onResize).toHaveBeenCalledWith(16, 9);
  });

  it('changes palette, view options, scroll and zoom', () => {
    const p = levelToolbar();
    fireEvent.change(screen.getByLabelText('Background palette'), { target: { value: '2' } });
    expect(p.onBgpChange).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'Pocket' } });
    expect(p.onPresetChange).toHaveBeenCalledWith(PALETTE_PRESETS[2]);
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'zzz' } });
    expect(p.onPresetChange).toHaveBeenLastCalledWith(PALETTE_PRESETS[0]);
    fireEvent.click(screen.getByLabelText('Show grid'));
    expect(p.onShowGridChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByLabelText('Show collision'));
    expect(p.onShowCollisionChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByLabelText(/Show 20×18 screen/));
    expect(p.onShowViewportChange).toHaveBeenCalledWith(false);
    fireEvent.change(screen.getByLabelText('SCX'), { target: { value: '9' } });
    expect(p.onMoveViewport).toHaveBeenCalledWith(9, 5);
    fireEvent.change(screen.getByLabelText('SCY'), { target: { value: '7' } });
    expect(p.onMoveViewport).toHaveBeenCalledWith(4, 7);
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '4' } });
    expect(p.onZoomChange).toHaveBeenCalledWith(4);
  });

  it('fires file actions', () => {
    const p = levelToolbar();
    for (const [label, fn] of [
      ['Load project', p.onLoad], ['Save project', p.onSave], ['Export RGBDS (.asm)', p.onExportASM],
      ['Export C (.h)', p.onExportC], ['Export tile map (.tilemap)', p.onExportTilemap],
      ['Export tiles (.2bpp)', p.onExport2bpp], ['Clear level', p.onClear],
    ] as const) {
      fireEvent.click(screen.getByText(label));
      expect(fn).toHaveBeenCalled();
    }
  });
});

describe.each([
  ['Metatile', MetatileInstructionsModal, shouldShowMetatileInstructions],
  ['Level', LevelInstructionsModal, shouldShowLevelInstructions],
])('%s instructions modal', (name, Modal, shouldShow) => {
  beforeEach(() => localStorage.clear());

  it('renders nothing when closed', () => {
    const { container } = render(<Modal isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('closes, optionally persisting the preference', () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} />);
    expect(screen.getByText(`${name} Editor — How to Use`)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Got it'));
    expect(shouldShow()).toBe(true);
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(shouldShow()).toBe(false);
  });
});
