import { render, screen, fireEvent } from '@testing-library/react';
import FontEditorPage from '@/app/(editor)/font_editor/page';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

const rect = (w: number, h: number) => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });

function drawPixel() {
  const canvas = screen.getByTestId('tile-canvas');
  jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(160, 160));
  fireEvent.mouseDown(canvas, { clientX: 2, clientY: 2 });
  fireEvent.mouseUp(canvas);
}

describe('Font editor page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fontEditor_hideInstructions', 'true');
    (downloadBlob as jest.Mock).mockClear();
  });

  it('shows instructions on first visit and remembers dismissal', () => {
    localStorage.clear();
    const { unmount } = render(<FontEditorPage />);
    expect(screen.getByText('Font Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByText('Got it'));
    unmount();
    render(<FontEditorPage />);
    expect(screen.queryByText('Font Editor — How to Use')).not.toBeInTheDocument();
  });

  it.each([
    ['Export RGBDS (.asm)', 'Export ASM', 'font.asm'],
    ['Export C (.h)', 'Export C', 'font.h'],
    ['Export .2bpp', 'Export 2bpp', 'font.2bpp'],
    ['Export .1bpp', 'Export 1bpp', 'font.1bpp'],
    ['Save project', 'Save', 'font_font.json'],
  ])('%s via the modal', (button, confirm, file) => {
    render(<FontEditorPage />);
    fireEvent.click(screen.getByText(button));
    fireEvent.click(screen.getAllByText(confirm).pop()!);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), file, expect.any(String));
  });

  it('selects a glyph from the grid and edits it with undo from the keyboard', () => {
    render(<FontEditorPage />);
    const grid = screen.getByTestId('font-grid');
    jest.spyOn(grid, 'getBoundingClientRect').mockReturnValue(rect(448, 168));
    fireEvent.click(grid, { clientX: 5, clientY: 5 }); // glyph 0 (space)
    expect(screen.getByText('#0')).toBeInTheDocument();
    drawPixel();
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).toBeEnabled();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, metaKey: true });
    expect(undo).toBeDisabled();
  });

  it('updates the preview text and handles copy/paste and clear', () => {
    render(<FontEditorPage />);
    fireEvent.change(screen.getByLabelText('Preview text'), { target: { value: 'HELLO' } });
    expect((screen.getByLabelText('Preview text') as HTMLTextAreaElement).value).toBe('HELLO');
    fireEvent.click(screen.getByText('Copy'));
    expect(screen.getByText('Paste')).toBeEnabled();
    fireEvent.click(screen.getByText('Paste'));
    fireEvent.click(screen.getByText('Clear glyph'));
    fireEvent.click(screen.getByText('Reset to starter'));
    fireEvent.click(screen.getByText('Clear all'));
    fireEvent.click(screen.getByText('Load starter font'));
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeEnabled();
  });

  it('cancels the modal and opens file dialogs', () => {
    render(<FontEditorPage />);
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Load project'));
    fireEvent.click(screen.getByText('Import .2bpp'));
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });
});
