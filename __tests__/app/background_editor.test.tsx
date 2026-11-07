import { render, screen, fireEvent } from '@testing-library/react';
import MapEditorPage from '@/app/(editor)/background_editor/page';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

function paint(cx = 1, cy = 1) {
  const canvas = screen.getByTestId('map-canvas');
  jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 768, height: 768, right: 768, bottom: 768, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.mouseDown(canvas, { clientX: cx * 24 + 4, clientY: cy * 24 + 4 });
  fireEvent.mouseUp(canvas, { clientX: cx * 24 + 4, clientY: cy * 24 + 4 });
}

describe('Background editor page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mapEditor_hideInstructions', 'true');
    (downloadBlob as jest.Mock).mockClear();
  });

  it('shows instructions on first visit and remembers dismissal', () => {
    localStorage.clear();
    const { unmount } = render(<MapEditorPage />);
    expect(screen.getByText('Background Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByText('Got it'));
    expect(screen.queryByText('Background Editor — How to Use')).not.toBeInTheDocument();
    unmount();
    render(<MapEditorPage />);
    expect(screen.queryByText('Background Editor — How to Use')).not.toBeInTheDocument();
  });

  it.each([
    ['Export RGBDS (.asm)', 'Export ASM', 'map.asm'],
    ['Export C (.h)', 'Export C', 'map.h'],
    ['Export map (.tilemap)', 'Export Tilemap', 'map.tilemap'],
    ['Export tiles (.2bpp)', 'Export 2bpp', 'map.2bpp'],
    ['Save project', 'Save', 'map_map.json'],
  ])('%s via the modal', (button, confirm, file) => {
    render(<MapEditorPage />);
    paint();
    fireEvent.click(screen.getByText(button));
    fireEvent.click(screen.getAllByText(confirm).pop()!);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), file, expect.any(String));
  });

  it('paints a cell and undoes it from the keyboard', () => {
    render(<MapEditorPage />);
    paint();
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).toBeEnabled();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, metaKey: true });
    expect(undo).toBeDisabled();
  });

  it('exports the screen area when selected', () => {
    render(<MapEditorPage />);
    fireEvent.change(screen.getByLabelText('Export area'), { target: { value: 'viewport' } });
    fireEvent.click(screen.getByText('Export map (.tilemap)'));
    fireEvent.click(screen.getAllByText('Export Tilemap').pop()!);
    const data = (downloadBlob as jest.Mock).mock.calls[0][0] as Uint8Array;
    expect(data).toHaveLength(360);
  });

  it('changes BGP, cancels the modal and opens file dialogs', () => {
    render(<MapEditorPage />);
    fireEvent.change(screen.getByLabelText('Background palette'), { target: { value: '1' } });
    expect(screen.getByLabelText('Background palette')).toHaveValue('1');
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Load project'));
    fireEvent.click(screen.getByText(/Import tileset/));
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });

  it('selects a tile from the palette and clears the map (undoable)', () => {
    render(<MapEditorPage />);
    const palette = screen.getByTestId('tile-palette');
    jest.spyOn(palette, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 192, height: 24, right: 192, bottom: 24, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.click(palette, { clientX: 5, clientY: 5 });
    expect(screen.getByText('Tileset — tile 0 of 2')).toBeInTheDocument();
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).toBeDisabled();
    fireEvent.click(screen.getByText('Clear map'));
    expect(undo).toBeEnabled();
  });
});
