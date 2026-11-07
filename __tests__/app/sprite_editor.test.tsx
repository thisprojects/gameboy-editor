import { render, screen, fireEvent } from '@testing-library/react';
import SpriteEditorPage from '@/app/(editor)/sprite_editor/page';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));

function drawPixel() {
  const canvas = screen.getByTestId('tile-canvas');
  jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 256, height: 256, right: 256, bottom: 256, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.mouseDown(canvas, { clientX: 2, clientY: 2 });
  fireEvent.mouseUp(canvas);
}

describe('Sprite editor page', () => {
  beforeEach(() => {
    localStorage.clear();
    (downloadBlob as jest.Mock).mockClear();
  });

  it('shows instructions on first visit only', () => {
    const { unmount } = render(<SpriteEditorPage />);
    expect(screen.getByText('Sprite Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByText('Got it'));
    expect(screen.queryByText('Sprite Editor — How to Use')).not.toBeInTheDocument();
    unmount();
    render(<SpriteEditorPage />);
    expect(screen.queryByText('Sprite Editor — How to Use')).not.toBeInTheDocument();
  });

  it.each([
    ['Export RGBDS (.asm)', 'Export ASM', 'sprite.asm'],
    ['Export C (.h)', 'Export C', 'sprite.h'],
    ['Export .2bpp (tiles)', 'Export 2bpp', 'sprite.2bpp'],
    ['Save project', 'Save', 'sprite_sprite.json'],
  ])('%s via the modal', (button, confirm, file) => {
    localStorage.setItem('spriteEditor_hideInstructions', 'true');
    render(<SpriteEditorPage />);
    drawPixel();
    fireEvent.click(screen.getByText(button));
    fireEvent.click(screen.getAllByText(confirm).pop()!);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), file, expect.any(String));
  });

  it('adds a frame, applies the OBP1 palette, cancels the modal and opens the file dialog', () => {
    localStorage.setItem('spriteEditor_hideInstructions', 'true');
    render(<SpriteEditorPage />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText(/Frames — 2\/2/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Palette'), { target: { value: '1' } });
    expect(screen.getByLabelText('Palette')).toHaveValue('1');
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Load project'));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('undoes via the keyboard', () => {
    localStorage.setItem('spriteEditor_hideInstructions', 'true');
    render(<SpriteEditorPage />);
    drawPixel();
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).toBeEnabled();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, metaKey: true });
    expect(undo).toBeDisabled();
  });
});
