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

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function useHistory<T>(
  initialState: T,
  options: UseHistoryOptions = {}
): UseHistoryReturn<T> {
  const { maxHistory = DEFAULT_MAX_HISTORY } = options;

  const [state, _setState] = useState<T>(initialState);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(1);

  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  const updateFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
    setHistoryIndex(past.current.length + 1);
  }, []);

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    _setState(prevState => {
      const newState = value instanceof Function ? value(prevState) : value;
      return newState;
    });
  }, []);

  const push = useCallback(() => {
    past.current.push(cloneDeep(state));
    if (past.current.length > maxHistory) {
      past.current.shift();
    }

    // Clear future on new checkpoint
    future.current = [];

    updateFlags();
  }, [state, maxHistory, updateFlags]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;

    const previousState = past.current.pop()!;
    future.current.push(cloneDeep(state));
    _setState(previousState);
    updateFlags();
  }, [state, updateFlags]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;

    const nextState = future.current.pop()!;
    past.current.push(cloneDeep(state));
    _setState(nextState);
    updateFlags();
  }, [state, updateFlags]);

  const clearHistory = useCallback(() => {
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
