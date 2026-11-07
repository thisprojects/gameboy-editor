import { renderHook, act } from '@testing-library/react';
import { useMusicSequencer } from '@/hooks/useMusicSequencer';
import { cellWrites, createPattern, initWrites, offWrites, rowWrites, silenceWrites } from '@/utils/gbMusic';
import { RegWrite } from '@/types/music';
import { REG } from '@/constants/music';

const mockChips: { writes: jest.Mock; resume: jest.Mock; silence: jest.Mock; close: jest.Mock }[] = [];
let mockResume: () => Promise<void> = () => Promise.resolve();
jest.mock('@/utils/gbApuEmulator', () => ({
  GbApuEmulator: class {
    writes = jest.fn();
    resume = jest.fn(() => mockResume());
    silence = jest.fn();
    close = jest.fn();
    constructor() {
      mockChips.push(this);
    }
  },
}));

const lastChip = () => mockChips[mockChips.length - 1];
const writtenBatches = () => lastChip().writes.mock.calls.map((c) => c[0] as RegWrite[]);

describe('useMusicSequencer', () => {
  beforeEach(() => {
    mockChips.length = 0;
    mockResume = () => Promise.resolve();
    jest.useFakeTimers();
    (global.alert as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('starts with one 32-row pattern, preset instruments and per-channel defaults', () => {
    const { result } = renderHook(() => useMusicSequencer());
    expect(result.current.patterns).toHaveLength(1);
    expect(result.current.selectedPattern.rows).toBe(32);
    expect(result.current.selectedPattern.cells).toHaveLength(4);
    expect(result.current.instruments.length).toBe(9);
    expect(result.current.channelInstrument).toEqual([0, 0, 4, 6]);
    expect(result.current.channelOctave).toEqual([4, 4, 3, 4]);
    expect(result.current.orderList).toEqual([0]);
    expect(result.current.ticksPerRow).toBe(6);
  });

  it('enters notes, sounding them through the emulator', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    await act(async () => result.current.enterNote(0, 0, 'C'));
    expect(result.current.selectedPattern.cells[0][0]).toMatchObject({ note: 'C', octave: 4, instrument: 0 });
    expect(writtenBatches()[0].map((w) => w.addr)).toEqual([REG.NR10, REG.NR11, REG.NR12, REG.NR13, REG.NR14]);
    await act(async () => result.current.enterNote(2, 3, 'A', 5));
    expect(result.current.selectedPattern.cells[2][3]).toMatchObject({ note: 'A', octave: 5, instrument: 4 });
  });

  it('silences a previewed channel after a short time and restarts the timer on a new note', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    await act(async () => result.current.enterNote(0, 0, 'C'));
    act(() => jest.advanceTimersByTime(300));
    await act(async () => result.current.enterNote(0, 1, 'D'));
    act(() => jest.advanceTimersByTime(300));
    expect(writtenBatches().filter((b) => b.length === 1 && b[0].addr === REG.NR12)).toHaveLength(0);
    act(() => jest.advanceTimersByTime(400));
    expect(writtenBatches().some((b) => b.length === 1 && b[0].addr === REG.NR12 && b[0].value === 0)).toBe(true);
  });

  it('edits cells: note off, set, clear, undo', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.enterNoteOff(1, 2));
    expect(result.current.selectedPattern.cells[1][2].note).toBe('OFF');
    act(() => result.current.setCell(1, 2, { volume: 5 }));
    expect(result.current.selectedPattern.cells[1][2].volume).toBe(5);
    act(() => result.current.clearCell(1, 2));
    expect(result.current.selectedPattern.cells[1][2]).toMatchObject({ note: null, volume: null });
    act(() => result.current.undo());
    expect(result.current.selectedPattern.cells[1][2].volume).toBe(5);
  });

  it('choosing a channel instrument only affects notes entered afterwards', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    await act(async () => result.current.enterNote(0, 0, 'C'));
    act(() => result.current.setChannelInstrument(0, 2));
    expect(result.current.channelInstrument[0]).toBe(2);
    expect(result.current.selectedPattern.cells[0][0].instrument).toBe(0); // the existing note is untouched
    expect(result.current.canUndo).toBe(true); // (only from entering the note: choosing is not an edit of the song)
    act(() => result.current.undo());
    await act(async () => result.current.enterNote(0, 1, 'D'));
    expect(result.current.selectedPattern.cells[0][1].instrument).toBe(2);
  });

  it('choosing a channel octave only affects notes entered afterwards, and clamps to 2..7', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    await act(async () => result.current.enterNote(1, 0, 'C')); // a melody note at octave 4
    act(() => result.current.setChannelOctave(1, 6));
    expect(result.current.channelOctave[1]).toBe(6);
    expect(result.current.selectedPattern.cells[1][0].octave).toBe(4); // not flattened to the new octave
    await act(async () => result.current.enterNote(1, 1, 'C'));
    expect(result.current.selectedPattern.cells[1][1].octave).toBe(6);
    act(() => result.current.setChannelOctave(1, 99));
    expect(result.current.channelOctave[1]).toBe(7);
    act(() => result.current.setChannelOctave(1, -4));
    expect(result.current.channelOctave[1]).toBe(2);
  });

  it('picking an instrument or octave does not add undo steps', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.setChannelInstrument(0, 1));
    act(() => result.current.setChannelOctave(0, 5));
    expect(result.current.canUndo).toBe(false);
  });

  it('adds and selects patterns up to the limit', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.addPattern());
    expect(result.current.patterns).toHaveLength(2);
    expect(result.current.selectedPatternIndex).toBe(1);
    for (let i = 0; i < 62; i++) act(() => result.current.addPattern());
    expect(result.current.patterns).toHaveLength(64);
    act(() => result.current.addPattern());
    expect(global.alert).toHaveBeenCalledTimes(1);
    expect(result.current.patterns).toHaveLength(64);
  });

  it('removes a pattern, fixing the order list and selection', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.addPattern());
    act(() => result.current.addPattern());
    act(() => result.current.setOrderList([0, 1, 2, 1, 2]));
    act(() => result.current.removePattern(1));
    expect(result.current.patterns.map((p) => p.id)).toEqual(['p0', 'p2']);
    expect(result.current.orderList).toEqual([0, 1, 1]);
    expect(result.current.selectedPatternIndex).toBe(1);
    act(() => result.current.removePattern(5)); // out of range
    expect(result.current.patterns).toHaveLength(2);
    act(() => result.current.removePattern(0));
    expect(result.current.orderList).toEqual([0, 0]);
    act(() => result.current.removePattern(0)); // last one stays
    expect(result.current.patterns).toHaveLength(1);
  });

  it('resets the order to [0] when every entry used the removed pattern', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.addPattern());
    act(() => result.current.setOrderList([1, 1]));
    act(() => result.current.removePattern(1));
    expect(result.current.orderList).toEqual([0]);
  });

  it('resizes the selected pattern, keeping content and the cursor in range', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    await act(async () => result.current.enterNote(0, 1, 'C'));
    act(() => result.current.setCursorRow(20));
    act(() => result.current.setPatternRows(8));
    expect(result.current.selectedPattern.rows).toBe(8);
    expect(result.current.selectedPattern.cells[0]).toHaveLength(8);
    expect(result.current.selectedPattern.cells[0][1].note).toBe('C');
    expect(result.current.cursorRow).toBe(7);
    act(() => result.current.setPatternRows(2));
    expect(result.current.selectedPattern.rows).toBe(4);
    act(() => result.current.setPatternRows(500));
    expect(result.current.selectedPattern.rows).toBe(128);
    act(() => result.current.setPatternRows(NaN));
    expect(result.current.selectedPattern.rows).toBe(4);
    act(() => result.current.setPatternRows(16));
    expect(result.current.selectedPattern.cells[3]).toHaveLength(16);
  });

  it('sets order list and speed within limits', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.setOrderList([]));
    act(() => result.current.setOrderList(Array(129).fill(0)));
    expect(result.current.orderList).toEqual([0]);
    act(() => result.current.setOrderList([0, 0, 0]));
    expect(result.current.orderList).toEqual([0, 0, 0]);
    act(() => result.current.setTicksPerRow(3));
    expect(result.current.ticksPerRow).toBe(3);
    act(() => result.current.setTicksPerRow(0));
    expect(result.current.ticksPerRow).toBe(1);
    act(() => result.current.setTicksPerRow(999));
    expect(result.current.ticksPerRow).toBe(255);
    act(() => result.current.setTicksPerRow(NaN));
    expect(result.current.ticksPerRow).toBe(1);
  });

  it('adds instruments of each kind up to the limit and selects the new one', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.addInstrument('wave'));
    expect(result.current.instruments).toHaveLength(10);
    expect(result.current.instruments[9].kind).toBe('wave');
    expect(result.current.editingInstrumentIndex).toBe(9);
    for (let i = 0; i < 22; i++) act(() => result.current.addInstrument('noise'));
    expect(result.current.instruments).toHaveLength(32);
    act(() => result.current.addInstrument('pulse'));
    expect(global.alert).toHaveBeenCalledTimes(1);
    expect(new Set(result.current.instruments.map((i) => i.id)).size).toBe(32);
  });

  it('removes an instrument, remapping cells and channel selections', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    await act(async () => result.current.enterNote(0, 0, 'C')); // instrument 0
    act(() => result.current.setCell(0, 1, { note: 'D', instrument: 3 }));
    act(() => result.current.setCell(1, 0, { note: 'E', instrument: 1 }));
    act(() => result.current.setEditingInstrumentIndex(5));
    act(() => result.current.removeInstrument(1));
    expect(result.current.instruments).toHaveLength(8);
    expect(result.current.selectedPattern.cells[0][0].instrument).toBe(0);
    expect(result.current.selectedPattern.cells[0][1].instrument).toBe(2); // shifted down
    expect(result.current.selectedPattern.cells[1][0].instrument).toBe(0); // used the removed one: moves to the first pulse instrument
    expect(result.current.editingInstrumentIndex).toBe(4);
    expect(result.current.channelInstrument).toEqual([0, 0, 3, 5]);
    act(() => result.current.removeInstrument(99));
    expect(result.current.instruments).toHaveLength(8);
  });

  it('a channel whose instrument is removed moves to an instrument of its own kind, never a different kind', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    // channel 2 (wave) has instrument 4 selected; instrument 3 (before it) is a pulse instrument
    act(() => result.current.setCell(2, 0, { note: 'C', octave: 3, instrument: 4 }));
    act(() => result.current.removeInstrument(4));
    const wave = result.current.channelInstrument[2];
    expect(result.current.instruments[wave].kind).toBe('wave');
    expect(result.current.instruments[result.current.selectedPattern.cells[2][0].instrument!].kind).toBe('wave');
    // so a new note on that channel still makes sound
    await act(async () => result.current.enterNote(2, 1, 'C'));
    expect(cellWrites(2, result.current.selectedPattern.cells[2][1], result.current.instruments).length).toBeGreaterThan(0);
  });

  it('never removes the last instrument of a kind (a channel always has something to play)', () => {
    const { result } = renderHook(() => useMusicSequencer());
    for (let n = 0; n < 20; n++) {
      const removable = result.current.instruments.findIndex((_, i) => result.current.canRemoveInstrument(i));
      if (removable < 0) break;
      act(() => result.current.removeInstrument(removable));
    }
    expect(result.current.instruments.map((i) => i.kind).sort()).toEqual(['noise', 'pulse', 'wave']);
    expect(result.current.canRemoveInstrument(0)).toBe(false);
    expect(result.current.canRemoveInstrument(99)).toBe(false);
    act(() => result.current.removeInstrument(0));
    expect(result.current.instruments).toHaveLength(3);
  });

  it('updates instruments and wave samples (a drag is a single undo step)', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.updateInstrument(0, { name: 'Renamed', duty: 3 }));
    expect(result.current.instruments[0]).toMatchObject({ name: 'Renamed', duty: 3 });
    act(() => result.current.pushHistory());
    act(() => result.current.setWaveSample(4, 0, 3));
    act(() => result.current.setWaveSample(4, 1, 99));
    act(() => result.current.setWaveSample(4, 2, -5));
    act(() => result.current.setWaveSample(4, 2, 0)); // unchanged
    act(() => result.current.setWaveSample(4, 99, 3)); // out of range
    expect(result.current.instruments[4].wave.slice(0, 3)).toEqual([3, 15, 0]);
    act(() => result.current.undo());
    expect(result.current.instruments[4].wave.slice(0, 3)).toEqual([0, 1, 2]);
  });

  it('a stream of edits to one instrument setting is a single undo step', () => {
    const { result } = renderHook(() => useMusicSequencer());
    for (const v of [1, 2, 3, 4, 5]) act(() => result.current.updateInstrument(0, { envVolume: v }));
    expect(result.current.instruments[0].envVolume).toBe(5);
    act(() => result.current.undo());
    expect(result.current.instruments[0].envVolume).toBe(15); // back to the value before the whole stream
    expect(result.current.canUndo).toBe(false);
  });

  it('edits of different settings, other instruments, or after a pause are separate undo steps', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.updateInstrument(0, { envVolume: 7 }));
    act(() => result.current.updateInstrument(0, { duty: 1 })); // another setting
    act(() => result.current.updateInstrument(1, { duty: 3 })); // another instrument
    act(() => { jest.advanceTimersByTime(1000); });
    act(() => result.current.updateInstrument(1, { duty: 0 })); // the same thing, but after a pause
    act(() => result.current.undo());
    expect(result.current.instruments[1].duty).toBe(3);
    act(() => result.current.undo());
    expect(result.current.instruments[1].duty).toBe(1);
    act(() => result.current.undo());
    expect(result.current.instruments[0].duty).toBe(2);
    act(() => result.current.undo());
    expect(result.current.instruments[0].envVolume).toBe(15);
  });

  it('previews an instrument on its own channel, with wave one octave lower', async () => {
    const { result } = renderHook(() => useMusicSequencer());
    await act(async () => result.current.previewInstrument(4)); // Wave Bass
    expect(writtenBatches()[0]).toEqual(cellWrites(2, { note: 'C', octave: 3, instrument: 4, volume: null }, result.current.instruments));
    await act(async () => result.current.previewInstrument(7)); // Snare
    expect(writtenBatches()[1]).toEqual(cellWrites(3, { note: 'C', octave: 4, instrument: 7, volume: null }, result.current.instruments));
    await act(async () => result.current.previewInstrument(99));
    expect(writtenBatches()).toHaveLength(2);
  });

  it('loads music data, resetting the editor state and history', () => {
    const { result } = renderHook(() => useMusicSequencer());
    act(() => result.current.setCell(0, 0, { note: 'C', instrument: 0 }));
    const pattern = createPattern('x', 'X', 8);
    act(() =>
      result.current.loadMusicData({
        patterns: [pattern],
        instruments: result.current.instruments.slice(4),
        orderList: [0],
        ticksPerRow: 2,
      })
    );
    expect(result.current.patterns[0].id).toBe('x');
    expect(result.current.instruments).toHaveLength(5);
    expect(result.current.channelInstrument).toEqual([0, 0, 0, 2]); // first of each kind, falling back to 0
    expect(result.current.ticksPerRow).toBe(2);
    expect(result.current.canUndo).toBe(false);
  });

  describe('playback', () => {
    const FRAME = 1000 / 60;

    async function startWithRows(result: { current: ReturnType<typeof useMusicSequencer> }) {
      act(() => result.current.setPatternRows(4));
      act(() => result.current.setTicksPerRow(2));
      act(() => result.current.setCell(0, 0, { note: 'C', octave: 4, instrument: 0 }));
      act(() => result.current.setCell(0, 2, { note: 'OFF' }));
      await act(async () => {
        await result.current.play();
      });
    }

    it('powers the chip on, then plays one row per speed-many frames', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      await startWithRows(result);
      expect(result.current.isPlaying).toBe(true);
      expect(writtenBatches()[0]).toEqual(initWrites());
      const pattern = result.current.selectedPattern;
      const instruments = result.current.instruments;

      act(() => jest.advanceTimersByTime(FRAME)); // frame 0: row 0
      expect(writtenBatches()[1]).toEqual(rowWrites(pattern, 0, instruments));
      expect(result.current.playingRow).toBe(0);
      expect(result.current.playingPatternIndex).toBe(0);
      act(() => jest.advanceTimersByTime(FRAME)); // frame 1: still row 0 (2 frames per row)
      expect(writtenBatches()).toHaveLength(2);
      act(() => jest.advanceTimersByTime(FRAME)); // frame 2: row 1 (empty)
      expect(result.current.playingRow).toBe(1);
      act(() => jest.advanceTimersByTime(FRAME * 2)); // row 2: note off
      expect(writtenBatches().some((b) => b.length === 1 && b[0].addr === REG.NR12 && b[0].value === 0)).toBe(true);
    });

    it('loops at the end of the order list', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      await startWithRows(result);
      act(() => jest.advanceTimersByTime(FRAME * 8)); // 4 rows x 2 frames = one full pass
      const triggersBefore = writtenBatches().filter((b) => b.length === 5).length;
      expect(triggersBefore).toBe(1);
      act(() => jest.advanceTimersByTime(FRAME * 2)); // row 0 again
      expect(writtenBatches().filter((b) => b.length === 5)).toHaveLength(2);
      expect(result.current.playingRow).toBe(0);
    });

    it('follows the order list across patterns', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setPatternRows(4));
      act(() => result.current.setTicksPerRow(1));
      act(() => result.current.addPattern());
      act(() => result.current.setPatternRows(4));
      act(() => result.current.setOrderList([0, 1]));
      await act(async () => {
        await result.current.play();
      });
      act(() => jest.advanceTimersByTime(FRAME * 5)); // frames 0-4: pattern 0 rows 0-3, then pattern 1 row 0
      expect(result.current.playingPatternIndex).toBe(1);
      expect(result.current.orderIndex).toBe(1);
      act(() => jest.advanceTimersByTime(FRAME * 4));
      expect(result.current.playingPatternIndex).toBe(0);
    });

    it('hears edits made while playing', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      await startWithRows(result);
      act(() => result.current.setCell(1, 1, { note: 'G', octave: 3, instrument: 1 }));
      act(() => jest.advanceTimersByTime(FRAME * 3)); // reaches row 1
      expect(writtenBatches().some((b) => b.some((w) => w.addr === REG.NR21))).toBe(true);
    });

    it('stop silences the chip and clears the playing state; play is not re-entrant', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      await startWithRows(result);
      await act(async () => {
        await result.current.play(); // second call is ignored
      });
      act(() => jest.advanceTimersByTime(FRAME));
      act(() => result.current.stop());
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.playingRow).toBeNull();
      expect(result.current.playingPatternIndex).toBeNull();
      expect(lastChip().silence).toHaveBeenCalled();
      const calls = lastChip().writes.mock.calls.length;
      act(() => jest.advanceTimersByTime(FRAME * 10));
      expect(lastChip().writes.mock.calls.length).toBe(calls);
      expect(mockChips).toHaveLength(1);
    });

    /** The register writes of row 0, and how many times they have been sent to the chip so far. */
    function row0(result: { current: ReturnType<typeof useMusicSequencer> }) {
      act(() => result.current.setCell(0, 0, { note: 'C', octave: 4, instrument: 0 }));
      const expected = rowWrites(result.current.selectedPattern, 0, result.current.instruments);
      const sent = () => writtenBatches().filter((b) => JSON.stringify(b) === JSON.stringify(expected)).length;
      return { sent, total: () => lastChip().writes.mock.calls.length };
    }
    it('clicking Play twice quickly starts only one player', async () => {
      mockResume = () => new Promise((r) => setTimeout(r, 50));
      const { result } = renderHook(() => useMusicSequencer());
      const { sent, total } = row0(result);
      let first: Promise<void> = Promise.resolve();
      let second: Promise<void> = Promise.resolve();
      act(() => {
        first = result.current.play();
        second = result.current.play();
      });
      expect(result.current.isPlaying).toBe(true); // the button already shows Stop
      await act(async () => {
        jest.advanceTimersByTime(60);
        await Promise.all([first, second]);
      });
      act(() => jest.advanceTimersByTime(FRAME));
      expect(sent()).toBe(1); // two players would have written the row twice
      expect(mockChips).toHaveLength(1);

      act(() => result.current.stop());
      const calls = total();
      act(() => jest.advanceTimersByTime(FRAME * 120));
      expect(total()).toBe(calls); // nothing is still playing after Stop
    });

    it('Stop pressed while the audio is still starting cancels the start', async () => {
      mockResume = () => new Promise((r) => setTimeout(r, 50));
      const { result } = renderHook(() => useMusicSequencer());
      row0(result);
      let started: Promise<void> = Promise.resolve();
      act(() => {
        started = result.current.play();
      });
      act(() => result.current.stop());
      await act(async () => {
        jest.advanceTimersByTime(60);
        await started;
      });
      act(() => jest.advanceTimersByTime(FRAME * 30));
      expect(result.current.isPlaying).toBe(false);
      expect(writtenBatches().flat().some((w) => w.addr === REG.NR52)).toBe(false); // the chip was never powered up
      expect(writtenBatches().flat().some((w) => w.addr === REG.NR14)).toBe(false); // and no note was played
    });

    it('can play again after a cancelled start', async () => {
      mockResume = () => new Promise((r) => setTimeout(r, 50));
      const { result } = renderHook(() => useMusicSequencer());
      const { sent } = row0(result);
      let p: Promise<void> = Promise.resolve();
      act(() => { p = result.current.play(); });
      act(() => result.current.stop());
      await act(async () => { jest.advanceTimersByTime(60); await p; });
      mockResume = () => Promise.resolve();
      await act(async () => { await result.current.play(); });
      act(() => jest.advanceTimersByTime(FRAME));
      expect(result.current.isPlaying).toBe(true);
      expect(sent()).toBe(1);
    });

    it('recovers when the audio cannot be started', async () => {
      mockResume = () => Promise.reject(new Error('blocked'));
      const { result } = renderHook(() => useMusicSequencer());
      const { sent } = row0(result);
      await act(async () => { await result.current.play(); });
      expect(result.current.isPlaying).toBe(false);
      act(() => jest.advanceTimersByTime(FRAME * 30));
      expect(sent()).toBe(0);
      mockResume = () => Promise.resolve();
      await act(async () => { await result.current.play(); });
      act(() => jest.advanceTimersByTime(FRAME));
      expect(result.current.isPlaying).toBe(true);
      expect(sent()).toBe(1);
    });

    it('stop before play is harmless', () => {
      const { result } = renderHook(() => useMusicSequencer());
      expect(() => act(() => result.current.stop())).not.toThrow();
    });

    it('closes the chip and clears timers on unmount', async () => {
      const { result, unmount } = renderHook(() => useMusicSequencer());
      await startWithRows(result);
      await act(async () => result.current.enterNote(0, 0, 'C')); // pending preview timer
      unmount();
      expect(lastChip().close).toHaveBeenCalled();
      expect(() => jest.advanceTimersByTime(2000)).not.toThrow();
    });

    it('a stale order position or row (song edited while playing) wraps safely', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setPatternRows(8));
      act(() => result.current.addPattern());
      act(() => result.current.setOrderList([0, 1, 1]));
      act(() => result.current.setTicksPerRow(1));
      await act(async () => {
        await result.current.play();
      });
      act(() => jest.advanceTimersByTime(FRAME * 9)); // into order position 1
      act(() => result.current.setOrderList([0]));
      act(() => jest.advanceTimersByTime(FRAME * 40));
      expect(result.current.isPlaying).toBe(true);
      expect(silenceWrites()).toHaveLength(4);
      expect(offWrites(0)).toHaveLength(1);
    });
  });
});

describe('useMusicSequencer - review fixes (round 2)', () => {
  beforeEach(() => {
    mockChips.length = 0;
    mockResume = () => Promise.resolve();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());
  const FRAME = 1000 / 60;

  describe('preview and playback', () => {
    it('the preview auto-off does not silence a note the song is playing', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setCell(0, 0, { note: 'C', octave: 4, instrument: 0 }));
      await act(async () => { await result.current.play(); });
      act(() => jest.advanceTimersByTime(FRAME * 2)); // row 0 sounds on channel 0
      await act(async () => result.current.enterNote(0, 10, 'G')); // previewing a note on the same channel
      lastChip().writes.mockClear();
      act(() => jest.advanceTimersByTime(700)); // longer than the preview
      const silencedChannel0 = writtenBatches().some((b) => b.some((w) => w.addr === REG.NR12 && w.value === 0));
      expect(silencedChannel0).toBe(false);
    });

    it('the preview still switches itself off when the song is not playing', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      await act(async () => result.current.enterNote(0, 0, 'C'));
      lastChip().writes.mockClear();
      act(() => jest.advanceTimersByTime(700));
      expect(writtenBatches().some((b) => b.some((w) => w.addr === REG.NR12 && w.value === 0))).toBe(true);
    });

    it('Stop cancels a pending preview, so its timer cannot write to the chip later', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      await act(async () => result.current.enterNote(0, 0, 'C')); // starts the 600 ms preview timer
      act(() => result.current.stop());
      lastChip().writes.mockClear();
      act(() => jest.advanceTimersByTime(700));
      expect(lastChip().writes).not.toHaveBeenCalled(); // without the fix this would write NR12 = 0
    });

    it('starting the song cancels pending previews too', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      // audition a note without putting it in the song, so the song stays empty
      await act(async () => result.current.previewCell(0, { note: 'C', octave: 4, instrument: 0, volume: null }));
      await act(async () => { await result.current.play(); });
      lastChip().writes.mockClear();
      act(() => jest.advanceTimersByTime(FRAME * 3)); // an empty song: it writes nothing itself
      act(() => jest.advanceTimersByTime(700));
      expect(writtenBatches().flat()).toEqual([]); // no register was written (the song's empty rows write nothing)
    });
  });

  describe('the undo step of an edit stream', () => {
    it('an edit right after an undo gets its own undo step', () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.updateInstrument(0, { envVolume: 5 }));
      act(() => result.current.undo());
      expect(result.current.instruments[0].envVolume).toBe(15);
      act(() => result.current.updateInstrument(0, { envVolume: 9 })); // same setting, well within 800 ms
      expect(result.current.canUndo).toBe(true);
      act(() => result.current.undo());
      expect(result.current.instruments[0].envVolume).toBe(15);
    });

    it('likewise after a redo', () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.updateInstrument(0, { envVolume: 5 }));
      act(() => result.current.undo());
      act(() => result.current.redo());
      expect(result.current.instruments[0].envVolume).toBe(5);
      act(() => result.current.updateInstrument(0, { envVolume: 6 }));
      act(() => result.current.undo());
      expect(result.current.instruments[0].envVolume).toBe(5);
    });

    it('and after loading a song', () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.updateInstrument(0, { envVolume: 5 }));
      act(() =>
        result.current.loadMusicData({
          patterns: result.current.patterns,
          instruments: result.current.instruments,
          orderList: [0],
          ticksPerRow: 6,
        })
      );
      act(() => result.current.updateInstrument(0, { envVolume: 7 }));
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe('cursor and rows', () => {
    it('the cursor row stays on a real row of a shorter pattern', () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setPatternRows(128));
      act(() => result.current.setCursorRow(100));
      expect(result.current.cursorRow).toBe(100);
      act(() => result.current.addPattern()); // a 32-row pattern is selected
      expect(result.current.selectedPattern.rows).toBe(32);
      expect(result.current.cursorRow).toBe(31);
      act(() => result.current.setSelectedPatternIndex(0)); // back to the long one: the cursor is where it was
      expect(result.current.cursorRow).toBe(100);
    });

    it('entering or editing a note on a row that does not exist does nothing: no sound, no undo step', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      await act(async () => result.current.enterNote(0, 500, 'C'));
      act(() => result.current.setCell(0, 32, { note: 'C' }));
      act(() => result.current.setCell(0, -1, { note: 'C' }));
      act(() => result.current.clearCell(0, 99));
      expect(result.current.canUndo).toBe(false);
      expect(mockChips).toHaveLength(0); // the audio was never even started
    });
  });

  describe('which instrument a channel uses for new notes', () => {
    it('undoing an instrument deletion brings the channel back to the instrument it had', async () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setChannelInstrument(0, 3)); // Zap
      act(() => result.current.removeInstrument(2)); // an earlier instrument: Zap moves to number 2
      expect(result.current.instruments[result.current.channelInstrument[0]].name).toBe('Zap');
      act(() => result.current.undo());
      expect(result.current.channelInstrument[0]).toBe(3);
      expect(result.current.instruments[3].name).toBe('Zap');
      await act(async () => result.current.enterNote(0, 0, 'C'));
      expect(result.current.selectedPattern.cells[0][0].instrument).toBe(3);
    });

    it('a channel follows its instrument when numbers shift, and falls back to its kind when it is removed', () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setChannelInstrument(2, 5)); // Wave Saw
      act(() => result.current.removeInstrument(0));
      expect(result.current.instruments[result.current.channelInstrument[2]].name).toBe('Wave Saw');
      act(() => result.current.removeInstrument(result.current.channelInstrument[2]));
      expect(result.current.instruments[result.current.channelInstrument[2]].kind).toBe('wave');
    });

    it('only accepts an instrument that exists', () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setChannelInstrument(0, 99));
      expect(result.current.channelInstrument[0]).toBe(0);
    });

    it('a stored selection of the wrong kind is replaced by the first instrument of the channel kind', () => {
      const { result } = renderHook(() => useMusicSequencer());
      act(() => result.current.setChannelInstrument(0, 4)); // a wave instrument on a pulse channel
      expect(result.current.instruments[result.current.channelInstrument[0]].kind).toBe('pulse');
    });
  });
});

