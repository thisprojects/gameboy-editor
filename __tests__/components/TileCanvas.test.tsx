import { render, screen, fireEvent } from '@testing-library/react';
import { TileCanvas } from '@/components/TileCanvas';
import { createEmptyPixels } from '@/utils/drawing';
import { PALETTE_PRESETS } from '@/constants';
import { Tool } from '@/types';

function setup(overrides: Record<string, unknown> = {}) {
  const props = {
    pixels: createEmptyPixels(16, 8),
    tilesWidth: 2,
    tilesHeight: 1,
    pixelSize: 10,
    preset: PALETTE_PRESETS[0],
    showTileNumbers: true,
    currentTool: 'pencil' as Tool,
    lineStart: null,
    linePreview: null,
    isDrawing: false,
    backgroundImage: null,
    backgroundOpacity: 0.3,
    backgroundEnabled: true,
    backgroundX: 0,
    backgroundY: 0,
    backgroundScale: 1,
    backgroundAdjustMode: false,
    onSetIsDrawing: jest.fn(),
    onStrokeStart: jest.fn(),
    onSetPixel: jest.fn(),
    onDrawLine: jest.fn(),
    onSetLineStart: jest.fn(),
    onSetLinePreview: jest.fn(),
    onBucketFill: jest.fn(),
    onBackgroundMove: jest.fn(),
    onBackgroundScale: jest.fn(),
    onPixelSizeChange: jest.fn(),
    ...overrides,
  };
  render(<TileCanvas {...(props as unknown as React.ComponentProps<typeof TileCanvas>)} />);
  const canvas = screen.getByTestId('tile-canvas');
  jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 160, height: 80, right: 160, bottom: 80, x: 0, y: 0, toJSON: () => ({}) });
  return { props, canvas };
}

const at = (x: number, y: number, extra = {}) => ({ clientX: x * 10 + 5, clientY: y * 10 + 5, ...extra });

describe('TileCanvas', () => {
  it('pencil draws on mousedown and drag, stops on mouseup', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, at(2, 1));
    expect(props.onStrokeStart).toHaveBeenCalled();
    expect(props.onSetIsDrawing).toHaveBeenCalledWith(true);
    expect(props.onSetPixel).toHaveBeenCalledWith(2, 1, false);
    fireEvent.mouseUp(canvas);
    expect(props.onSetIsDrawing).toHaveBeenCalledWith(false);
  });

  it('drags only while drawing', () => {
    const { props, canvas } = setup({ isDrawing: true });
    fireEvent.mouseMove(canvas, at(3, 1));
    expect(props.onSetPixel).toHaveBeenCalledWith(3, 1, false);
  });

  it('does not draw on move when not drawing, or outside the canvas', () => {
    const { props, canvas } = setup();
    fireEvent.mouseMove(canvas, at(3, 1));
    fireEvent.mouseDown(canvas, { clientX: 5000, clientY: 5 });
    expect(props.onSetPixel).not.toHaveBeenCalled();
  });

  it('rubber erases', () => {
    const { props, canvas } = setup({ currentTool: 'rubber', isDrawing: true });
    fireEvent.mouseDown(canvas, at(0, 0));
    fireEvent.mouseMove(canvas, at(1, 0));
    expect(props.onSetPixel).toHaveBeenCalledWith(0, 0, true);
    expect(props.onSetPixel).toHaveBeenCalledWith(1, 0, true);
  });

  it('line tool: first click sets start, second draws', () => {
    const first = setup({ currentTool: 'line' });
    fireEvent.mouseDown(first.canvas, at(1, 1));
    expect(first.props.onSetLineStart).toHaveBeenCalledWith({ x: 1, y: 1 });
    expect(first.props.onSetLinePreview).toHaveBeenCalledWith({ x: 1, y: 1 });
  });

  it('line tool second click draws and previews on move', () => {
    const { props, canvas } = setup({ currentTool: 'line', lineStart: { x: 0, y: 0 }, linePreview: { x: 2, y: 2 } });
    fireEvent.mouseMove(canvas, at(4, 2));
    expect(props.onSetLinePreview).toHaveBeenCalledWith({ x: 4, y: 2 });
    fireEvent.mouseDown(canvas, at(5, 2));
    expect(props.onDrawLine).toHaveBeenCalledWith({ x: 0, y: 0 }, { x: 5, y: 2 });
    expect(props.onSetLineStart).toHaveBeenCalledWith(null);
  });

  it('bucket fills', () => {
    const { props, canvas } = setup({ currentTool: 'bucket' });
    fireEvent.mouseDown(canvas, at(4, 4));
    expect(props.onBucketFill).toHaveBeenCalledWith(4, 4);
  });

  it('pans with right/middle button and the pan tool, without drawing', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, at(1, 1, { button: 2 }));
    fireEvent.mouseMove(canvas, at(3, 3));
    fireEvent.mouseUp(canvas);
    fireEvent.mouseDown(canvas, at(1, 1, { button: 1 }));
    fireEvent.mouseLeave(canvas);
    expect(props.onSetPixel).not.toHaveBeenCalled();
  });

  it('pan tool pans with the left button', () => {
    const { props, canvas } = setup({ currentTool: 'pan' });
    fireEvent.mouseDown(canvas, at(1, 1));
    expect(props.onStrokeStart).not.toHaveBeenCalled();
  });

  it('a plain wheel does not pan or zoom unless the pan tool is selected', () => {
    const { props, canvas } = setup();
    fireEvent.wheel(canvas, { deltaX: -50, deltaY: 0 });
    expect(props.onPixelSizeChange).not.toHaveBeenCalled();
    expect(canvas.parentElement!.style.transform).toContain('translate(0px');
  });

  it('a plain wheel (trackpad swipe) pans with the pan tool and does not zoom', () => {
    const { props, canvas } = setup({ currentTool: 'pan' });
    fireEvent.wheel(canvas, { deltaX: -50, deltaY: 0 });
    expect(props.onPixelSizeChange).not.toHaveBeenCalled();
    expect(canvas.parentElement!.style.transform).toContain('translate(50px');
  });

  it('wheel zooms', () => {
    const { props, canvas } = setup();
    fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
    expect(props.onPixelSizeChange).toHaveBeenCalledWith(11);
    fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
    expect(props.onPixelSizeChange).toHaveBeenCalledWith(9);
  });

  it('does not zoom below 1', () => {
    const { props, canvas } = setup({ pixelSize: 1 });
    fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
    expect(props.onPixelSizeChange).not.toHaveBeenCalled();
  });

  describe('tracing image', () => {
    const img = {} as HTMLImageElement;

    it('draws with the image and scales it on wheel in adjust mode', () => {
      const { props, canvas } = setup({ backgroundImage: img, backgroundAdjustMode: true });
      fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
      expect(props.onBackgroundScale).toHaveBeenCalledWith(1.1);
      fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
      expect(props.onBackgroundScale).toHaveBeenCalledWith(0.9);
      expect(props.onPixelSizeChange).not.toHaveBeenCalled();
    });

    it('drags the image in adjust mode', () => {
      const { props, canvas } = setup({ backgroundImage: img, backgroundAdjustMode: true });
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10, button: 0 });
      fireEvent.mouseMove(canvas, { clientX: 30, clientY: 40 });
      expect(props.onBackgroundMove).toHaveBeenCalledWith(2, 3);
      fireEvent.mouseUp(canvas);
      expect(props.onSetPixel).not.toHaveBeenCalled();
    });
  });

  it.each<[Tool, string]>([
    ['pencil', 'Click and drag to draw'],
    ['rubber', 'Click and drag to erase (shade 0)'],
    ['bucket', 'Click to flood-fill a region with the current shade'],
    ['pan', 'Click and drag to pan; scroll also pans, pinch or Ctrl/Cmd+scroll zooms'],
    ['line', 'Click to set line start point'],
  ])('shows a status for %s', (tool, text) => {
    setup({ currentTool: tool });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('shows line end and adjust statuses', () => {
    setup({ currentTool: 'line', lineStart: { x: 0, y: 0 } });
    expect(screen.getByText('Click to set line end point')).toBeInTheDocument();
  });

  it('shows adjust status with image', () => {
    setup({ backgroundImage: {}, backgroundAdjustMode: true });
    expect(screen.getByText('Drag to move image, scroll to scale')).toBeInTheDocument();
  });

  it('prevents the context menu', () => {
    const { canvas } = setup();
    expect(fireEvent.contextMenu(canvas)).toBe(false);
  });
});

describe('TileCanvas onion skin', () => {
  it('renders with an onion layer behind shade-0 pixels', () => {
    const onion = createEmptyPixels(16, 8);
    onion[0][0] = 2;
    const { canvas } = setup({ onionPixels: onion });
    expect(canvas).toBeInTheDocument();
  });
});
