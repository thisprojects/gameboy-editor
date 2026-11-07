import { render, screen, fireEvent, act } from '@testing-library/react';
import MusicEditorPage from '@/app/(editor)/music_editor/page';
import { downloadBlob } from '@/utils/download';

jest.mock('@/utils/download', () => ({ downloadBlob: jest.fn() }));
jest.mock('@/utils/gbApuEmulator', () => ({
  GbApuEmulator: class {
    writes = jest.fn();
    resume = jest.fn().mockResolvedValue(undefined);
    silence = jest.fn();
    close = jest.fn();
  },
}));

const area = () => screen.getByTestId('music-area');
const key = (k: string, extra = {}) => fireEvent.keyDown(area(), { key: k, ...extra });
const cellText = (ch: number, row: number) => screen.getByTestId(`cell-${ch}-${row}`).textContent;

describe('Music editor page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('musicEditor_hideInstructions', 'true');
    (downloadBlob as jest.Mock).mockClear();
  });

  it('shows instructions on first visit and remembers dismissal', () => {
    localStorage.clear();
    const { unmount } = render(<MusicEditorPage />);
    expect(screen.getByText('Music Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByText('Got it'));
    unmount();
    render(<MusicEditorPage />);
    expect(screen.queryByText('Music Editor — How to Use')).not.toBeInTheDocument();
  });

  it('enters notes from the keyboard, advancing the cursor', async () => {
    render(<MusicEditorPage />);
    await act(async () => key('z')); // C in the channel octave
    expect(cellText(0, 0)).toContain('C-4');
    await act(async () => key('q')); // C one octave up, on the next row
    expect(cellText(0, 1)).toContain('C-5');
    await act(async () => key('Z')); // upper-case works too
    expect(cellText(0, 2)).toContain('C-4');
  });

  it('moves the cursor with the arrow keys and enters on other channels', async () => {
    render(<MusicEditorPage />);
    key('ArrowRight');
    key('ArrowRight');
    key('ArrowDown');
    await act(async () => key('n'));
    expect(cellText(2, 1)).toContain('A-3'); // wave channel defaults to octave 3
    key('ArrowLeft');
    key('ArrowUp');
    key('ArrowLeft');
    key('ArrowLeft'); // clamped at channel 0
    key('ArrowUp'); // clamped at row 0
    await act(async () => key('x'));
    expect(cellText(0, 0)).toContain('D-4');
  });

  it('clamps the cursor at the last channel and last row', async () => {
    render(<MusicEditorPage />);
    for (let i = 0; i < 6; i++) key('ArrowRight');
    for (let i = 0; i < 40; i++) key('ArrowDown');
    await act(async () => key('z'));
    expect(cellText(3, 31)).toContain('C-4');
  });

  it('inserts note-off with 1 and clears with Backspace/Delete', async () => {
    render(<MusicEditorPage />);
    await act(async () => key('z'));
    key('ArrowUp');
    expect(cellText(0, 0)).toContain('C-4');
    key('Backspace');
    expect(cellText(0, 0)).toContain('...');
    key('1');
    expect(cellText(0, 0)).toContain('---');
    key('ArrowUp');
    key('Delete');
    expect(cellText(0, 0)).toContain('...');
  });

  it('ignores shortcuts with modifier keys, in form fields and for unmapped keys', async () => {
    render(<MusicEditorPage />);
    await act(async () => key('z', { ctrlKey: true }));
    await act(async () => key('z', { metaKey: true }));
    await act(async () => key('p')); // not a note key
    fireEvent.keyDown(screen.getByLabelText('Pattern'), { key: 'z' });
    expect(cellText(0, 0)).toContain('...');
  });

  it('undoes an edit from the keyboard', async () => {
    render(<MusicEditorPage />);
    await act(async () => key('z'));
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).toBeEnabled();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, metaKey: true });
    expect(cellText(0, 0)).toContain('...');
  });

  it('edits a cell through the popover', async () => {
    render(<MusicEditorPage />);
    await act(async () => key('z'));
    fireEvent.click(screen.getByTestId('cell-0-0'));
    const dialog = screen.getByRole('dialog', { name: 'Edit cell' });
    fireEvent.change(dialog.querySelectorAll('select')[0], { target: { value: 'G' } });
    expect(cellText(0, 0)).toContain('G-4');
  });

  it('adds a pattern, resizes it, edits the order and speed', () => {
    render(<MusicEditorPage />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByLabelText('Pattern')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText(/Rows/), { target: { value: '8' } });
    expect(screen.getAllByRole('row')).toHaveLength(9);
    fireEvent.click(screen.getByText('Add current pattern to order'));
    expect(screen.getByLabelText('Order position 1')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText(/Speed/), { target: { value: '4' } });
    expect(screen.getByLabelText(/Speed/)).toHaveValue(4);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByLabelText('Pattern')).toHaveValue('0');
  });

  it('plays and stops', async () => {
    render(<MusicEditorPage />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Play'));
    });
    expect(screen.getByLabelText('Stop')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop'));
    });
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('highlights the playing row in the selected pattern', async () => {
    jest.useFakeTimers();
    render(<MusicEditorPage />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Play'));
    });
    act(() => jest.advanceTimersByTime(20));
    expect(screen.getAllByRole('row')[1].className).toContain('bg-blue-900/50');
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Stop'));
    });
    jest.useRealTimers();
  });

  it('opens the instrument manager and previews', async () => {
    render(<MusicEditorPage />);
    fireEvent.click(screen.getByText('Instruments…'));
    expect(screen.getByRole('dialog', { name: 'Instruments' })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByText('Preview'));
    });
    fireEvent.click(screen.getByText('+ wave'));
    expect(screen.getByRole('button', { name: /^9: wave 9/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('dialog', { name: 'Instruments' })).not.toBeInTheDocument();
  });

  it.each([
    ['Export RGBDS (.asm)', 'Export ASM', 'music.asm'],
    ['Export C (.h)', 'Export C', 'music.h'],
    ['Save project', 'Save', 'music_music.json'],
  ])('%s via the modal', (button, confirm, file) => {
    render(<MusicEditorPage />);
    fireEvent.click(screen.getByText(button));
    fireEvent.click(screen.getAllByText(confirm).pop()!);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), file, expect.any(String));
  });

  it('cancels the modal and opens the load dialog', () => {
    render(<MusicEditorPage />);
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Load project'));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
