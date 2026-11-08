'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { controlHint } from '@/constants/toolHints';

interface Tip { text: string; rect: DOMRect }

const SELECTOR = '[data-tip], [title], button, select, input, label';

/** The text to show for an element, or null. A native `title` is moved to `data-tip` so the browser's slow tooltip doesn't also appear. */
export function tipFor(el: Element): string | null {
  const explicit = el.getAttribute('data-tip');
  if (explicit) return explicit;
  const title = el.getAttribute('title');
  if (title) {
    // keep the text available to assistive tech once the native title is gone
    if (!el.textContent?.trim()) {
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', title);
    } else if (!el.getAttribute('aria-description')) {
      el.setAttribute('aria-description', title);
    }
    el.setAttribute('data-tip', title);
    el.removeAttribute('title');
    return title;
  }
  const names: (string | null | undefined)[] = [el.getAttribute('aria-label')];
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    const labels = el.labels ? Array.from(el.labels) : [];
    names.push(...labels.map((l) => l.textContent));
  }
  names.push(el.textContent);
  for (const n of names) {
    const hint = n ? controlHint(n) : undefined;
    if (hint) return hint;
  }
  return null;
}

/** Shows an instant tooltip for any control inside the editor pages (hover or keyboard focus). */
export function HoverTips() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const show = (e: Event) => {
      const target = e.target instanceof Element ? e.target.closest(SELECTOR) : null;
      if (!target) return setTip(null);
      const text = tipFor(target);
      setTip(text ? { text, rect: target.getBoundingClientRect() } : null);
    };
    const hide = () => setTip(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('mouseover', show);
    document.addEventListener('focusin', show);
    document.addEventListener('mousedown', hide);
    document.addEventListener('focusout', hide);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mouseover', show);
      document.removeEventListener('focusin', show);
      document.removeEventListener('mousedown', hide);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!tip) return null;
  const { rect, text } = tip;
  const width = 224;
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
  const below = rect.bottom + 8 + 64 < window.innerHeight;
  const style = below ? { top: rect.bottom + 6, left } : { bottom: window.innerHeight - rect.top + 6, left };
  return createPortal(
    <div
      role="tooltip"
      style={{ ...style, width }}
      className="fixed z-[200] pointer-events-none rounded-md border border-gray-600 bg-gray-950 px-2 py-1.5 text-xs leading-snug text-gray-100 shadow-lg"
    >
      {text}
    </div>,
    document.body,
  );
}
