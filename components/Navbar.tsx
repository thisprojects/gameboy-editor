'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { navItems } from '@/constants/navItems';
import { docItems } from '@/constants/docItems';

export function Navbar() {
  const pathname = usePathname();
  const [docsOpen, setDocsOpen] = useState(false);
  const docsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (docsRef.current && !docsRef.current.contains(e.target as Node)) setDocsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 h-10 bg-gray-800 border-b border-gray-700 z-50 flex items-center px-4 gap-4">
      <Link
        href="/"
        className="text-green-400 text-xl select-none shrink-0 hover:text-green-300 transition-colors"
        style={{ fontFamily: 'var(--font-vt323)', letterSpacing: '0.05em' }}
      >
        NorbSoft
      </Link>
      <div className="flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}

        <div ref={docsRef} className="relative">
          <button
            onClick={() => setDocsOpen((open) => !open)}
            aria-expanded={docsOpen}
            aria-haspopup="true"
            className="px-3 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-1"
          >
            Documentation
            <svg className={`w-3 h-3 transition-transform ${docsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {docsOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded shadow-lg">
              {docItems.map((doc) => (
                <a
                  key={doc.href}
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  onClick={() => setDocsOpen(false)}
                >
                  {doc.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
