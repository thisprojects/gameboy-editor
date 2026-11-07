import { useCallback, useRef } from 'react';

/** Edits of the same thing closer together than this (in ms) share one undo step. */
export const EDIT_STREAM_MS = 800;

/**
 * For edits that arrive as a stream - dragging a slider, typing in a field - so that the whole stream is one
 * undo step instead of one per event. Call the returned function before each change with a key naming
 * what is being edited; history is only pushed when the key changes or the stream has paused.
 * Returns [pushOnce, reset]: call reset after undo, redo or loading, so the next edit gets its own undo step.
 */
export function useEditStream(pushHistory: () => void) {
  const last = useRef({ key: '', time: 0 });
  const pushOnce = useCallback(
    (key: string) => {
      const now = Date.now();
      const sameStream = last.current.key === key && now - last.current.time < EDIT_STREAM_MS;
      last.current = { key, time: now };
      if (!sameStream) pushHistory();
    },
    [pushHistory]
  );
  const reset = useCallback(() => {
    last.current = { key: '', time: 0 };
  }, []);
  return [pushOnce, reset] as const;
}
