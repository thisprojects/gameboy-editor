import { render, screen, fireEvent } from '@testing-library/react';
import { MapToolbarContent } from '@/components/MapToolbarContent';
import { MapInstructionsModal, shouldShowMapInstructions } from '@/components/MapInstructionsModal';
import { PALETTE_PRESETS } from '@/constants';
import { createBlankTile, createSolidTile } from '@/utils/map';

function setup(overrides: Record<string, unknown> = {}) {
  const fns = Object.fromEntries(
    ['onSelectTool','onSelectTile','onPresetChange','onBgpChange','onShowGridChange','onShowViewportChange','onMoveViewport',
     'onZoomChange','onExportAreaChange','onUndo','onRedo','onLoad','onSave','onImportTileset','onExportASM','onExportC',
     'onExportTilemap','onExport2bpp','onClear'].map((k) => [k, jest.fn()])
  );
  const props = {
    currentTool: 'stamp', tiles: [createBlankTile(), createSolidTile(3)], selectedTile: 1,
    displayPreset: PALETTE_PRESETS[0], basePreset: PALETTE_PRESETS[0], bgpIndex: 0,
    showGrid: true, showViewport: true, scx: 2, scy: 3, zoom: 3, exportArea: 'full',
    canUndo: true, canRedo: true, historyIndex: 1, ...fns, ...overrides,
  };
  render(<MapToolbarContent {...(props as unknown as React.ComponentProps<typeof MapToolbarContent>)} />);
  return props as typeof props & Record<string, jest.Mock>;
}

describe('MapToolbarContent', () => {
  it('selects tools and marks the active one', () => {
    const p = setup();
    expect(screen.getByLabelText('Stamp')).toHaveAttribute('aria-pressed', 'true');
    for (const [label, tool] of [['Rectangle', 'rect'], ['Fill', 'fill'], ['Pick tile', 'pick'], ['Rubber', 'rubber'], ['Pan', 'pan']]) {
      fireEvent.click(screen.getByLabelText(label));
      expect(p.onSelectTool).toHaveBeenCalledWith(tool);
    }
  });

  it('shows the selected tile and imports a tileset', () => {
    const p = setup();
    expect(screen.getByText('Tileset — tile 1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Import tileset/));
    expect(p.onImportTileset).toHaveBeenCalled();
  });

  it('changes BGP and tint', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText('Background palette'), { target: { value: '2' } });
    expect(p.onBgpChange).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'Pocket' } });
    expect(p.onPresetChange).toHaveBeenCalledWith(PALETTE_PRESETS[2]);
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'zzz' } });
    expect(p.onPresetChange).toHaveBeenLastCalledWith(PALETTE_PRESETS[0]);
  });

  it('controls view options, scroll position and zoom', () => {
    const p = setup();
    fireEvent.click(screen.getByLabelText('Show grid'));
    expect(p.onShowGridChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByLabelText(/Show 20×18 screen/));
    expect(p.onShowViewportChange).toHaveBeenCalledWith(false);
    fireEvent.change(screen.getByLabelText('SCX'), { target: { value: '9' } });
    expect(p.onMoveViewport).toHaveBeenCalledWith(9, 3);
    fireEvent.change(screen.getByLabelText('SCY'), { target: { value: '7' } });
    expect(p.onMoveViewport).toHaveBeenCalledWith(2, 7);
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '5' } });
    expect(p.onZoomChange).toHaveBeenCalledWith(5);
  });

  it('changes the export area', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText('Export area'), { target: { value: 'viewport' } });
    expect(p.onExportAreaChange).toHaveBeenCalledWith('viewport');
  });

  it('fires file actions', () => {
    const p = setup();
    for (const [label, fn] of [
      ['Load project', p.onLoad], ['Save project', p.onSave], ['Export RGBDS (.asm)', p.onExportASM],
      ['Export C (.h)', p.onExportC], ['Export map (.tilemap)', p.onExportTilemap],
      ['Export tiles (.2bpp)', p.onExport2bpp], ['Clear map', p.onClear],
    ] as const) {
      fireEvent.click(screen.getByText(label));
      expect(fn).toHaveBeenCalled();
    }
  });
});

describe('MapInstructionsModal', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing when closed', () => {
    const { container } = render(<MapInstructionsModal isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('closes, optionally persisting the preference', () => {
    const onClose = jest.fn();
    render(<MapInstructionsModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('Got it'));
    expect(shouldShowMapInstructions()).toBe(true);
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(shouldShowMapInstructions()).toBe(false);
  });
});
