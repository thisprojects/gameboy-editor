import { renderHook } from '@testing-library/react';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';

const fireKeyDown = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers });
  window.dispatchEvent(event);
};

describe('useUndoRedoShortcuts hook', () => {
  let onUndo: jest.Mock;
  let onRedo: jest.Mock;

  beforeEach(() => {
    onUndo = jest.fn();
    onRedo = jest.fn();
  });

  describe('undo shortcut (Ctrl+Z)', () => {
    it('should call onUndo when Ctrl+Z is pressed', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('z', { ctrlKey: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('should not call onUndo when Z is pressed without Ctrl', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('z');
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('should not call onUndo when Ctrl+Z+Shift is pressed', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('z', { ctrlKey: true, shiftKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });
  });

  describe('redo shortcut (Ctrl+Y)', () => {
    it('should call onRedo when Ctrl+Y is pressed', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('y', { ctrlKey: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('should not call onRedo when Y is pressed without Ctrl', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('y');
      expect(onRedo).not.toHaveBeenCalled();
    });
  });

  describe('enabled flag', () => {
    it('should not call onUndo when disabled', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo, enabled: false }));
      fireKeyDown('z', { ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('should not call onRedo when disabled', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo, enabled: false }));
      fireKeyDown('y', { ctrlKey: true });
      expect(onRedo).not.toHaveBeenCalled();
    });

    it('should be enabled by default', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('z', { ctrlKey: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should remove listener on unmount', () => {
      const { unmount } = renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      unmount();
      fireKeyDown('z', { ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('should update listener when callbacks change', () => {
      const onUndo1 = jest.fn();
      const onUndo2 = jest.fn();
      let currentUndo = onUndo1;

      const { rerender } = renderHook(() =>
        useUndoRedoShortcuts({ onUndo: currentUndo, onRedo })
      );

      currentUndo = onUndo2;
      rerender();

      fireKeyDown('z', { ctrlKey: true });
      expect(onUndo1).not.toHaveBeenCalled();
      expect(onUndo2).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple presses', () => {
    it('should call onUndo for each Ctrl+Z press', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('z', { ctrlKey: true });
      fireKeyDown('z', { ctrlKey: true });
      fireKeyDown('z', { ctrlKey: true });
      expect(onUndo).toHaveBeenCalledTimes(3);
    });

    it('should call onRedo for each Ctrl+Y press', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('y', { ctrlKey: true });
      fireKeyDown('y', { ctrlKey: true });
      expect(onRedo).toHaveBeenCalledTimes(2);
    });
  });

  describe('other keys', () => {
    it('should not call onUndo or onRedo for unrelated keys', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      fireKeyDown('a', { ctrlKey: true });
      fireKeyDown('s', { ctrlKey: true });
      fireKeyDown('Enter');
      expect(onUndo).not.toHaveBeenCalled();
      expect(onRedo).not.toHaveBeenCalled();
    });
  });
});

describe('useUndoRedoShortcuts - text fields and platform keys', () => {
  let onUndo: jest.Mock;
  let onRedo: jest.Mock;
  const setPlatform = (platform: string) => Object.defineProperty(navigator, 'platform', { value: platform, configurable: true });
  const originalPlatform = navigator.platform;

  beforeEach(() => {
    onUndo = jest.fn();
    onRedo = jest.fn();
  });
  afterEach(() => {
    setPlatform(originalPlatform);
    document.body.innerHTML = '';
  });

  /** Dispatch a key press from a freshly created element, so it bubbles up to window like a real one. */
  function pressIn(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
    document.body.appendChild(el);
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(event);
    return event;
  }
  const input = (type?: string) => {
    const el = document.createElement('input');
    if (type) el.type = type;
    return el;
  };

  it.each(['text', 'number', 'search', 'password'])('leaves Ctrl+Z to the browser inside a %s field (and does not cancel it)', (type) => {
    renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
    const event = pressIn(input(type), 'z', { ctrlKey: true });
    expect(onUndo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('leaves Ctrl+Z and Ctrl+Y alone in a textarea and an editable element', () => {
    renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
    pressIn(document.createElement('textarea'), 'z', { ctrlKey: true });
    pressIn(document.createElement('textarea'), 'y', { ctrlKey: true });
    const editable = document.createElement('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    pressIn(editable, 'z', { ctrlKey: true });
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it.each(['checkbox', 'range', 'button'])('still undoes the drawing when focus is on a %s', (type) => {
    renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
    const el = type === 'button' ? document.createElement('button') : input(type);
    pressIn(el, 'z', { ctrlKey: true });
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('works from the page itself', () => {
    renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
    const event = pressIn(document.createElement('div'), 'z', { ctrlKey: true });
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('redoes with Ctrl+Shift+Z, where browsers report the key as an upper-case Z', () => {
    setPlatform('Win32');
    renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
    pressIn(document.createElement('div'), 'Z', { ctrlKey: true, shiftKey: true });
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });

  describe('on a Mac', () => {
    beforeEach(() => setPlatform('MacIntel'));

    it('undoes with Cmd+Z', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      pressIn(document.createElement('div'), 'z', { metaKey: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('redoes with Cmd+Shift+Z even though the key is reported as Z', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      pressIn(document.createElement('div'), 'Z', { metaKey: true, shiftKey: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
      expect(onUndo).not.toHaveBeenCalled();
    });

    it('does not treat Ctrl+Z as undo', () => {
      renderHook(() => useUndoRedoShortcuts({ onUndo, onRedo }));
      pressIn(document.createElement('div'), 'z', { ctrlKey: true });
      expect(onUndo).not.toHaveBeenCalled();
    });
  });
});

