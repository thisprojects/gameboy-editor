import { render, screen, fireEvent } from '@testing-library/react';
import { UndoRedoButtons } from '@/components/UndoRedoButtons';

describe('UndoRedoButtons component', () => {
  const defaultProps = {
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    canUndo: true,
    canRedo: true,
    historyIndex: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the History label', () => {
      render(<UndoRedoButtons {...defaultProps} />);
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('should render undo button', () => {
      render(<UndoRedoButtons {...defaultProps} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toBeInTheDocument();
    });

    it('should render redo button', () => {
      render(<UndoRedoButtons {...defaultProps} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).toBeInTheDocument();
    });

    it('should render prev, index, and next in a centered flex row', () => {
      const { container } = render(<UndoRedoButtons {...defaultProps} />);
      const row = container.querySelector('.flex.items-center.justify-center.gap-3');
      expect(row).toBeInTheDocument();
      expect(row?.children).toHaveLength(3);
    });

    it('should have correct styling classes on container', () => {
      const { container } = render(<UndoRedoButtons {...defaultProps} />);
      const outerContainer = container.querySelector('.border.border-gray-600.rounded.p-2.mt-2');
      expect(outerContainer).toBeInTheDocument();
    });

    it('should display historyIndex as a number', () => {
      render(<UndoRedoButtons {...defaultProps} historyIndex={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should update displayed index when prop changes', () => {
      const { rerender } = render(<UndoRedoButtons {...defaultProps} historyIndex={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();

      rerender(<UndoRedoButtons {...defaultProps} historyIndex={7} />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  describe('undo button', () => {
    it('should be enabled when canUndo is true', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).not.toBeDisabled();
    });

    it('should be disabled when canUndo is false', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={false} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toBeDisabled();
    });

    it('should have enabled styling when canUndo is true', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toHaveClass('bg-gray-700', 'text-gray-300', 'hover:bg-gray-600');
    });

    it('should have disabled styling when canUndo is false', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={false} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toHaveClass('bg-gray-800', 'text-gray-500', 'cursor-not-allowed');
    });

    it('should call onUndo when clicked and enabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      fireEvent.click(undoButton);
      expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should not call onUndo when clicked and disabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={false} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      fireEvent.click(undoButton);
      expect(defaultProps.onUndo).not.toHaveBeenCalled();
    });
  });

  describe('redo button', () => {
    it('should be enabled when canRedo is true', () => {
      render(<UndoRedoButtons {...defaultProps} canRedo={true} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).not.toBeDisabled();
    });

    it('should be disabled when canRedo is false', () => {
      render(<UndoRedoButtons {...defaultProps} canRedo={false} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).toBeDisabled();
    });

    it('should have enabled styling when canRedo is true', () => {
      render(<UndoRedoButtons {...defaultProps} canRedo={true} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).toHaveClass('bg-gray-700', 'text-gray-300', 'hover:bg-gray-600');
    });

    it('should have disabled styling when canRedo is false', () => {
      render(<UndoRedoButtons {...defaultProps} canRedo={false} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).toHaveClass('bg-gray-800', 'text-gray-500', 'cursor-not-allowed');
    });

    it('should call onRedo when clicked and enabled', () => {
      render(<UndoRedoButtons {...defaultProps} canRedo={true} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      fireEvent.click(redoButton);
      expect(defaultProps.onRedo).toHaveBeenCalledTimes(1);
    });

    it('should not call onRedo when clicked and disabled', () => {
      render(<UndoRedoButtons {...defaultProps} canRedo={false} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      fireEvent.click(redoButton);
      expect(defaultProps.onRedo).not.toHaveBeenCalled();
    });
  });

  describe('state combinations', () => {
    it('should handle both buttons disabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={false} canRedo={false} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });

    it('should handle both buttons enabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={true} canRedo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(undoButton).not.toBeDisabled();
      expect(redoButton).not.toBeDisabled();
    });

    it('should handle undo enabled and redo disabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={true} canRedo={false} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(undoButton).not.toBeDisabled();
      expect(redoButton).toBeDisabled();
    });

    it('should handle undo disabled and redo enabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={false} canRedo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(undoButton).toBeDisabled();
      expect(redoButton).not.toBeDisabled();
    });
  });

  describe('multiple clicks', () => {
    it('should call onUndo for each click when enabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');

      fireEvent.click(undoButton);
      fireEvent.click(undoButton);
      fireEvent.click(undoButton);

      expect(defaultProps.onUndo).toHaveBeenCalledTimes(3);
    });

    it('should call onRedo for each click when enabled', () => {
      render(<UndoRedoButtons {...defaultProps} canRedo={true} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');

      fireEvent.click(redoButton);
      fireEvent.click(redoButton);

      expect(defaultProps.onRedo).toHaveBeenCalledTimes(2);
    });
  });

  describe('prop updates', () => {
    it('should update undo button state when canUndo prop changes', () => {
      const { rerender } = render(<UndoRedoButtons {...defaultProps} canUndo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).not.toBeDisabled();

      rerender(<UndoRedoButtons {...defaultProps} canUndo={false} />);
      expect(undoButton).toBeDisabled();
    });

    it('should update redo button state when canRedo prop changes', () => {
      const { rerender } = render(<UndoRedoButtons {...defaultProps} canRedo={true} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).not.toBeDisabled();

      rerender(<UndoRedoButtons {...defaultProps} canRedo={false} />);
      expect(redoButton).toBeDisabled();
    });

    it('should update button styling when canUndo changes', () => {
      const { rerender } = render(<UndoRedoButtons {...defaultProps} canUndo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toHaveClass('bg-gray-700');

      rerender(<UndoRedoButtons {...defaultProps} canUndo={false} />);
      expect(undoButton).toHaveClass('bg-gray-800');
    });

    it('should update button styling when canRedo changes', () => {
      const { rerender } = render(<UndoRedoButtons {...defaultProps} canRedo={true} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).toHaveClass('bg-gray-700');

      rerender(<UndoRedoButtons {...defaultProps} canRedo={false} />);
      expect(redoButton).toHaveClass('bg-gray-800');
    });
  });

  describe('accessibility', () => {
    it('should have descriptive titles for undo button', () => {
      render(<UndoRedoButtons {...defaultProps} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton.getAttribute('title')).toBe('Undo (Ctrl+Z)');
    });

    it('should have descriptive titles for redo button', () => {
      render(<UndoRedoButtons {...defaultProps} />);
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton.getAttribute('title')).toBe('Redo (Ctrl+Y)');
    });

    it('should be keyboard accessible when enabled', () => {
      render(<UndoRedoButtons {...defaultProps} canUndo={true} />);
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      undoButton.focus();
      expect(document.activeElement).toBe(undoButton);
    });
  });
});
