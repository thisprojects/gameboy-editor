'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BsInfoCircle, BsX } from 'react-icons/bs';

// Context to track which tooltip is open (only one at a time)
const InfoTooltipContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
}>({
  openId: null,
  setOpenId: () => {},
});

export function InfoTooltipProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <InfoTooltipContext.Provider value={{ openId, setOpenId }}>
      {children}
    </InfoTooltipContext.Provider>
  );
}

interface InfoTooltipProps {
  id: string;
  title: string;
  description: string;
}

export function InfoTooltip({ id, title, description }: InfoTooltipProps) {
  const { openId, setOpenId } = useContext(InfoTooltipContext);
  const isOpen = openId === id;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setOpenId(null);
      setPosition(null);
    } else {
      // Calculate position synchronously before opening
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top,
          left: rect.right + 8,
        });
      }
      setOpenId(id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenId(null);
    setPosition(null);
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpenId(null);
      }
    };

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setOpenId]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-0.5 text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
        title="More info"
        aria-label={`Info about ${title}`}
      >
        <BsInfoCircle size={12} />
      </button>

      {isOpen && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          style={{ top: position.top, left: position.left }}
          className="fixed z-[100] w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with title and close button */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-600">
            <span className="text-xs font-medium text-white">{title}</span>
            <button
              onClick={handleClose}
              className="p-0.5 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <BsX size={14} />
            </button>
          </div>
          {/* Description */}
          <div className="px-2 py-2 text-xs text-gray-300 leading-relaxed">
            {description}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
