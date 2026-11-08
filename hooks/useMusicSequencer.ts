import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useHistory } from './useHistory';
import { useEditStream } from './useEditStream';
import { InstrumentKind, MusicCell, MusicInstrument, MusicProjectData, NOTE_OFF, NoteName } from '@/types/music';
import {
  CHANNEL_KINDS,
  DEFAULT_OCTAVE,
  DEFAULT_PATTERN_ROWS,
  DEFAULT_TICKS_PER_ROW,
  FRAME_RATE,
  MAX_INSTRUMENTS,
  MAX_OCTAVE,
  MAX_ORDER_LENGTH,
  MAX_PATTERN_ROWS,
  MAX_PATTERNS,
  MAX_TICKS_PER_ROW,
  MIN_OCTAVE,
  MIN_PATTERN_ROWS,
  MUSIC_CHANNELS,
} from '@/constants/music';
import { PRESET_INSTRUMENTS } from '@/constants/musicPresets';
import { GbApuEmulator } from '@/utils/gbApuEmulator';
import { cellWrites, createInstrument, createPattern, emptyCell, initWrites, offWrites, rowWrites } from '@/utils/gbMusic';

type MusicState = Omit<MusicProjectData, 'version' | 'type'>;

const PREVIEW_MS = 600;

function initialState(): MusicState {
  return {
    patterns: [createPattern('p0', 'Pattern 0', DEFAULT_PATTERN_ROWS)],
    instruments: PRESET_INSTRUMENTS.map((preset, i) => ({ id: `i${i}`, ...preset, wave: [...preset.wave] })),
    orderList: [0],
    ticksPerRow: DEFAULT_TICKS_PER_ROW,
  };
}

/** Index of the first instrument of each channel's kind (falls back to 0). */
function defaultChannelInstruments(instruments: MusicInstrument[]): number[] {
  return CHANNEL_KINDS.map((kind) => Math.max(0, instruments.findIndex((i) => i.kind === kind)));
}

const nextId = (prefix: string, existing: { id: string }[]) => {
  let n = existing.length;
  while (existing.some((e) => e.id === `${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};

export function useMusicSequencer() {
  const {
    state,
    setState,
    push: pushHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
    historyIndex,
    clearHistory,
  } = useHistory<MusicState>(initialState());

  const [selectedPatternIndex, setSelectedPatternIndex] = useState(0);
  const [editingInstrumentIndex, setEditingInstrumentIndex] = useState(0);
  // The instrument each channel uses for new notes is remembered by id, not by number: instrument numbers
  // shift when one is deleted (and shift back on undo), ids do not, so the selection always follows its instrument.
  const [channelInstrumentIds, setChannelInstrumentIds] = useState<string[]>(() =>
    defaultChannelInstruments(state.instruments).map((i) => state.instruments[i].id)
  );
  const [channelOctave, setChannelOctaveState] = useState<number[]>([DEFAULT_OCTAVE, DEFAULT_OCTAVE, 3, DEFAULT_OCTAVE]);
  const [cursorRowState, setCursorRow] = useState(0);
  const [cursorChannel, setCursorChannel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingRow, setPlayingRow] = useState<number | null>(null);
  const [playingPatternIndex, setPlayingPatternIndex] = useState<number | null>(null);
  const [orderIndex, setOrderIndex] = useState(0);

  const chip = useRef<GbApuEmulator | null>(null);
  const timer = useRef<number | null>(null);
  const previewTimers = useRef<(number | null)[]>(Array(MUSIC_CHANNELS).fill(null));
  const play$ = useRef({ order: 0, row: 0, tick: 0 });
  // true between pressing Play and the audio being ready (see play())
  const starting = useRef(false);

  // Latest song for the playback timer, so edits are heard while playing.
  const songRef = useRef(state);
  useEffect(() => {
    songRef.current = state;
  }, [state]);

  const getChip = useCallback(() => {
    if (!chip.current) chip.current = new GbApuEmulator();
    return chip.current;
  }, []);

  const selectedPatternIdx = Math.min(selectedPatternIndex, state.patterns.length - 1);
  const selectedPattern = state.patterns[selectedPatternIdx];
  // The cursor can be left past the end of a shorter pattern (selecting one, undoing a resize): keep it on a real row
  const cursorRow = Math.min(cursorRowState, selectedPattern.rows - 1);

  const channelInstrument = useMemo(() => {
    const fallback = defaultChannelInstruments(state.instruments);
    return channelInstrumentIds.map((id, ch) => {
      const i = state.instruments.findIndex((inst) => inst.id === id && inst.kind === CHANNEL_KINDS[ch]);
      return i >= 0 ? i : fallback[ch];
    });
  }, [channelInstrumentIds, state.instruments]);

  // ---- cells ----
  const setCell = useCallback(
    (channel: number, row: number, update: Partial<MusicCell>) => {
      if (row < 0 || row >= selectedPattern.rows) return; // not a row of this pattern: nothing to edit (or undo)
      pushHistory();
      setState((prev) => ({
        ...prev,
        patterns: prev.patterns.map((p, pi) =>
          pi !== selectedPatternIdx
            ? p
            : { ...p, cells: p.cells.map((cells, ci) => (ci !== channel ? cells : cells.map((c, ri) => (ri === row ? { ...c, ...update } : c)))) }
        ),
      }));
    },
    [pushHistory, setState, selectedPatternIdx, selectedPattern.rows]
  );

  const clearCell = useCallback((channel: number, row: number) => setCell(channel, row, emptyCell()), [setCell]);

  /** Play a single cell through the emulator (for auditioning while editing). */
  const previewCell = useCallback(
    async (channel: number, cell: MusicCell, instruments: MusicInstrument[] = songRef.current.instruments) => {
      const c = getChip();
      await c.resume();
      c.writes(cellWrites(channel, cell, instruments));
      const pending = previewTimers.current[channel];
      if (pending !== null) window.clearTimeout(pending);
      previewTimers.current[channel] = window.setTimeout(() => {
        previewTimers.current[channel] = null;
        // while the song plays, the channel belongs to the song: switching it off would cut its note short
        if (timer.current === null && !starting.current) c.writes(offWrites(channel));
      }, PREVIEW_MS);
    },
    [getChip]
  );

  const enterNote = useCallback(
    (channel: number, row: number, note: NoteName, octaveOverride?: number) => {
      if (row < 0 || row >= selectedPattern.rows) return;
      const octave = octaveOverride ?? channelOctave[channel] ?? DEFAULT_OCTAVE;
      const instrument = channelInstrument[channel] ?? 0;
      setCell(channel, row, { note, octave, instrument, volume: null });
      void previewCell(channel, { note, octave, instrument, volume: null });
    },
    [setCell, channelOctave, channelInstrument, previewCell, selectedPattern.rows]
  );

  const enterNoteOff = useCallback((channel: number, row: number) => setCell(channel, row, { note: NOTE_OFF }), [setCell]);

  /**
   * Choose the instrument used for NEW notes entered on a channel. Notes already in the song are not changed
   * (edit those in the cell editor), so picking an instrument to try never rewrites a finished melody.
   */
  const setChannelInstrument = useCallback(
    (channel: number, instrumentIndex: number) => {
      const inst = state.instruments[instrumentIndex];
      if (inst) setChannelInstrumentIds((prev) => prev.map((v, i) => (i === channel ? inst.id : v)));
    },
    [state.instruments]
  );

  /** Choose the octave used for NEW notes entered on a channel; existing notes keep their own octave. */
  const setChannelOctave = useCallback((channel: number, octave: number) => {
    const clamped = Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, octave));
    setChannelOctaveState((prev) => prev.map((v, i) => (i === channel ? clamped : v)));
  }, []);

  // ---- patterns ----
  const addPattern = useCallback(() => {
    if (state.patterns.length >= MAX_PATTERNS) {
      alert(`A song can have at most ${MAX_PATTERNS} patterns.`);
      return;
    }
    pushHistory();
    setState((prev) => {
      const id = nextId('p', prev.patterns);
      return { ...prev, patterns: [...prev.patterns, createPattern(id, `Pattern ${prev.patterns.length}`, DEFAULT_PATTERN_ROWS)] };
    });
    setSelectedPatternIndex(state.patterns.length);
  }, [state.patterns.length, pushHistory, setState]);

  /** Remove a pattern: order entries using it are dropped and higher pattern indices shift down. */
  const removePattern = useCallback(
    (index: number) => {
      if (state.patterns.length <= 1 || index < 0 || index >= state.patterns.length) return;
      pushHistory();
      setState((prev) => {
        const orderList = prev.orderList.filter((o) => o !== index).map((o) => (o > index ? o - 1 : o));
        return { ...prev, patterns: prev.patterns.filter((_, i) => i !== index), orderList: orderList.length ? orderList : [0] };
      });
      setSelectedPatternIndex((s) => Math.max(0, s >= index ? s - 1 : s));
    },
    [state.patterns.length, pushHistory, setState]
  );

  /** Resize the selected pattern (content kept from the top). */
  const setPatternRows = useCallback(
    (rows: number) => {
      const r = Math.max(MIN_PATTERN_ROWS, Math.min(MAX_PATTERN_ROWS, Math.round(rows) || MIN_PATTERN_ROWS));
      pushHistory();
      setState((prev) => ({
        ...prev,
        patterns: prev.patterns.map((p, pi) =>
          pi !== selectedPatternIdx
            ? p
            : { ...p, rows: r, cells: p.cells.map((cells) => Array.from({ length: r }, (_, i) => cells[i] ?? emptyCell())) }
        ),
      }));
      setCursorRow((c) => Math.min(c, r - 1));
    },
    [pushHistory, setState, selectedPatternIdx]
  );

  const setOrderList = useCallback(
    (orderList: number[]) => {
      if (orderList.length < 1 || orderList.length > MAX_ORDER_LENGTH) return;
      pushHistory();
      setState((prev) => ({ ...prev, orderList }));
    },
    [pushHistory, setState]
  );

  const setTicksPerRow = useCallback(
    (ticks: number) => {
      pushHistory();
      setState((prev) => ({ ...prev, ticksPerRow: Math.max(1, Math.min(MAX_TICKS_PER_ROW, Math.round(ticks) || 1)) }));
    },
    [pushHistory, setState]
  );

  // ---- instruments ----
  const addInstrument = useCallback(
    (kind: InstrumentKind) => {
      if (state.instruments.length >= MAX_INSTRUMENTS) {
        alert(`A song can have at most ${MAX_INSTRUMENTS} instruments.`);
        return;
      }
      pushHistory();
      setState((prev) => {
        const id = nextId('i', prev.instruments);
        return { ...prev, instruments: [...prev.instruments, createInstrument(id, `${kind} ${prev.instruments.length}`, kind)] };
      });
      setEditingInstrumentIndex(state.instruments.length);
    },
    [state.instruments.length, pushHistory, setState]
  );

  /** An instrument can be removed unless it is the last one of its kind (a channel needs something to play). */
  const canRemoveInstrument = useCallback(
    (index: number) => {
      const inst = state.instruments[index];
      return !!inst && state.instruments.filter((i) => i.kind === inst.kind).length > 1;
    },
    [state.instruments]
  );

  /**
   * Remove an instrument. Higher instrument numbers shift down. Notes that used it, and channels that had it
   * selected, move to the first remaining instrument of the channel's kind so nothing falls silent.
   */
  const removeInstrument = useCallback(
    (index: number) => {
      if (!canRemoveInstrument(index)) return;
      const remaining = state.instruments.filter((_, i) => i !== index);
      const firstOfKind = (channel: number) => Math.max(0, remaining.findIndex((i) => i.kind === CHANNEL_KINDS[channel]));
      pushHistory();
      setState((prev) => ({
        ...prev,
        instruments: prev.instruments.filter((_, i) => i !== index),
        patterns: prev.patterns.map((p) => ({
          ...p,
          cells: p.cells.map((cells, ch) =>
            cells.map((c) =>
              c.instrument === null ? c : c.instrument === index ? { ...c, instrument: firstOfKind(ch) } : c.instrument > index ? { ...c, instrument: c.instrument - 1 } : c
            )
          ),
        })),
      }));
      setEditingInstrumentIndex((e) => Math.max(0, e >= index ? e - 1 : e));
      // (channels that had it selected fall back to the first instrument of their kind, see channelInstrument)
    },
    [state.instruments, canRemoveInstrument, pushHistory, setState]
  );

  const [pushHistoryOnce, resetEditStream] = useEditStream(pushHistory); // dragging a slider or typing a name is one undo step
  const undo = useCallback(() => {
    resetEditStream(); // an edit right after an undo must get its own undo step
    undoHistory();
  }, [resetEditStream, undoHistory]);
  const redo = useCallback(() => {
    resetEditStream();
    redoHistory();
  }, [resetEditStream, redoHistory]);

  const updateInstrument = useCallback(
    (index: number, update: Partial<MusicInstrument>) => {
      pushHistoryOnce(`instrument:${index}:${Object.keys(update).sort().join(',')}`);
      setState((prev) => ({ ...prev, instruments: prev.instruments.map((inst, i) => (i === index ? { ...inst, ...update } : inst)) }));
    },
    [pushHistoryOnce, setState]
  );

  /** Set one of the 32 wave samples (value 0-15). Does not push history, so a drag can be one undo step. */
  const setWaveSample = useCallback(
    (index: number, step: number, value: number) => {
      const v = Math.max(0, Math.min(15, Math.round(value)));
      setState((prev) => ({
        ...prev,
        instruments: prev.instruments.map((inst, i) => {
          if (i !== index || inst.wave[step] === undefined || inst.wave[step] === v) return inst;
          const wave = [...inst.wave];
          wave[step] = v;
          return { ...inst, wave };
        }),
      }));
    },
    [setState]
  );

  /** Audition an instrument on the channel matching its kind (C-4, or C-3 for wave). */
  const previewInstrument = useCallback(
    (index: number) => {
      const inst = songRef.current.instruments[index];
      if (!inst) return;
      const channel = CHANNEL_KINDS.indexOf(inst.kind);
      void previewCell(channel, { note: 'C', octave: inst.kind === 'wave' ? 3 : 4, instrument: index, volume: null });
    },
    [previewCell]
  );

  const loadMusicData = useCallback(
    (data: MusicState) => {
      clearHistory();
      resetEditStream();
      setState(data);
      setSelectedPatternIndex(0);
      setEditingInstrumentIndex(0);
      setChannelInstrumentIds(defaultChannelInstruments(data.instruments).map((i) => data.instruments[i].id));
      setCursorRow(0);
      setOrderIndex(0);
    },
    [clearHistory, setState, resetEditStream]
  );

  // ---- playback: one tick per 1/60 s, like calling the exported player once per frame ----
  // `starting` (above) covers the moment between pressing Play and the audio context being ready, so a second
  // click cannot start a second timer and Stop can cancel a start that has not finished.
  const clearPreviewTimers = () => {
    previewTimers.current.forEach((t, i) => {
      if (t !== null) window.clearTimeout(t);
      previewTimers.current[i] = null;
    });
  };

  const stop = useCallback(() => {
    starting.current = false;
    clearPreviewTimers();
    setIsPlaying(false);
    setPlayingRow(null);
    setPlayingPatternIndex(null);
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    chip.current?.silence();
  }, []);

  const play = useCallback(async () => {
    if (timer.current !== null || starting.current) return;
    starting.current = true;
    setIsPlaying(true);
    const c = getChip();
    try {
      await c.resume();
    } catch {
      starting.current = false;
      setIsPlaying(false);
      return;
    }
    if (!starting.current) return; // Stop was pressed while the audio was starting
    starting.current = false;
    clearPreviewTimers(); // the song takes over every channel
    c.writes(initWrites());
    play$.current = { order: 0, row: 0, tick: 0 };

    timer.current = window.setInterval(() => {
      const song = songRef.current;
      const ps = play$.current;
      if (ps.tick === 0) {
        if (ps.order >= song.orderList.length) ps.order = 0;
        const patternIndex = song.orderList[ps.order];
        const pattern = song.patterns[patternIndex] ?? song.patterns[0];
        if (ps.row >= pattern.rows) ps.row = 0;
        c.writes(rowWrites(pattern, ps.row, song.instruments));
        setPlayingRow(ps.row);
        setPlayingPatternIndex(patternIndex);
        setOrderIndex(ps.order);
        ps.tick = song.ticksPerRow;
        ps.row++;
        if (ps.row >= pattern.rows) {
          ps.row = 0;
          ps.order = (ps.order + 1) % song.orderList.length;
        }
      }
      ps.tick--;
    }, 1000 / FRAME_RATE);
  }, [getChip]);

  useEffect(() => {
    const timers = previewTimers.current;
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timers.forEach((t) => t !== null && window.clearTimeout(t));
      chip.current?.close();
    };
  }, []);

  return {
    patterns: state.patterns,
    instruments: state.instruments,
    orderList: state.orderList,
    ticksPerRow: state.ticksPerRow,
    selectedPattern,
    selectedPatternIndex: selectedPatternIdx,
    setSelectedPatternIndex,
    editingInstrumentIndex,
    setEditingInstrumentIndex,
    channelInstrument,
    setChannelInstrument,
    channelOctave,
    setChannelOctave,
    cursorRow,
    setCursorRow,
    cursorChannel,
    setCursorChannel,
    isPlaying,
    playingRow,
    playingPatternIndex,
    orderIndex,
    play,
    stop,
    setCell,
    clearCell,
    enterNote,
    enterNoteOff,
    previewCell,
    previewInstrument,
    addPattern,
    removePattern,
    setPatternRows,
    addInstrument,
    removeInstrument,
    canRemoveInstrument,
    updateInstrument,
    setWaveSample,
    setOrderList,
    setTicksPerRow,
    loadMusicData,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
  };
}

