import { renderHook, act } from '@testing-library/react';
import { useHistory } from '@/hooks/useHistory';

describe('useHistory hook', () => {
  describe('initialization', () => {
    it('should initialize with provided state', () => {
      const initialState = { value: 42 };
      const { result } = renderHook(() => useHistory(initialState));

      expect(result.current.state).toEqual({ value: 42 });
    });

    it('should initialize with canUndo as false', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      expect(result.current.canUndo).toBe(false);
    });

    it('should initialize with canRedo as false', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      expect(result.current.canRedo).toBe(false);
    });

    it('should initialize historyIndex at 1', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      expect(result.current.historyIndex).toBe(1);
    });

    it('should accept complex state objects', () => {
      const initialState = {
        pixels: [[true, false], [false, true]],
        attributes: [{ ink: 7, paper: 0 }],
      };
      const { result } = renderHook(() => useHistory(initialState));

      expect(result.current.state).toEqual(initialState);
    });
  });

  describe('setState', () => {
    it('should update state with new value', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 10 });
      });

      expect(result.current.state).toEqual({ value: 10 });
    });

    it('should update state with function updater', () => {
      const { result } = renderHook(() => useHistory({ value: 5 }));

      act(() => {
        result.current.setState((prev) => ({ value: prev.value * 2 }));
      });

      expect(result.current.state).toEqual({ value: 10 });
    });

    it('should not add to history when using setState', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 10 });
      });

      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('push', () => {
    it('should add current state to history', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 10 });
      });

      act(() => {
        result.current.push();
      });

      expect(result.current.canUndo).toBe(true);
    });

    it('should enable undo after pushing state', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });

      act(() => {
        result.current.push();
      });

      expect(result.current.canUndo).toBe(true);
    });

    it('should clear future stack when pushing new state', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      // Create history
      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.push();
      });

      // Undo once
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Push new state should clear redo
      act(() => {
        result.current.setState({ value: 3 });
      });
      act(() => {
        result.current.push();
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('should respect maxHistory limit', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }, { maxHistory: 3 }));

      // Push 5 states
      for (let i = 1; i <= 5; i++) {
        act(() => {
          result.current.setState({ value: i });
        });
        act(() => {
          result.current.push();
        });
      }

      // Make one more change after last push
      act(() => {
        result.current.setState({ value: 6 });
      });

      // Should only keep last 3 in history
      act(() => {
        result.current.undo(); // back to 5
      });
      expect(result.current.state).toEqual({ value: 5 });

      act(() => {
        result.current.undo(); // back to 4
      });
      expect(result.current.state).toEqual({ value: 4 });

      act(() => {
        result.current.undo(); // back to 3
      });
      expect(result.current.state).toEqual({ value: 3 });

      // Can't undo further (states 0, 1, and 2 were dropped)
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('undo', () => {
    it('should restore previous state', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ value: 1 });
    });

    it('should enable redo after undo', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);
    });

    it('should disable canUndo when no more history', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
    });

    it('should handle multiple undo operations', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 3 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 4 });
      });

      act(() => {
        result.current.undo(); // back to 3
        result.current.undo(); // back to 2
        result.current.undo(); // back to 1
      });

      expect(result.current.state).toEqual({ value: 1 });
    });

    it('should do nothing when no history exists', () => {
      const { result } = renderHook(() => useHistory({ value: 42 }));

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ value: 42 });
    });

    it('should deep clone state to prevent mutations', () => {
      const { result } = renderHook(() => useHistory({ arr: [1, 2, 3] }));

      act(() => {
        result.current.setState({ arr: [4, 5, 6] });
      });
      act(() => {
        result.current.push();
      });

      // Mutate current state
      act(() => {
        result.current.setState({ arr: [7, 8, 9] });
      });

      // Undo should restore original, not mutated version
      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ arr: [4, 5, 6] });
    });
  });

  describe('redo', () => {
    it('should restore next state after undo', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toEqual({ value: 2 });
    });

    it('should disable canRedo when no more future states', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });

      act(() => {
        result.current.undo();
        result.current.redo();
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('should handle multiple redo operations', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 3 });
      });

      act(() => {
        result.current.undo(); // back to 2
        result.current.undo(); // back to 1
      });

      act(() => {
        result.current.redo(); // forward to 2
        result.current.redo(); // forward to 3
      });

      expect(result.current.state).toEqual({ value: 3 });
    });

    it('should do nothing when no future states exist', () => {
      const { result } = renderHook(() => useHistory({ value: 42 }));

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toEqual({ value: 42 });
    });

    it('should enable canUndo after redo', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.undo();
      });

      // Before redo, canUndo is false (we're at the oldest state)
      expect(result.current.canUndo).toBe(false);

      act(() => {
        result.current.redo();
      });

      // After redo, canUndo should be true
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.push();
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should preserve current state', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 42 });
      });
      act(() => {
        result.current.push();
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.state).toEqual({ value: 42 });
    });

    it('should clear future states after undo', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('undo/redo cycle', () => {
    it('should correctly handle undo then redo sequence', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 3 });
      });

      act(() => {
        result.current.undo(); // 2
        result.current.undo(); // 1
        result.current.redo(); // 2
        result.current.redo(); // 3
      });

      expect(result.current.state).toEqual({ value: 3 });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should maintain history integrity through complex operations', () => {
      const { result } = renderHook(() => useHistory({ count: 0 }));

      // Create history
      act(() => {
        result.current.setState({ count: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ count: 2 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ count: 3 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ count: 3.5 }); // Make a change after last push
      });

      // Undo twice
      act(() => {
        result.current.undo(); // Back to 3
        result.current.undo(); // Back to 2
      });
      expect(result.current.state).toEqual({ count: 2 });

      // Make new change (should clear redo)
      act(() => {
        result.current.setState({ count: 4 });
      });
      act(() => {
        result.current.push();
      });
      expect(result.current.canRedo).toBe(false);

      // Make another change so there's something to undo
      act(() => {
        result.current.setState({ count: 5 });
      });

      // Undo should go back to 4
      act(() => {
        result.current.undo();
      });
      expect(result.current.state).toEqual({ count: 4 });
    });
  });

  describe('historyIndex', () => {
    it('should be 1 at initial state', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));
      expect(result.current.historyIndex).toBe(1);
    });

    it('should increment to 2 after first push', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => { result.current.setState({ value: 1 }); });
      act(() => { result.current.push(); });

      expect(result.current.historyIndex).toBe(2);
    });

    it('should increment with each push', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      for (let i = 1; i <= 4; i++) {
        act(() => { result.current.setState({ value: i }); });
        act(() => { result.current.push(); });
        expect(result.current.historyIndex).toBe(i + 1);
      }
    });

    it('should decrement by 1 when undoing', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => { result.current.setState({ value: 1 }); });
      act(() => { result.current.push(); });
      act(() => { result.current.setState({ value: 2 }); });
      act(() => { result.current.push(); });

      expect(result.current.historyIndex).toBe(3);

      act(() => { result.current.undo(); });
      expect(result.current.historyIndex).toBe(2);

      act(() => { result.current.undo(); });
      expect(result.current.historyIndex).toBe(1);
    });

    it('should increment by 1 when redoing', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => { result.current.setState({ value: 1 }); });
      act(() => { result.current.push(); });
      act(() => { result.current.setState({ value: 2 }); });
      act(() => { result.current.push(); });
      act(() => { result.current.undo(); });
      act(() => { result.current.undo(); });

      expect(result.current.historyIndex).toBe(1);

      act(() => { result.current.redo(); });
      expect(result.current.historyIndex).toBe(2);

      act(() => { result.current.redo(); });
      expect(result.current.historyIndex).toBe(3);
    });

    it('should reset to 1 after clearHistory', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => { result.current.setState({ value: 1 }); });
      act(() => { result.current.push(); });
      act(() => { result.current.setState({ value: 2 }); });
      act(() => { result.current.push(); });

      expect(result.current.historyIndex).toBe(3);

      act(() => { result.current.clearHistory(); });

      expect(result.current.historyIndex).toBe(1);
    });

    it('should reset future and update index when push follows undo', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }));

      act(() => { result.current.setState({ value: 1 }); });
      act(() => { result.current.push(); });
      act(() => { result.current.setState({ value: 2 }); });
      act(() => { result.current.push(); });
      act(() => { result.current.undo(); });

      expect(result.current.historyIndex).toBe(2);

      act(() => { result.current.setState({ value: 3 }); });
      act(() => { result.current.push(); });

      expect(result.current.historyIndex).toBe(3);
    });
  });

  describe('custom maxHistory', () => {
    it('should accept custom maxHistory option', () => {
      const { result } = renderHook(() => useHistory({ value: 0 }, { maxHistory: 2 }));

      act(() => {
        result.current.setState({ value: 1 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 2 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 3 });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ value: 4 });
      });

      // Undo twice (maxHistory: 2)
      act(() => {
        result.current.undo(); // 3
        result.current.undo(); // 2
      });

      // Can't undo further
      expect(result.current.canUndo).toBe(false);
      expect(result.current.state).toEqual({ value: 2 });
    });
  });

  describe('complex state objects', () => {
    it('should handle arrays in state', () => {
      const { result } = renderHook(() => useHistory({ items: [1, 2, 3] }));

      act(() => {
        result.current.setState({ items: [4, 5, 6] });
      });
      act(() => {
        result.current.push();
      });
      act(() => {
        result.current.setState({ items: [7, 8, 9] });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ items: [4, 5, 6] });
    });

    it('should handle nested objects in state', () => {
      const initialState = {
        user: {
          name: 'Alice',
          settings: {
            theme: 'dark',
          },
        },
      };

      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.setState({
          user: {
            name: 'Bob',
            settings: {
              theme: 'light',
            },
          },
        });
      });
      act(() => {
        result.current.push();
      });

      // Make another change so undo has something to go back to
      act(() => {
        result.current.setState({
          user: {
            name: 'Charlie',
            settings: {
              theme: 'auto',
            },
          },
        });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({
        user: {
          name: 'Bob',
          settings: {
            theme: 'light',
          },
        },
      });
    });

    it('should handle 2D arrays (like pixel data)', () => {
      const initialState = {
        pixels: [
          [true, false],
          [false, true],
        ],
      };

      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.setState({
          pixels: [
            [false, true],
            [true, false],
          ],
        });
      });
      act(() => {
        result.current.push();
      });

      // Make another change so undo has something to go back to
      act(() => {
        result.current.setState({
          pixels: [
            [true, true],
            [true, true],
          ],
        });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({
        pixels: [
          [false, true],
          [true, false],
        ],
      });
    });
  });
});
