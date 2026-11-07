import { render, screen, fireEvent } from '@testing-library/react';
import TileEditorPage from '@/app/(editor)/tile_editor/page';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

describe('Tile editor page', () => {
  beforeEach(() => {
    localStorage.clear();
    (downloadBlob as jest.Mock).mockClear();
  });

  it('shows instructions on first visit and hides them after dismissal', () => {
    render(<TileEditorPage />);
    expect(screen.getByText('Tile Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByText('Got it'));
    expect(screen.queryByText('Tile Editor — How to Use')).not.toBeInTheDocument();
  });

  it('does not show instructions once hidden', () => {
    localStorage.setItem('tileEditor_hideInstructions', 'true');
    render(<TileEditorPage />);
    expect(screen.queryByText('Tile Editor — How to Use')).not.toBeInTheDocument();
  });

  it('draws a pixel, then exports RGBDS through the filename modal', () => {
    localStorage.setItem('tileEditor_hideInstructions', 'true');
    render(<TileEditorPage />);
    const canvas = screen.getByTestId('tile-canvas');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 512, height: 512, right: 512, bottom: 512, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.mouseDown(canvas, { clientX: 2, clientY: 2 });
    fireEvent.mouseUp(canvas);

    fireEvent.click(screen.getByText('Export RGBDS (.asm)'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hero' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export ASM' }));
    expect(downloadBlob).toHaveBeenCalledWith(expect.stringContaining('hero_tiles::'), 'hero.asm', 'text/plain');
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it.each([
    ['Export C (.h)', 'Export C', 'tiles.h'],
    ['Export .2bpp', 'Export 2bpp', 'tiles.2bpp'],
    ['Save project', 'Save', 'tiles_tiles.json'],
  ])('%s via modal', (button, confirm, file) => {
    localStorage.setItem('tileEditor_hideInstructions', 'true');
    render(<TileEditorPage />);
    const canvas = screen.getByTestId('tile-canvas');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 512, height: 512, right: 512, bottom: 512, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.mouseDown(canvas, { clientX: 2, clientY: 2 });
    fireEvent.mouseUp(canvas);
    fireEvent.click(screen.getByText(button));
    fireEvent.click(screen.getAllByText(confirm).pop()!);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), file, expect.any(String));
  });

  it('cancels the modal and triggers the hidden file inputs', () => {
    localStorage.setItem('tileEditor_hideInstructions', 'true');
    render(<TileEditorPage />);
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();

    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Load project'));
    fireEvent.click(screen.getByText('Import .2bpp'));
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });

  it('supports undo via the keyboard', () => {
    localStorage.setItem('tileEditor_hideInstructions', 'true');
    render(<TileEditorPage />);
    const canvas = screen.getByTestId('tile-canvas');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 512, height: 512, right: 512, bottom: 512, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.mouseDown(canvas, { clientX: 2, clientY: 2 });
    fireEvent.mouseUp(canvas);
    const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undoButton).toBeEnabled();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, metaKey: true });
    expect(undoButton).toBeDisabled();
  });
});
