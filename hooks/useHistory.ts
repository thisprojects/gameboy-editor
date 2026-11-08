import { useState, useRef, useCallback } from 'react';

interface UseHistoryOptions {
  maxHistory?: number;
}

interface UseHistoryReturn<T> {
  state: T;
  setState: (value: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  clearHistory: () => void;
  push: () => void;
}

const DEFAULT_MAX_HISTORY = 100;

/** Structural equality for plain JSON-like data (stops at the first difference). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/**
 * Undo/redo for a state that is only ever replaced, never mutated in place (every editor reducer copies
 * what it changes), so a checkpoint is just a reference: no deep clone, and unchanged parts are shared.
 * A checkpoint taken by `push()` is dropped again when the very next `setState` leaves the state unchanged
 * (e.g. a fill on an area that already has that value), so it never adds an empty undo step or wipes redo.
 */
export function useHistory<T>(
  initialState: T,
  options: UseHistoryOptions = {}
): UseHistoryReturn<T> {
  const { maxHistory = DEFAULT_MAX_HISTORY } = options;

  const [state, _setState] = useState<T>(initialState);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(1);

  const stateRef = useRef<T>(initialState);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  /** Set by push(); holds what to restore if the next setState turns out to be a no-op. */
  const pending = useRef<{ checkpoint: T; future: T[]; dropped: T | null } | null>(null);

  const updateFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
    setHistoryIndex(past.current.length + 1);
  }, []);

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    const prev = stateRef.current;
    const next = value instanceof Function ? value(prev) : value;
    const p = pending.current;
    pending.current = null;
    if (p && deepEqual(prev, next)) {
      // nothing changed: take the checkpoint back and keep the redo stack
      past.current.pop();
      if (p.dropped !== null) past.current.unshift(p.dropped);
      future.current = p.future;
      updateFlags();
      return;
    }
    stateRef.current = next;
    _setState(next);
  }, [updateFlags]);

  const push = useCallback(() => {
    const dropped = past.current.length >= maxHistory ? past.current.shift()! : null;
    past.current.push(stateRef.current);
    pending.current = { checkpoint: stateRef.current, future: future.current, dropped };
    // Clear future on new checkpoint
    future.current = [];
    updateFlags();
  }, [maxHistory, updateFlags]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    pending.current = null;
    const previousState = past.current.pop()!;
    future.current.push(stateRef.current);
    stateRef.current = previousState;
    _setState(previousState);
    updateFlags();
  }, [updateFlags]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    pending.current = null;
    const nextState = future.current.pop()!;
    past.current.push(stateRef.current);
    stateRef.current = nextState;
    _setState(nextState);
    updateFlags();
  }, [updateFlags]);

  const clearHistory = useCallback(() => {
    pending.current = null;
    past.current = [];
    future.current = [];
    updateFlags();
  }, [updateFlags]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    clearHistory,
    push,
  };
}
