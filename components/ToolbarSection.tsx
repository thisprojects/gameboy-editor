'use client';

import { useEffect, useRef } from 'react';
import { BsChevronDown } from 'react-icons/bs';

interface ToolbarSectionProps {
  title: React.ReactNode;
  /** Sections the user rarely needs can start folded. */
  defaultOpen?: boolean;
  /** Unfolds the section when it becomes true (e.g. an image was just loaded); the user can still fold it again. */
  openWhen?: boolean;
  children: React.ReactNode;
}

/** A titled, collapsible card that groups related toolbar controls. */
export function ToolbarSection({ title, defaultOpen = true, openWhen = false, children }: ToolbarSectionProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (openWhen && ref.current) ref.current.open = true;
  }, [openWhen]);
  return (
    <details ref={ref} open={defaultOpen} className="group rounded-lg border border-gray-700 bg-gray-900/40">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-300 hover:text-white [&::-webkit-details-marker]:hidden">
        <span className="normal-case tracking-normal">{title}</span>
        <BsChevronDown size={10} className="shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-gray-700/60 px-2.5 py-2.5">{children}</div>
    </details>
  );
}
