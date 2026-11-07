#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builds the example pages in public/ from docs/pages/*.html.
 *
 * A page source starts with three header lines (title, heading, subtitle), then a line with `---`, then
 * ordinary HTML with the same markers the Game Boy book uses, so listings are highlighted automatically and
 * whole programs are pulled straight from examples/ (the files the tests assemble and run):
 *
 *   [[asm]] ...plain assembly, not HTML-escaped... [[/asm]]      highlighted code block
 *   [[text]] ...plain text... [[/text]]                           un-highlighted block (shell commands, output)
 *   [[file tiles/tile_viewer.asm]]                                a whole file from examples/, highlighted
 *   [[part tiles/tile_viewer.asm | START | END]]                  part of a file: from the first line starting with
 *                                                                 START (ignoring indentation) up to (not including)
 *                                                                 the first later line containing END
 *   [[lines tiles/forest.asm 1-12]]                               lines 1 to 12 of a file
 *
 * Usage: node scripts/build-docs.cjs [page.html ...]   (writes public/*.html; `npm run docs`)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXAMPLES = path.join(ROOT, 'examples');
const SOURCES = path.join(ROOT, 'docs', 'pages');
const PUBLIC = path.join(ROOT, 'public');
const STYLE = fs.readFileSync(path.join(ROOT, 'docs', 'style.css'), 'utf-8');

/** The example pages, in menu order. `file` is the name in public/. */
const PAGES = [
  { file: 'tile_examples.html', label: 'Tiles' },
  { file: 'sprite_examples.html', label: 'Sprites' },
  { file: 'map_examples.html', label: 'Map' },
  { file: 'font_examples.html', label: 'Font' },
  { file: 'level_examples.html', label: 'Level' },
  { file: 'music_examples.html', label: 'Music' },
];
const BOOK = { file: 'gameboy_book.html', label: 'Game Boy Assembly Introduction' };

const MNEMONICS = new Set(
  `LD LDH ADD ADC SUB SBC AND OR XOR CP INC DEC DAA CPL CCF SCF RLCA RLA RRCA RRA RLC RL RRC RR SLA SRA
SRL SWAP BIT RES SET JP JR CALL RET RETI RST PUSH POP NOP HALT STOP EI DI`.split(/\s+/)
);
const DIRECTIVES = new Set(
  `DB DW DS EQU DEF SECTION INCLUDE EXPORT PUSHS POPS IF ELSE ENDC MACRO ENDM REDEF EQUS RSRESET RSSET
RB RW INCBIN ASSERT REPT ENDR`.split(/\s+/)
);

const TOKEN = /(?<string>"[^"]*")|(?<char>'[^']')|(?<number>\$[0-9A-Fa-f]+|%[01]+|\b\d+\b)|(?<word>[A-Za-z_][\w.]*:{0,2}|\.[A-Za-z_]\w*:{0,2})/g;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls, text) => `<span class="${cls}">${esc(text)}</span>`;

/** The comment starts at the first ';' that is not inside a string or char literal. */
function splitComment(line) {
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];
    if (c === '"') {
      const j = line.indexOf('"', i + 1);
      i = j < 0 ? n : j + 1;
      continue;
    }
    if (c === "'" && i + 2 < n && line[i + 2] === "'") {
      i += 3;
      continue;
    }
    if (c === ';') return [line.slice(0, i), line.slice(i)];
    i++;
  }
  return [line, ''];
}

function highlightLine(rawLine) {
  const [code, comment] = splitComment(rawLine.replace(/\s+$/, ''));
  let out = '';
  let pos = 0;
  let seenOp = false;
  for (const m of code.matchAll(TOKEN)) {
    out += esc(code.slice(pos, m.index));
    const text = m[0];
    const { string, char, number } = m.groups;
    if (string || char) out += span('string', text);
    else if (number) out += span('number', text);
    else {
      const bare = text.replace(/:+$/, '');
      const after = code.slice(m.index + text.length);
      if (text.endsWith(':')) out += span('label', bare) + esc(text.slice(bare.length));
      else if (!seenOp && MNEMONICS.has(bare.toUpperCase())) {
        out += span('keyword', text);
        seenOp = true;
      } else if (!seenOp && DIRECTIVES.has(bare.toUpperCase())) {
        out += span('directive', text);
        seenOp = true;
      } else if (!seenOp && m.index === 0 && /^[ \t]+(DB|DW|DS|EQU)\b/i.test(after)) out += span('label', text);
      else out += esc(text);
    }
    pos = m.index + text.length;
  }
  out += esc(code.slice(pos));
  if (comment) out += span('comment', comment);
  return out;
}

const highlight = (code) =>
  code
    .replace(/^\n+|\n+$/g, '')
    .split('\n')
    .map(highlightLine)
    .join('\n');

const block = (inner) => `<pre><code>${inner}</code></pre>`;
const readExample = (name) => fs.readFileSync(path.join(EXAMPLES, name), 'utf-8');

/** Replace the [[...]] markers of a page source. */
function expand(text) {
  return text
    .replace(/\[\[asm\]\]\n?([\s\S]*?)\[\[\/asm\]\]/g, (_, code) => block(highlight(code)))
    .replace(/\[\[text\]\]\n?([\s\S]*?)\[\[\/text\]\]/g, (_, plain) => block(esc(plain.replace(/^\n+|\n+$/g, ''))))
    .replace(/\[\[file ([\w./-]+)\]\]/g, (_, name) => block(highlight(readExample(name))))
    .replace(/\[\[lines ([\w./-]+) (\d+)-(\d+)\]\]/g, (_, name, from, to) =>
      block(highlight(readExample(name).split('\n').slice(Number(from) - 1, Number(to)).join('\n')))
    )
    .replace(/\[\[part ([^\]]+)\]\]/g, (_, spec) => {
      const [name, start, end] = spec.split('|').map((s) => s.trim());
      const lines = readExample(name).split('\n');
      const i = lines.findIndex((l) => l.trim().startsWith(start));
      if (i < 0) throw new Error(`[[part ${spec}]]: no line starts with "${start}"`);
      let j = lines.length;
      if (end) {
        j = lines.findIndex((l, k) => k > i && l.includes(end));
        if (j < 0) throw new Error(`[[part ${spec}]]: no line after the start contains "${end}"`);
      }
      return block(highlight(lines.slice(i, j).join('\n').replace(/\s+$/, '')));
    });
}

function menu(currentFile) {
  const link = (p) =>
    `<a href="/${p.file}"${p.file === currentFile ? ' aria-current="page"' : ''}>${esc(p.label)}</a>`;
  return (
    `<nav class="examples-nav" aria-label="Documentation">\n` +
    `<strong>Examples:</strong> ${PAGES.map(link).join('\n')}\n` +
    `<span>&middot;</span> ${link(BOOK)}\n</nav>`
  );
}

/** Build one page from its source text. */
function buildPage(page, source) {
  const split = source.indexOf('\n---\n');
  if (split < 0) throw new Error(`${page.file}: the source needs a "---" line after the header`);
  const header = Object.fromEntries(
    source
      .slice(0, split)
      .split('\n')
      .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()])
  );
  for (const key of ['title', 'heading', 'subtitle']) if (!header[key]) throw new Error(`${page.file}: missing "${key}:" header line`);
  const body = expand(source.slice(split + 5));
  const leftover = body.match(/\[\[[^\]]*\]\]/g);
  if (leftover) throw new Error(`${page.file}: unprocessed markers ${leftover.slice(0, 3).join(' ')}`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(header.title)}</title>
<style>
${STYLE}</style>
</head>
<body>

<div class="title-block">
<div class="screen">
<h1>${esc(header.heading)}</h1>
<div class="subtitle">${esc(header.subtitle)}</div>
</div>
<div class="bezel-text">DOT MATRIX &middot; 160 &times; 144 &middot; 4 SHADES</div>
</div>

${menu(page.file)}

${body.replace(/^\n+/, '')}
</body>
</html>
`;
}

/** Build every page (or only the named ones). Returns { 'tile_examples.html': '<html>…', … }. */
function buildAll(only = []) {
  const result = {};
  for (const page of PAGES) {
    if (only.length && !only.includes(page.file)) continue;
    const sourceFile = path.join(SOURCES, page.file);
    result[page.file] = buildPage(page, fs.readFileSync(sourceFile, 'utf-8'));
  }
  return result;
}

if (require.main === module) {
  for (const [file, html] of Object.entries(buildAll(process.argv.slice(2)))) {
    fs.writeFileSync(path.join(PUBLIC, file), html);
    console.log(`wrote public/${file}`);
  }
}

module.exports = { buildAll, buildPage, expand, highlight, highlightLine, PAGES, BOOK };
