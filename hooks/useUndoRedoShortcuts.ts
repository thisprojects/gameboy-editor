import { useEffect } from 'react';

const TEXT_INPUT_TYPES = ['text', 'number', 'search', 'url', 'email', 'password', 'tel'];

/** True when the event came from somewhere the user types text. */
function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && TEXT_INPUT_TYPES.includes((el as HTMLInputElement).type);
}

interface UseUndoRedoShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  enabled?: boolean;
}

export function useUndoRedoShortcuts({
  onUndo,
  onRedo,
  enabled = true,
}: UseUndoRedoShortcutsProps): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // While typing in a text field (a file name, a number) the browser's own undo must work
      if (isTextEntry(e.target)) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase(); // Shift makes browsers report 'Z'

      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if (modifier && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z (Windows/Linux), Cmd+Shift+Z (Mac)
      if ((e.ctrlKey && key === 'y') || (modifier && key === 'z' && e.shiftKey)) {
        e.preventDefault();
        onRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUndo, onRedo, enabled]);
}
