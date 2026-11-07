import { IoArrowUndo, IoArrowRedo } from 'react-icons/io5';

interface UndoRedoButtonsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
}

export function UndoRedoButtons({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  historyIndex,
}: UndoRedoButtonsProps) {
  return (
    <div className="border border-gray-600 rounded p-2 mt-2">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-gray-400">History</span>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded ${
            canUndo
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <IoArrowUndo size={14} />
        </button>
        <span className="text-sm text-gray-300 min-w-[2ch] text-center tabular-nums">
          {historyIndex}
        </span>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded ${
            canRedo
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <IoArrowRedo size={14} />
        </button>
      </div>
    </div>
  );
}
