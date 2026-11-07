import { render, screen, fireEvent } from '@testing-library/react';
import { NumberField } from '@/components/NumberField';
import MusicEditorPage from '@/app/(editor)/music_editor/page';

jest.mock('@/utils/gbApuEmulator', () => ({
  GbApuEmulator: class {
    writes = jest.fn();
    resume = jest.fn().mockResolvedValue(undefined);
    silence = jest.fn();
    close = jest.fn();
  },
}));

/** What the browser sends for a key press in the field. */
const type = (el: HTMLElement, value: string) => fireEvent.input(el, { target: { value }, inputType: 'insertText' });

function setup(value = 64) {
  const onCommit = jest.fn();
  render(<NumberField value={value} onCommit={onCommit} min={4} max={128} aria-label="Rows" />);
  return { onCommit, input: screen.getByLabelText('Rows') as HTMLInputElement };
}

describe('NumberField', () => {
  it('shows the value and passes min and max on', () => {
    const { input } = setup();
    expect(input).toHaveValue(64);
    expect(input).toHaveAttribute('min', '4');
    expect(input).toHaveAttribute('max', '128');
  });

  it('commits a spinner-arrow style change straight away', () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: '65' } });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(65);
  });

  it('does not act on half-typed text: typing 32 commits once, when the field is left', () => {
    const { input, onCommit } = setup();
    type(input, '3');
    expect(input).toHaveValue(3);
    expect(onCommit).not.toHaveBeenCalled(); // "3" on the way to "32" must not be applied
    type(input, '32');
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(32);
  });

  it('commits typed text on Enter, and only once when the field is left afterwards', () => {
    const { input, onCommit } = setup();
    type(input, '20');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(20);
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('Escape throws away what was typed', () => {
    const { input, onCommit } = setup();
    type(input, '9');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue(64);
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('clearing the field to retype it does not commit, and an empty field goes back to the value', () => {
    const { input, onCommit } = setup();
    type(input, '');
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue(64);
  });

  it('ignores a spinner change that is not a number, and other keys', () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: '' } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.blur(input); // nothing typed: nothing to commit
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('shows the value the app settled on (for example a clamped one) after committing', () => {
    const { rerender } = render(<NumberField value={4} onCommit={jest.fn()} aria-label="Clamped" />);
    const input = screen.getByLabelText('Clamped');
    type(input, '2');
    fireEvent.blur(input);
    rerender(<NumberField value={4} onCommit={jest.fn()} aria-label="Clamped" />);
    expect(input).toHaveValue(4);
  });
});

describe('typing in the music editor Rows field does not destroy notes on the way', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('musicEditor_hideInstructions', 'true');
  });

  it('typing 32 into a 64-row pattern keeps row 40 until you leave the field', () => {
    render(<MusicEditorPage />);
    const rows = screen.getByLabelText(/Rows/);
    fireEvent.change(rows, { target: { value: '64' } });
    fireEvent.click(screen.getByTestId('cell-0-40'));
    fireEvent.keyDown(screen.getByTestId('music-area'), { key: 'z' });
    expect(screen.getByTestId('cell-0-40')).toHaveTextContent('C-4');

    type(rows, '3'); // would have cut the pattern to 4 rows
    expect(screen.getByTestId('cell-0-40')).toHaveTextContent('C-4');
    type(rows, '32');
    expect(screen.getByTestId('cell-0-40')).toHaveTextContent('C-4');
    fireEvent.blur(rows);
    expect(screen.getByTestId('cell-0-31')).toBeInTheDocument();
    expect(screen.queryByTestId('cell-0-32')).not.toBeInTheDocument(); // now 32 rows
  });
});
