import { render, screen, fireEvent } from '@testing-library/react';
import { MapCanvas } from '@/components/MapCanvas';
import { TilePalette } from '@/components/TilePalette';
import { createEmptyMap, createBlankTile, createSolidTile } from '@/utils/map';
import { PALETTE_PRESETS } from '@/constants';
import { MapTool } from '@/types/map';

function setup(overrides: Record<string, unknown> = {}) {
  const props = {
    map: createEmptyMap(),
    tiles: [createBlankTile(), createSolidTile(3)],
    preset: PALETTE_PRESETS[0],
    zoom: 1, // cell = 8px
    currentTool: 'stamp' as MapTool,
    showGrid: true,
    showViewport: true,
    scx: 30,
    scy: 20,
    rectStart: null,
    rectEnd: null,
    onBeginStroke: jest.fn(),
    onContinueStroke: jest.fn(),
    onEndStroke: jest.fn(),
    onZoomChange: jest.fn(),
    ...overrides,
  };
  render(<MapCanvas {...(props as unknown as React.ComponentProps<typeof MapCanvas>)} />);
  const canvas = screen.getByTestId('map-canvas');
  jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 256, height: 256, right: 256, bottom: 256, x: 0, y: 0, toJSON: () => ({}) });
  return { props, canvas };
}

const at = (cx: number, cy: number, extra = {}) => ({ clientX: cx * 8 + 4, clientY: cy * 8 + 4, ...extra });

describe('MapCanvas', () => {
  it('translates mouse positions to cells for begin/continue/end', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, at(3, 4));
    expect(props.onBeginStroke).toHaveBeenCalledWith({ x: 3, y: 4 });
    fireEvent.mouseMove(canvas, at(5, 4));
    expect(props.onContinueStroke).toHaveBeenCalledWith({ x: 5, y: 4 });
    fireEvent.mouseUp(canvas, at(5, 4));
    expect(props.onEndStroke).toHaveBeenCalledWith({ x: 5, y: 4 });
    expect(screen.getByText('Cell 5,4 — tile 0')).toBeInTheDocument();
  });

  it('ignores presses outside the map and cancels on leave', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, { clientX: 9999, clientY: 4 });
    expect(props.onBeginStroke).not.toHaveBeenCalled();
    fireEvent.mouseMove(canvas, { clientX: 9999, clientY: 4 });
    expect(props.onContinueStroke).not.toHaveBeenCalled();
    fireEvent.mouseLeave(canvas);
    expect(props.onEndStroke).toHaveBeenCalledWith(null);
  });

  it('pans with right/middle button and the pan tool, without painting', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, at(1, 1, { button: 2 }));
    fireEvent.mouseMove(canvas, at(3, 3));
    fireEvent.mouseUp(canvas);
    fireEvent.mouseDown(canvas, at(1, 1, { button: 1 }));
    fireEvent.mouseLeave(canvas);
    expect(props.onBeginStroke).not.toHaveBeenCalled();
    expect(props.onEndStroke).not.toHaveBeenCalled();
  });

  it('pan tool pans with the left button and never begins a stroke', () => {
    const { props, canvas } = setup({ currentTool: 'pan' });
    fireEvent.mouseDown(canvas, at(1, 1));
    fireEvent.mouseUp(canvas);
    expect(props.onBeginStroke).not.toHaveBeenCalled();
  });

  it('pan tool ignores a non-primary-button press that is not pan', () => {
    const { props, canvas } = setup({ currentTool: 'pan' });
    fireEvent.mouseDown(canvas, at(1, 1, { button: 3 }));
    expect(props.onBeginStroke).not.toHaveBeenCalled();
  });

  it('wheel zooms within 1..8', () => {
    const { props, canvas } = setup({ zoom: 3 });
    fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
    expect(props.onZoomChange).toHaveBeenCalledWith(4);
    fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
    expect(props.onZoomChange).toHaveBeenCalledWith(2);
  });

  it('does not zoom past the limits', () => {
    const { props, canvas } = setup({ zoom: 1 });
    fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
    expect(props.onZoomChange).not.toHaveBeenCalled();
  });

  it('draws grid, wrapped viewport and rectangle preview without error', () => {
    const { canvas } = setup({ currentTool: 'rect', rectStart: { x: 1, y: 1 }, rectEnd: { x: 3, y: 2 } });
    expect(canvas).toBeInTheDocument();
  });

  it('can hide the grid and viewport', () => {
    const { canvas } = setup({ showGrid: false, showViewport: false });
    expect(canvas).toBeInTheDocument();
  });

  it.each<[MapTool, string]>([
    ['stamp', 'Click and drag to paint the selected tile'],
    ['rect', 'Drag to fill a rectangle with the selected tile'],
    ['fill', 'Click to flood-fill matching tiles'],
    ['pick', 'Click a map cell to pick its tile'],
    ['rubber', 'Click and drag to erase (tile 0)'],
    ['pan', 'Click and drag to pan; scroll also pans, pinch or Ctrl/Cmd+scroll zooms'],
  ])('shows a status for %s', (tool, text) => {
    setup({ currentTool: tool });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('prevents the context menu', () => {
    const { canvas } = setup();
    expect(fireEvent.contextMenu(canvas)).toBe(false);
  });
});

describe('TilePalette', () => {
  const tiles = Array.from({ length: 10 }, () => createBlankTile());

  function palette(onSelect = jest.fn()) {
    render(<TilePalette tiles={tiles} selected={2} onSelect={onSelect} preset={PALETTE_PRESETS[0]} />);
    const canvas = screen.getByTestId('tile-palette');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 192, height: 48, right: 192, bottom: 48, x: 0, y: 0, toJSON: () => ({}) });
    return { canvas, onSelect };
  }

  it('selects the clicked tile (24px cells, 7 columns)', () => {
    const { canvas, onSelect } = palette();
    fireEvent.click(canvas, { clientX: 30, clientY: 5 }); // col 1, row 0
    expect(onSelect).toHaveBeenCalledWith(1);
    fireEvent.click(canvas, { clientX: 5, clientY: 30 }); // col 0, row 1 -> index 7
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('ignores clicks beyond the last tile', () => {
    const { canvas, onSelect } = palette();
    fireEvent.click(canvas, { clientX: 100, clientY: 30 }); // index 12 > 9
    fireEvent.click(canvas, { clientX: 500, clientY: 5 }); // off the right
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('MapCanvas cost of painting', () => {
  // one shared fake context, so every drawing call on every canvas can be counted
  const ctx = { fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, imageSmoothingEnabled: true } as Record<string, unknown>;
  for (const name of ['clearRect', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'drawImage', 'fillText']) ctx[name] = jest.fn();
  const calls = (name: string) => (ctx[name] as jest.Mock).mock.calls.length;
  const reset = () => Object.values(ctx).forEach((v) => (v as jest.Mock)?.mockClear?.());
  let original: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ctx) as never;
  });
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = original;
  });

  const tiles = [createBlankTile(), createSolidTile(3)]; // one stable tileset, as in the app (it is state there)
  const props = (map: number[][]) => ({
    map, tiles, preset: PALETTE_PRESETS[0], zoom: 3, currentTool: 'stamp' as MapTool,
    showGrid: false, showViewport: false, scx: 0, scy: 0, rectStart: null, rectEnd: null,
    onBeginStroke: jest.fn(), onContinueStroke: jest.fn(), onEndStroke: jest.fn(), onZoomChange: jest.fn(),
  });

  it('draws each cell with one image drawn from a cached tile, not pixel by pixel', () => {
    render(<MapCanvas {...props(createEmptyMap())} />);
    expect(calls('drawImage')).toBe(32 * 32);
    // only the two small tile images are drawn pixel by pixel (2 x 64), never the 65,536 pixels of the map
    expect(calls('fillRect')).toBeLessThanOrEqual(2 * 64);
  });

  it('painting one cell redraws the cells but does not redraw any tile pixel', () => {
    const map = createEmptyMap();
    const { rerender } = render(<MapCanvas {...props(map)} />);
    reset();
    const painted = map.map((row) => [...row]);
    painted[5][5] = 1;
    rerender(<MapCanvas {...props(painted)} />);
    expect(calls('drawImage')).toBe(32 * 32);
    expect(calls('fillRect')).toBe(0); // the cached tile images are reused
  });

  it('changing the palette redraws the tile images once', () => {
    const map = createEmptyMap();
    const { rerender } = render(<MapCanvas {...props(map)} />);
    reset();
    rerender(<MapCanvas {...props(map)} preset={PALETTE_PRESETS[1]} />);
    expect(calls('fillRect')).toBeLessThanOrEqual(2 * 64);
    expect(calls('drawImage')).toBe(32 * 32);
  });
});
