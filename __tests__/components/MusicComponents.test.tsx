import { render, screen, fireEvent, within } from '@testing-library/react';
import { MusicPatternCanvas, formatCell } from '@/components/MusicPatternCanvas';
import { WaveEditor } from '@/components/WaveEditor';
import { ManageInstrumentsModal } from '@/components/ManageInstrumentsModal';
import { MusicToolbarContent } from '@/components/MusicToolbarContent';
import { MusicInstructionsModal, shouldShowMusicInstructions } from '@/components/MusicInstructionsModal';
import { createPattern, emptyCell } from '@/utils/gbMusic';
import { PRESET_INSTRUMENTS } from '@/constants/musicPresets';
import { MusicInstrument } from '@/types/music';

const instruments: MusicInstrument[] = PRESET_INSTRUMENTS.map((p, i) => ({ id: `i${i}`, ...p, wave: [...p.wave] }));
const rect = (w: number, h: number) => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });

describe('formatCell', () => {
  it('formats empty, off and note cells', () => {
    expect(formatCell(emptyCell())).toEqual({ note: '...', inst: '..', vol: '.' });
    expect(formatCell({ ...emptyCell(), note: 'OFF' })).toEqual({ note: '---', inst: '--', vol: '-' });
    expect(formatCell({ note: 'C', octave: 4, instrument: 3, volume: 10 })).toEqual({ note: 'C-4', inst: '03', vol: 'A' });
    expect(formatCell({ note: 'F#', octave: 5, instrument: null, volume: null })).toEqual({ note: 'F#5', inst: '..', vol: '.' });
  });
});

describe('MusicPatternCanvas', () => {
  function setup(overrides: Record<string, unknown> = {}) {
    const pattern = createPattern('p', 'P', 8);
    pattern.cells[0][1] = { note: 'C', octave: 4, instrument: 0, volume: null };
    pattern.cells[1][2] = { note: 'OFF', octave: 4, instrument: null, volume: null };
    pattern.cells[2][3] = { note: 'A', octave: 3, instrument: 4, volume: null };
    const props = {
      pattern, instruments, channelInstrument: [0, 1, 4, 6], channelOctave: [4, 4, 3, 4], cursorRow: 0, cursorChannel: 0, playingRow: null,
      onChannelInstrumentChange: jest.fn(), onChannelOctaveChange: jest.fn(), onSetCursor: jest.fn(), onClearCell: jest.fn(), onSetCell: jest.fn(),
      ...overrides,
    };
    render(<MusicPatternCanvas {...(props as unknown as React.ComponentProps<typeof MusicPatternCanvas>)} />);
    return props as typeof props & Record<string, jest.Mock>;
  }

  it('shows four named channels and every row', () => {
    setup();
    for (const name of ['Pulse 1', 'Pulse 2', 'Wave', 'Noise']) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(9); // header + 8
    expect(screen.getByTestId('cell-0-1')).toHaveTextContent('C-4');
    expect(screen.getByTestId('cell-1-2')).toHaveTextContent('---');
  });

  it('only offers instruments of the channel kind', () => {
    setup();
    const optionsOf = (label: string) => within(screen.getByLabelText(label)).getAllByRole('option').map((o) => o.textContent);
    expect(optionsOf('Pulse 1 instrument')).toHaveLength(4);
    expect(optionsOf('Wave instrument')).toEqual(['4: Wave Bass', '5: Wave Saw']);
    expect(optionsOf('Noise instrument')).toHaveLength(3);
  });

  it('fires channel instrument and octave changes', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText('Pulse 2 instrument'), { target: { value: '3' } });
    expect(p.onChannelInstrumentChange).toHaveBeenCalledWith(1, 3);
    fireEvent.change(screen.getByLabelText('Wave octave'), { target: { value: '5' } });
    expect(p.onChannelOctaveChange).toHaveBeenCalledWith(2, 5);
  });

  it('selects cells; opens the editor only for filled cells', () => {
    const p = setup();
    fireEvent.click(screen.getByTestId('cell-0-5'));
    expect(p.onSetCursor).toHaveBeenCalledWith(0, 5);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-0-1'));
    expect(screen.getByRole('dialog', { name: 'Edit cell' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-0-5')); // empty cell closes it
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('edits note, octave, instrument and volume in the popover', () => {
    const p = setup();
    fireEvent.click(screen.getByTestId('cell-0-1'));
    const dialog = screen.getByRole('dialog');
    const selects = within(dialog).getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'D#' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { note: 'D#' });
    fireEvent.change(selects[0], { target: { value: 'OFF' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { note: 'OFF' });
    fireEvent.change(selects[0], { target: { value: '' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { note: null });
    fireEvent.change(selects[1], { target: { value: '6' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { octave: 6 });
    fireEvent.change(selects[2], { target: { value: '2' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { instrument: 2 });
    fireEvent.change(selects[2], { target: { value: '' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { instrument: null });
    fireEvent.change(selects[3], { target: { value: '9' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { volume: 9 });
    fireEvent.change(selects[3], { target: { value: '' } });
    expect(p.onSetCell).toHaveBeenLastCalledWith(0, 1, { volume: null });
  });

  it('disables fields for a note-off and the volume on the wave channel', () => {
    setup();
    fireEvent.click(screen.getByTestId('cell-1-2'));
    let selects = within(screen.getByRole('dialog')).getAllByRole('combobox');
    expect(selects.slice(1).every((s) => (s as HTMLSelectElement).disabled)).toBe(true);
    fireEvent.click(screen.getByTestId('cell-2-3'));
    selects = within(screen.getByRole('dialog')).getAllByRole('combobox');
    expect((selects[3] as HTMLSelectElement).disabled).toBe(true);
    expect((selects[2] as HTMLSelectElement).disabled).toBe(false);
    expect(within(selects[2]).getAllByRole('option').map((o) => o.textContent)).toEqual(['.. (none)', '4: Wave Bass', '5: Wave Saw']);
  });

  it('closes the popover on an outside click', () => {
    setup();
    fireEvent.click(screen.getByTestId('cell-0-1'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('right-click clears a cell and closes the popover', () => {
    const p = setup();
    fireEvent.click(screen.getByTestId('cell-0-1'));
    expect(fireEvent.contextMenu(screen.getByTestId('cell-0-1'))).toBe(false);
    expect(p.onClearCell).toHaveBeenCalledWith(0, 1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('highlights the playing row and handles an out-of-range one', () => {
    setup({ playingRow: 3 });
    expect(screen.getAllByRole('row')[4].className).toContain('bg-blue-900/50');
  });

  it('survives a playing row beyond the pattern', () => {
    setup({ playingRow: 99 });
    expect(screen.getAllByRole('row')).toHaveLength(9);
  });
});

describe('WaveEditor', () => {
  function setup() {
    const props = { wave: Array(32).fill(0), onSetSample: jest.fn(), onStrokeStart: jest.fn() };
    render(<WaveEditor {...props} />);
    const canvas = screen.getByTestId('wave-editor');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(320, 128));
    return { props, canvas };
  }

  it('draws samples on press and drag (10x8 px cells, 16 levels)', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, { clientX: 5, clientY: 127 });
    expect(props.onStrokeStart).toHaveBeenCalledTimes(1);
    expect(props.onSetSample).toHaveBeenLastCalledWith(0, 0);
    fireEvent.mouseMove(canvas, { clientX: 25, clientY: 0 });
    expect(props.onSetSample).toHaveBeenLastCalledWith(2, 15);
    fireEvent.mouseMove(canvas, { clientX: 315, clientY: 60 });
    expect(props.onSetSample).toHaveBeenLastCalledWith(31, 8);
    fireEvent.mouseUp(canvas);
    props.onSetSample.mockClear();
    fireEvent.mouseMove(canvas, { clientX: 25, clientY: 20 });
    expect(props.onSetSample).not.toHaveBeenCalled();
  });

  it('clamps vertically, ignores positions outside the wave, and stops on leave', () => {
    const { props, canvas } = setup();
    fireEvent.mouseDown(canvas, { clientX: 5, clientY: 999 });
    expect(props.onSetSample).toHaveBeenLastCalledWith(0, 0);
    fireEvent.mouseMove(canvas, { clientX: 5, clientY: -50 });
    expect(props.onSetSample).toHaveBeenLastCalledWith(0, 15);
    const calls = props.onSetSample.mock.calls.length;
    fireEvent.mouseMove(canvas, { clientX: 999, clientY: 5 });
    expect(props.onSetSample.mock.calls.length).toBe(calls);
    fireEvent.mouseLeave(canvas);
    fireEvent.mouseMove(canvas, { clientX: 25, clientY: 20 });
    expect(props.onSetSample.mock.calls.length).toBe(calls);
  });
});

describe('ManageInstrumentsModal', () => {
  function setup(editing: number, overrides: Record<string, unknown> = {}) {
    const fns = Object.fromEntries(['onClose', 'onSetEditingIndex', 'onAddInstrument', 'onRemoveInstrument', 'onUpdate', 'onSetWaveSample', 'onWaveStrokeStart', 'onPreview'].map((k) => [k, jest.fn()]));
    const props = { isOpen: true, instruments, editingInstrumentIndex: editing, ...fns, canRemoveInstrument: jest.fn(() => true), ...overrides };
    render(<ManageInstrumentsModal {...(props as unknown as React.ComponentProps<typeof ManageInstrumentsModal>)} />);
    return props as typeof props & Record<string, jest.Mock>;
  }

  it('renders nothing when closed', () => {
    const { container } = render(
      <ManageInstrumentsModal isOpen={false} onClose={jest.fn()} instruments={instruments} editingInstrumentIndex={0} onSetEditingIndex={jest.fn()} onAddInstrument={jest.fn()} onRemoveInstrument={jest.fn()} canRemoveInstrument={() => true} onUpdate={jest.fn()} onSetWaveSample={jest.fn()} onWaveStrokeStart={jest.fn()} onPreview={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists, selects, adds, previews, deletes and closes', () => {
    const p = setup(0);
    expect(screen.getByRole('button', { name: /^3: Zap/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^5: Wave Saw/ }));
    expect(p.onSetEditingIndex).toHaveBeenCalledWith(5);
    for (const kind of ['pulse', 'wave', 'noise']) {
      fireEvent.click(screen.getByText(`+ ${kind}`));
      expect(p.onAddInstrument).toHaveBeenLastCalledWith(kind);
    }
    fireEvent.click(screen.getByText('Preview'));
    expect(p.onPreview).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByText('Delete'));
    expect(p.onRemoveInstrument).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(p.onClose).toHaveBeenCalled();
  });

  it('disables Delete, with a reason, for the last instrument of a kind', () => {
    setup(0, { canRemoveInstrument: () => false });
    expect(screen.getByText('Delete')).toBeDisabled();
    expect(screen.getByText('Delete')).toHaveAttribute('title', 'This is the last pulse instrument');
  });

  it('asks the hook whether the shown instrument can be removed', () => {
    const p = setup(4);
    expect(p.canRemoveInstrument).toHaveBeenCalledWith(4);
    expect(screen.getByText('Delete')).toBeEnabled();
    expect(screen.getByText('Delete')).not.toHaveAttribute('title');
  });

  it('clamps an out-of-range editing index', () => {
    setup(99);
    expect((screen.getByLabelText('Instrument name') as HTMLInputElement).value).toBe('Kick');
  });

  it('edits a pulse instrument: name, duty, envelope, sweep', () => {
    const p = setup(3); // Zap
    expect(screen.getByText(/plays on the Pulse 1 channel/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Instrument name'), { target: { value: 'Pew' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { name: 'Pew' });
    fireEvent.change(screen.getByLabelText('Duty cycle'), { target: { value: '1' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { duty: 1 });
    fireEvent.change(screen.getByLabelText('Initial volume'), { target: { value: '9' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { envVolume: 9 });
    fireEvent.change(screen.getByLabelText('Envelope direction'), { target: { value: 'up' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { envDirection: 'up' });
    fireEvent.change(screen.getByLabelText('Envelope period'), { target: { value: '5' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { envPeriod: 5 });
    fireEvent.change(screen.getByLabelText('Sweep period'), { target: { value: '2' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { sweepPeriod: 2 });
    fireEvent.change(screen.getByLabelText('Sweep direction'), { target: { value: 'up' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { sweepDirection: 'up' });
    fireEvent.change(screen.getByLabelText('Sweep shift'), { target: { value: '4' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(3, { sweepShift: 4 });
  });

  it('edits a wave instrument: waveform, shapes, output level', () => {
    const p = setup(4);
    expect(screen.getByText(/plays on the Wave channel/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Duty cycle')).not.toBeInTheDocument();
    const canvas = screen.getByTestId('wave-editor');
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(320, 128));
    fireEvent.mouseDown(canvas, { clientX: 15, clientY: 0 });
    expect(p.onWaveStrokeStart).toHaveBeenCalled();
    expect(p.onSetWaveSample).toHaveBeenCalledWith(4, 1, 15);
    for (const shape of ['Triangle', 'Saw', 'Square', 'Sine']) {
      fireEvent.click(screen.getByText(shape));
      expect(p.onUpdate).toHaveBeenLastCalledWith(4, { wave: expect.any(Array) });
    }
    fireEvent.change(screen.getByLabelText('Output level'), { target: { value: '3' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(4, { waveLevel: 3 });
  });

  it('edits a noise instrument: width and envelope', () => {
    const p = setup(8);
    expect(screen.getByText(/the note sets the noise pitch/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Noise width'), { target: { value: '0' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(8, { noiseWidth: 0 });
    fireEvent.change(screen.getByLabelText('Envelope period'), { target: { value: '1' } });
    expect(p.onUpdate).toHaveBeenLastCalledWith(8, { envPeriod: 1 });
    expect(screen.queryByLabelText('Sweep period')).not.toBeInTheDocument();
  });
});

describe('MusicToolbarContent', () => {
  function setup(overrides: Record<string, unknown> = {}) {
    const fns = Object.fromEntries(['onSelectPattern', 'onAddPattern', 'onRemovePattern', 'onPatternRowsChange', 'onManageInstruments', 'onTicksPerRowChange', 'onOrderListChange', 'onPlay', 'onStop', 'onUndo', 'onRedo', 'onLoad', 'onSave', 'onExportAsm', 'onExportC'].map((k) => [k, jest.fn()]));
    const props = {
      patterns: [createPattern('p0', 'Intro', 8), createPattern('p1', 'Verse', 8)], orderList: [0, 1, 0], selectedPatternIndex: 1, patternRows: 8,
      ticksPerRow: 6, orderIndex: 1, isPlaying: false, canUndo: true, canRedo: true, historyIndex: 1, ...fns, ...overrides,
    };
    render(<MusicToolbarContent {...(props as unknown as React.ComponentProps<typeof MusicToolbarContent>)} />);
    return props as typeof props & Record<string, jest.Mock>;
  }

  it('plays and stops', () => {
    const p = setup();
    fireEvent.click(screen.getByLabelText('Play'));
    expect(p.onPlay).toHaveBeenCalled();
  });

  it('shows Stop while playing and highlights the playing order position', () => {
    const p = setup({ isPlaying: true });
    fireEvent.click(screen.getByLabelText('Stop'));
    expect(p.onStop).toHaveBeenCalled();
    expect(screen.getByLabelText('Order position 1').closest('li')!.className).toContain('text-green-400');
    expect(screen.getByLabelText('Order position 0').closest('li')!.className).not.toContain('text-green-400');
  });

  it('manages patterns and rows', () => {
    const p = setup();
    expect(screen.getByLabelText('Pattern')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: '0' } });
    expect(p.onSelectPattern).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByText('Add'));
    expect(p.onAddPattern).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Delete'));
    expect(p.onRemovePattern).toHaveBeenCalledWith(1);
    fireEvent.change(screen.getByLabelText(/Rows/), { target: { value: '16' } });
    expect(p.onPatternRowsChange).toHaveBeenCalledWith(16);
  });

  it('disables Delete with a single pattern and Add at the limit', () => {
    setup({ patterns: [createPattern('p0', 'A', 4)] });
    expect(screen.getByText('Delete')).toBeDisabled();
  });

  it('shows and changes the speed', () => {
    const p = setup();
    expect(screen.getByText(/10.0 rows\/s/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Speed/), { target: { value: '3' } });
    expect(p.onTicksPerRowChange).toHaveBeenCalledWith(3);
  });

  it('edits the order list', () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText('Order position 2'), { target: { value: '1' } });
    expect(p.onOrderListChange).toHaveBeenLastCalledWith([0, 1, 1]);
    fireEvent.click(screen.getByLabelText('Remove order position 0'));
    expect(p.onOrderListChange).toHaveBeenLastCalledWith([1, 0]);
    fireEvent.click(screen.getByText('Add current pattern to order'));
    expect(p.onOrderListChange).toHaveBeenLastCalledWith([0, 1, 0, 1]);
  });

  it('cannot remove the last order entry or exceed the maximum length', () => {
    setup({ orderList: [0] });
    expect(screen.getByLabelText('Remove order position 0')).toBeDisabled();
  });

  it('disables adding to a full order list', () => {
    setup({ orderList: Array(128).fill(0) });
    expect(screen.getByText('Add current pattern to order')).toBeDisabled();
  });

  it('opens instruments and fires file actions', () => {
    const p = setup();
    for (const [label, fn] of [
      ['Instruments…', p.onManageInstruments], ['Load project', p.onLoad], ['Save project', p.onSave],
      ['Export RGBDS (.asm)', p.onExportAsm], ['Export C (.h)', p.onExportC],
    ] as const) {
      fireEvent.click(screen.getByText(label));
      expect(fn).toHaveBeenCalled();
    }
  });
});

describe('MusicInstructionsModal', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing when closed', () => {
    const { container } = render(<MusicInstructionsModal isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('closes, optionally persisting the preference', () => {
    const onClose = jest.fn();
    render(<MusicInstructionsModal isOpen onClose={onClose} />);
    expect(screen.getByText('Music Editor — How to Use')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Got it'));
    expect(shouldShowMusicInstructions()).toBe(true);
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(shouldShowMusicInstructions()).toBe(false);
  });
});
