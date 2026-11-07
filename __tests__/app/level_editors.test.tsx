import { render, screen, fireEvent } from '@testing-library/react';
import MetatileEditorPage from '@/app/(editor)/metatile_editor/page';
import LevelEditorPage from '@/app/(editor)/level_editor/page';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

const rect = (w: number, h: number) => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });

function paint(testId: string, cell: number, cx = 0, cy = 0) {
  const canvas = screen.getByTestId(testId);
  jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(4096, 4096));
  fireEvent.mouseDown(canvas, { clientX: cx * cell + 2, clientY: cy * cell + 2 });
  fireEvent.mouseUp(canvas, { clientX: cx * cell + 2, clientY: cy * cell + 2 });
}

describe('Metatile editor page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('metatileEditor_hideInstructions', 'true');
    (downloadBlob as jest.Mock).mockClear();
  });

  it('shows instructions on first visit and remembers dismissal', () => {
    localStorage.clear();
    const { unmount } = render(<MetatileEditorPage />);
    expect(screen.getByText('Metatile Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByText('Got it'));
    unmount();
    render(<MetatileEditorPage />);
    expect(screen.queryByText('Metatile Editor — How to Use')).not.toBeInTheDocument();
  });

  it.each([
    ['Export RGBDS (.asm)', 'Export ASM', 'metatiles.asm'],
    ['Export C (.h)', 'Export C', 'metatiles.h'],
    ['Export tiles (.2bpp)', 'Export 2bpp', 'metatiles.2bpp'],
    ['Save project', 'Save', 'metatiles_metatiles.json'],
  ])('%s via the modal', (button, confirm, file) => {
    render(<MetatileEditorPage />);
    fireEvent.click(screen.getByText(button));
    fireEvent.click(screen.getAllByText(confirm).pop()!);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), file, expect.any(String));
  });

  it('paints a cell, then undoes from the keyboard', () => {
    render(<MetatileEditorPage />);
    fireEvent.click(screen.getByLabelText('Rubber'));
    paint('metatile-canvas', 64);
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).toBeEnabled();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, metaKey: true });
    expect(undo).toBeDisabled();
  });

  it('manages metatiles, size and view, cancels modals and opens file dialogs', () => {
    render(<MetatileEditorPage />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText(/Metatiles — 2 of 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Solid (collision)'));
    fireEvent.change(screen.getByLabelText('Metatile size'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '4' } });
    fireEvent.click(screen.getByLabelText('Show grid'));
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Load project'));
    fireEvent.click(screen.getByText(/Import tileset/));
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });

  it('zooms with the wheel', () => {
    render(<MetatileEditorPage />);
    const canvas = screen.getByTestId('metatile-canvas');
    fireEvent.wheel(canvas, { deltaY: -100 });
    expect(screen.getByLabelText('Zoom (9x)')).toBeInTheDocument();
    fireEvent.wheel(canvas, { deltaY: 100 });
    expect(screen.getByLabelText('Zoom (8x)')).toBeInTheDocument();
  });
});

describe('Level editor page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('levelEditor_hideInstructions', 'true');
    (downloadBlob as jest.Mock).mockClear();
  });

  it('shows instructions on first visit and remembers dismissal', () => {
    localStorage.clear();
    const { unmount } = render(<LevelEditorPage />);
    expect(screen.getByText('Level Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByText('Got it'));
    unmount();
    render(<LevelEditorPage />);
    expect(screen.queryByText('Level Editor — How to Use')).not.toBeInTheDocument();
  });

  it.each([
    ['Export RGBDS (.asm)', 'Export ASM', 'level.asm'],
    ['Export C (.h)', 'Export C', 'level.h'],
    ['Export tile map (.tilemap)', 'Export Tilemap', 'level.tilemap'],
    ['Export tiles (.2bpp)', 'Export 2bpp', 'level.2bpp'],
    ['Save project', 'Save', 'level_level.json'],
  ])('%s via the modal', (button, confirm, file) => {
    render(<LevelEditorPage />);
    fireEvent.click(screen.getByText(button));
    fireEvent.click(screen.getAllByText(confirm).pop()!);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), file, expect.any(String));
  });

  it('paints a cell and undoes from the keyboard', () => {
    render(<LevelEditorPage />);
    paint('level-canvas', 32); // 2x2 metatiles at zoom 2 -> 32px cells
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).toBeEnabled();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, metaKey: true });
    expect(undo).toBeDisabled();
  });

  it('draws a rectangle preview while dragging', () => {
    render(<LevelEditorPage />);
    fireEvent.click(screen.getByLabelText('Rectangle'));
    const canvas = screen.getByTestId('level-canvas');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(4096, 4096));
    fireEvent.mouseDown(canvas, { clientX: 2, clientY: 2 });
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 70 });
    fireEvent.mouseUp(canvas, { clientX: 100, clientY: 70 });
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeEnabled();
  });

  it('changes level size, palette, view options and zoom; clears the level', () => {
    render(<LevelEditorPage />);
    fireEvent.change(screen.getByLabelText('Width in metatiles'), { target: { value: '24' } });
    expect(screen.getByLabelText('Width in metatiles')).toHaveValue(24);
    fireEvent.change(screen.getByLabelText('Background palette'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Screen tint'), { target: { value: 'Grey' } });
    fireEvent.click(screen.getByLabelText('Show collision'));
    fireEvent.click(screen.getByLabelText('Show grid'));
    fireEvent.click(screen.getByLabelText(/Show 20×18 screen/));
    fireEvent.click(screen.getByLabelText(/Show 20×18 screen/));
    fireEvent.change(screen.getByLabelText('SCX'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Zoom/), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Clear level'));
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeEnabled();
  });

  it('selects a metatile from the palette, zooms with the wheel, cancels the modal and opens file dialogs', () => {
    render(<LevelEditorPage />);
    const palette = screen.getByTestId('metatile-palette');
    jest.spyOn(palette, 'getBoundingClientRect').mockReturnValue(rect(180, 36));
    fireEvent.click(palette, { clientX: 5, clientY: 5 });
    expect(screen.getByText(/Metatiles — 0 of 2/)).toBeInTheDocument();
    fireEvent.wheel(screen.getByTestId('level-canvas'), { deltaY: -100 });
    expect(screen.getByLabelText('Zoom (3x)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Load project'));
    fireEvent.click(screen.getByText(/Import metatiles/));
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });
});
