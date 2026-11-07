import Link from 'next/link';
import { navItems } from '@/constants/navItems';
import { EDITOR_CARDS } from '@/constants/editorCards';
import { PixelIcon } from '@/components/PixelIcon';

const CHIPS = ['DMG', '160 × 144', '4 shades', 'RGBDS & GBDK'];

export default function Home() {
  return (
    <main
      className="relative isolate min-h-screen overflow-hidden bg-gray-950 text-white px-6 py-14 sm:px-10"
      style={{
        // a faint dot grid, like the pixels of the LCD
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(155, 188, 15, 0.13) 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }}
    >
      {/* soft green glows behind the title */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-[#9bbc0f]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-96 w-96 rounded-full bg-[#306230]/30 blur-3xl" />

      <div className="mx-auto max-w-6xl">
        <header className="mb-14 text-center">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2" aria-label="Features">
            {CHIPS.map((chip) => (
              <span key={chip} className="rounded-full border border-[#9bbc0f]/30 bg-[#9bbc0f]/10 px-3 py-1 text-xs font-medium tracking-wider text-[#d3eb78] uppercase">
                {chip}
              </span>
            ))}
          </div>
          <h1
            className="bg-gradient-to-r from-[#f2fba8] via-[#9bbc0f] to-[#5f8f2a] bg-clip-text text-6xl leading-none text-transparent sm:text-8xl"
            style={{ fontFamily: 'var(--font-vt323)', letterSpacing: '0.04em' }}
          >
            Game Boy Editor
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-400">
            Graphics and sound editors for the original Game Boy. Draw it, paint it, compose it — then export straight into your project.
          </p>
        </header>

        <ul className="flex flex-wrap justify-center gap-5">
          {navItems.map((item, index) => {
            const card = EDITOR_CARDS[item.href];
            return (
              // a centred, wrapping row: 1, 2, 3 or 4 tiles across, and a short last row stays in the middle
              <li key={item.href} className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.84rem)] xl:w-[calc(25%-0.95rem)]">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-describedby={`card-${index}`}
                  style={{ '--accent': card.accent } as React.CSSProperties}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-5 shadow-lg shadow-black/30 transition duration-300 hover:border-[var(--accent)] hover:shadow-[0_16px_44px_-14px_var(--accent)] focus-visible:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-safe:hover:-translate-y-1"
                >
                  {/* a glow in the corner that brightens on hover */}
                  <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-[var(--accent)] opacity-15 blur-2xl transition-opacity duration-300 group-hover:opacity-45" />

                  <div className="relative flex items-start justify-between">
                    {/* the icon sits on a little LCD */}
                    <div className="rounded-xl border-4 border-[#2d2f3b] bg-[#9bbc0f] p-2 shadow-[inset_0_0_0_2px_#8bac0f] transition-transform duration-300 motion-safe:group-hover:scale-105 motion-safe:group-hover:-rotate-2">
                      <PixelIcon art={card.art} className="h-12 w-12" />
                    </div>
                    <span aria-hidden className="text-4xl leading-none text-white/15 transition-colors duration-300 group-hover:text-[var(--accent)]" style={{ fontFamily: 'var(--font-vt323)' }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h2 className="relative mt-5 text-lg font-semibold tracking-tight text-white">{item.label}</h2>
                  <p id={`card-${index}`} className="relative mt-1.5 flex-1 text-sm leading-relaxed text-gray-400">
                    {card.description}
                  </p>
                  <span aria-hidden className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
                    Open editor
                    <span className="transition-transform duration-300 motion-safe:group-hover:translate-x-1.5">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
