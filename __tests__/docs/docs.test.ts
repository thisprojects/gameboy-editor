/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const builder = require('../../scripts/build-docs.cjs') as {
  buildAll: (only?: string[]) => Record<string, string>;
  buildPage: (page: { file: string }, source: string) => string;
  expand: (text: string) => string;
  highlight: (code: string) => string;
  highlightLine: (line: string) => string;
  PAGES: { file: string; label: string }[];
  BOOK: { file: string; label: string };
};
const { buildAll, buildPage, expand, highlight, highlightLine, PAGES, BOOK } = builder;

const readPublic = (file: string) => fs.readFileSync(path.join(ROOT, 'public', file), 'utf-8');
const readExample = (file: string) => fs.readFileSync(path.join(ROOT, 'examples', file), 'utf-8');
const text = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('highlighter', () => {
  it('colours labels, mnemonics, directives, numbers, strings and comments', () => {
    expect(highlightLine('Start: ld a, $E4 ; palette')).toBe(
      '<span class="label">Start</span>: <span class="keyword">ld</span> a, <span class="number">$E4</span> <span class="comment">; palette</span>'
    );
    expect(highlightLine('    db "HI", 10, %101')).toBe(
      '    <span class="directive">db</span> <span class="string">"HI"</span>, <span class="number">10</span>, <span class="number">%101</span>'
    );
    expect(highlightLine("    cp 'A'")).toBe('    <span class="keyword">cp</span> <span class="string">\'A\'</span>');
  });

  it('only treats the first word of a line as an instruction', () => {
    expect(highlightLine('    ld a, b')).toBe('    <span class="keyword">ld</span> a, b');
    expect(highlightLine('DEF FOO EQU 5')).toBe('<span class="directive">DEF</span> FOO EQU <span class="number">5</span>');
  });

  it('handles local and exported labels and labels without a colon', () => {
    expect(highlightLine('.loop:')).toBe('<span class="label">.loop</span>:');
    expect(highlightLine('song_init::')).toBe('<span class="label">song_init</span>::');
    expect(highlightLine('Message  DB "x"')).toContain('<span class="label">Message</span>');
  });

  it('does not start a comment inside a string or char literal', () => {
    expect(highlightLine('    db "a;b" ; real')).toBe(
      '    <span class="directive">db</span> <span class="string">"a;b"</span> <span class="comment">; real</span>'
    );
    expect(highlightLine("    ld a, ';'")).toBe('    <span class="keyword">ld</span> a, <span class="string">\';\'</span>');
    expect(highlightLine('    db "unterminated ; x')).toContain('<span class="directive">db</span>');
  });

  it('escapes HTML and trims blank lines around a block', () => {
    expect(highlightLine('    ld a, b ; 1 < 2 & 3')).toContain('&lt; 2 &amp; 3');
    expect(highlight('\n\n  nop\n\n')).toBe('  <span class="keyword">nop</span>');
  });
});

describe('page markers', () => {
  it('[[asm]] highlights, [[text]] escapes', () => {
    expect(expand('[[asm]]\n nop\n[[/asm]]')).toBe('<pre><code> <span class="keyword">nop</span></code></pre>');
    expect(expand('[[text]]\nmake <a> & b\n[[/text]]')).toBe('<pre><code>make &lt;a&gt; &amp; b</code></pre>');
  });

  it('[[file]] includes a whole example file', () => {
    const out = text(expand('[[file tiles/tile_viewer.asm]]'));
    expect(out).toContain('INCLUDE "forest.asm"');
    expect(out).toContain('INCLUDE "util.inc"');
  });

  it('[[lines]] includes a range of lines', () => {
    const out = text(expand('[[lines tiles/tile_viewer.asm 1-2]]'));
    expect(out.trim().split('\n')).toEqual(readExample('tiles/tile_viewer.asm').split('\n').slice(0, 2));
  });

  it('[[part]] runs from the first line starting with START (ignoring indentation) up to END', () => {
    const out = text(expand('[[part tiles/tile_viewer.asm | ; Clear the background map | ld a, %11100100]]'));
    expect(out.startsWith('    ; Clear the background map')).toBe(true);
    expect(out).toContain('ld bc, VRAM_MAP_W * VRAM_MAP_W');
    expect(out).not.toContain('ld a, %11100100');
  });

  it('[[part]] without END runs to the end of the file', () => {
    expect(text(expand('[[part tiles/tile_viewer.asm | Start:]]'))).toContain('INCLUDE "util.inc"');
  });

  it('[[part]] reports a start or end that cannot be found', () => {
    expect(() => expand('[[part tiles/tile_viewer.asm | no such line | x]]')).toThrow(/no line starts with/);
    expect(() => expand('[[part tiles/tile_viewer.asm | Start: | no such end]]')).toThrow(/no line after the start contains/);
  });
});

describe('buildPage', () => {
  const page = { file: 'tile_examples.html' };
  const good = 'title: T\nheading: H\nsubtitle: S\n---\n<p>hello</p>\n';

  it('builds a complete document with the title block and the examples menu', () => {
    const html = buildPage(page, good);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>T</title>');
    expect(html).toContain('<h1>H</h1>');
    expect(html).toContain('<div class="subtitle">S</div>');
    expect(html).toContain('<p>hello</p>');
    expect(html).toContain('href="/tile_examples.html" aria-current="page"');
    expect(html).not.toContain('href="/map_examples.html" aria-current');
  });

  it('escapes the header text', () => {
    expect(buildPage(page, good.replace('title: T', 'title: A <b> & B'))).toContain('<title>A &lt;b&gt; &amp; B</title>');
  });

  it('rejects a source without the --- line or a header field', () => {
    expect(() => buildPage(page, 'title: T\n<p>x</p>')).toThrow(/---/);
    expect(() => buildPage(page, good.replace('subtitle: S', ''))).toThrow(/missing "subtitle:"/);
  });

  it('rejects an unknown marker', () => {
    expect(() => buildPage(page, good + '[[bogus]]')).toThrow(/unprocessed markers \[\[bogus\]\]/);
  });

  it('buildAll can build a subset', () => {
    expect(Object.keys(buildAll(['music_examples.html']))).toEqual(['music_examples.html']);
  });
});

describe('the example pages in public/', () => {
  const built = buildAll();

  it('there is one page per editor with an example, in the menu order', () => {
    expect(PAGES.map((p) => p.file)).toEqual([
      'tile_examples.html', 'sprite_examples.html', 'map_examples.html', 'font_examples.html', 'level_examples.html', 'music_examples.html',
    ]);
    expect(Object.keys(built)).toEqual(PAGES.map((p) => p.file));
  });

  it.each(PAGES.map((p) => p.file))('%s is up to date (run `npm run docs` after editing docs/pages or the examples)', (file) => {
    expect(readPublic(file)).toBe(built[file]);
  });

  it.each(PAGES.map((p) => p.file))('%s has no leftover markers and links to the book and every page', (file) => {
    const html = readPublic(file);
    expect(html).not.toMatch(/\[\[|\]\]/);
    expect(html).toContain(`href="/${BOOK.file}"`);
    for (const p of PAGES) expect(html).toContain(`href="/${p.file}"`);
    expect(html.match(/<a href="[^"]+" aria-current="page">/g)).toHaveLength(1); // exactly one menu entry is the current page
  });

  it.each(PAGES.map((p) => p.file))('%s: every internal link and anchor resolves', (file) => {
    const html = readPublic(file);
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^https?:/.test(href)) continue;
      const [target, fragment] = href.split('#');
      const targetHtml = target ? readPublic(target.slice(1)) : html; // throws if the file does not exist
      if (fragment) expect(targetHtml).toContain(`id="${fragment}"`);
    }
  });

  it.each(PAGES.map((p) => p.file))('%s has the standard sections and a running section', (file) => {
    const html = readPublic(file);
    for (const id of ['introduction', 'exporting', 'exported-data', 'running']) expect(html).toContain(`id="${id}"`);
    expect(html.includes('id="source"') || html.includes('id="program"')).toBe(true);
  });

  // each page lists the whole program it explains
  it.each([
    ['tile_examples.html', ['tiles/tile_viewer.asm', 'tiles/forest.asm', 'common/util.inc']],
    ['sprite_examples.html', ['sprite/sprite_demo.asm', 'sprite/hero.asm']],
    ['map_examples.html', ['map/map_viewer.asm']],
    ['font_examples.html', ['font/font_demo.asm']],
    ['level_examples.html', ['level/level_demo.asm']],
    ['music_examples.html', ['music/music_demo.asm']],
  ])('%s shows the complete source of its programs', (file, sources) => {
    const shown = text(readPublic(file));
    for (const source of sources) {
      for (const line of readExample(source).split('\n')) {
        if (line.trim()) expect(shown).toContain(line.trimEnd());
      }
    }
  });

  it('tells readers how to build every example in the Makefile', () => {
    const makefile = readExample('Makefile');
    const programs = makefile.match(/^PROGRAMS := (.*)$/m)![1].split(/\s+/);
    expect(programs).toHaveLength(6);
    const allPages = PAGES.map((p) => readPublic(p.file)).join('\n');
    for (const program of programs) expect(allPages).toContain(`make ${program}.gb`);
  });

  it('the examples overview names every example folder', () => {
    const readme = readExample('README.md');
    for (const dir of ['tiles', 'sprite', 'map', 'font', 'level', 'music']) expect(readme).toContain(`\`${dir}/\``);
  });
});

describe('the Game Boy book in public/', () => {
  const book = readPublic(BOOK.file);

  it('is the Game Boy assembly introduction', () => {
    expect(book).toContain('<h1>An Introduction to Game Boy Assembly Language</h1>');
    expect(book).toContain('id="debug-output-routines"');
  });

  it('is a complete document', () => {
    expect(book).toMatch(/^<!DOCTYPE html>/);
    expect(book.trimEnd()).toMatch(/<\/html>$/);
  });

  it('its in-page anchors all resolve', () => {
    for (const [, id] of book.matchAll(/href="#([^"]+)"/g)) expect(book).toContain(`id="${id}"`);
  });
});
