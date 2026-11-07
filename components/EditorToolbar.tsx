'use client';

import { IoClose, IoMenu } from 'react-icons/io5';
import { InfoTooltip } from './InfoTooltip';

/** The pages leave this much room for the toolbar (ml-[220px]); without a width a fixed panel grows to fit its widest text. */
export const DEFAULT_WIDTH_CLASS = 'w-[220px]';

interface EditorToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
  infoId?: string;
  infoDescription?: string;
  children?: React.ReactNode;
  widthClassName?: string;
}

export function EditorToolbar({
  isOpen,
  onToggle,
  title = 'Game Boy Editor',
  infoId,
  infoDescription,
  children,
  widthClassName,
}: EditorToolbarProps) {
  return (
    <>
      {/* Toggle button when toolbar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-14 left-4 z-50 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          title="Open toolbar"
        >
          <IoMenu size={24} />
        </button>
      )}

      {/* Left Toolbar */}
      <div
        className={`fixed top-10 left-0 ${widthClassName ?? DEFAULT_WIDTH_CLASS} h-[calc(100%-40px)] bg-gray-800 shadow-xl z-40 transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Toolbar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{title}</h1>
            {infoId && infoDescription && (
              <InfoTooltip
                id={infoId}
                title={title}
                description={infoDescription}
              />
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-700 rounded"
            title="Close toolbar"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Toolbar Content */}
        <div className="p-4 pr-5 space-y-4">
          {children}
        </div>
      </div>
    </>
  );
}
