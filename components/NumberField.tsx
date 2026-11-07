'use client';

import { useState } from 'react';

interface NumberFieldProps {
  value: number;
  /** Called with a whole number when the user has finished typing, or steps the value with the arrows. */
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * A number input that does not act on half-typed text. Typing "32" passes through "3", which for a size or
 * a row count would be a destructive change, so typed text is only committed on Enter or when the field
 * loses focus. Changes that do not come from typing (the spinner arrows) are committed at once.
 */
export function NumberField({ value, onCommit, min, max, id, className, 'aria-label': ariaLabel }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    setDraft(null);
    if (draft.trim() !== '' && Number.isFinite(n)) onCommit(n);
  };

  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      aria-label={ariaLabel}
      className={className}
      value={draft ?? String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const inputType = (e.nativeEvent as InputEvent).inputType ?? '';
        if (/^(insert|delete|history)/.test(inputType)) {
          setDraft(raw); // typing: wait for Enter or blur
        } else if (raw.trim() !== '' && Number.isFinite(Number(raw))) {
          setDraft(null);
          onCommit(Number(raw));
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}
