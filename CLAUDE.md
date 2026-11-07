# CLAUDE.md – Game Boy Editor

Game Boy (DMG) asset editor suite, a sibling of the ZX Spectrum editor at `/Users/genehunt/zx-editor/zxe` (reference implementation – consult it when porting an editor). Client-only Next.js app; no backend.

## Commands
- `npm run dev` – dev server · `npm run build` · `npm run lint`
- `npm test` – Jest + RTL with an 80% global coverage gate (Jest ignores `e2e/`)
- `npm run test:e2e` – Playwright end-to-end tests in a real browser (see "End-to-end tests" below)

## Conventions
- Pattern per editor: `hooks/useXDrawing.ts` (state/tools) + `hooks/useXProject.ts` (save/load/export) + `components/XCanvas.tsx` + `XToolbarContent.tsx` + `XInstructionsModal.tsx` + `app/(editor)/x_editor/page.tsx`.
- Project files are JSON with `version` and `type` fields; loaders reject the wrong `type`.
- Pixels are `number[][]` shade indices 0–3 (not `boolean[][]` as in the ZX app). Tests mirror source under `__tests__/`.
- Prefer one shared `downloadBlob` util over the per-hook copies the ZX app has.

## Status
- Phase 0 (scaffold): done.
- Phase 1 (foundations): done – `constants/`, `types/`, `utils/{drawing,encode,export,download}.ts` (2bpp encode/decode, RGBDS + C exporters), `FileNameModal` extended with `export2bpp`/`exportC`.
- Phase 2 (tile editor): done – `/tile_editor` with pencil/line/rubber/bucket/pan, 4-shade picker + palette presets, resize (≤384 tiles, ≤20 wide), tracing image, undo/redo, JSON save/load, import `.2bpp`, export RGBDS/C/`.2bpp` (trailing empty tiles trimmed; row-major tile order).
- Phase 3 (sprite editor): done – `/sprite_editor` reuses `TileCanvas` (new optional `onionPixels` prop). 8x8 / 8x16 OBJ mode, sprites up to 4x4 tiles (32x32 px) split into OAM entries (empty tiles skipped; 8x16 uses consecutive top/bottom tile pairs), ≤32 frames with per-frame duration (1/60 s ticks), onion skin, Play/loop preview, OBP0/OBP1 preview + palette/priority attribute bits, JSON save/load, export RGBDS/C (tiles + per-frame OAM lists + frame table + durations) and `.2bpp`. Code lives in `constants/sprite.ts`, `types/sprite.ts`, `utils/{sprite,spriteExport}.ts`, `hooks/useSprite{Drawing,Project}.ts`. Flip flags are left to runtime (OR into attr).
- Phase 4 (map editor): done – `/map_editor`: fixed 32x32 BG tile map (tile indices 0-255), tileset imported from tile editor JSON or `.2bpp` (trailing blank tiles trimmed; default is blank + solid), tools stamp/rectangle/fill/pick/rubber/pan, tile palette picker, BGP preview ($E4/$1B/$F9), optional grid and 20x18 screen overlay at SCX/SCY (wraps), undo/redo, JSON save/load (`<name>_map.json`), export RGBDS/C (tiles + map rows), raw `.tilemap`, `.2bpp`. Export area: full map / 20x18 screen at SCX/SCY / used area. Code: `constants/map.ts`, `types/map.ts`, `utils/{map,mapExport}.ts`, `hooks/useMap{Drawing,Project}.ts`, `components/{MapCanvas,TilePalette,MapToolbarContent,MapInstructionsModal}.tsx`. Not done: Window-layer overlay, PNG import.
- Phase 5 (font editor): done – `/font_editor`: 96 glyphs (ASCII 32-127), each an 8x8 2bpp tile. Reuses `TileCanvas` for the glyph pixel editor (new optional `heightClassName` prop), plus a 16-column glyph grid, text preview laid out at 20 chars/row, shade picker + palette presets, copy/paste glyph, clear glyph/all, "Load starter font" / "Reset to starter" (starter font = ZX ROM font bytes carried over from zx-editor, set pixels -> shade 3, in `utils/starterFont.ts`), undo/redo, JSON save/load (`<name>_font.json`), import `.2bpp` (1-96 glyphs), export RGBDS/C (all 96 glyphs, commented with ASCII code), `.2bpp` (1536 bytes), `.1bpp` (768 bytes, shades 2-3 = set). Code: `constants/font.ts`, `types/font.ts`, `utils/{font,fontExport,starterFont}.ts`, `hooks/useFont{Drawing,Project}.ts`, `components/Font*.tsx`.
- Phase 6 (metatile + level editors): done.
  - `/metatile_editor`: library of up to 256 metatiles (2x2 or 4x4 tiles; changing size keeps each metatile's top-left), each with a `solid` collision flag. Tileset imported via the shared `utils/tilesetImport.ts` (tile editor JSON or `.2bpp`, also now used by the map editor). Tools stamp/fill/pick/rubber, tile palette + metatile thumbnail palette, add/duplicate/delete/clear, undo/redo, JSON save/load (`<name>_metatiles.json`), export RGBDS/C (tiles used + metatile table + collision table) and `.2bpp`.
  - `/level_editor`: ONE scrolling level of up to 256x256 tiles (width/height in metatiles, max 128 for 2x2 / 64 for 4x4) instead of the ZX editor's separate screens. Library imported from a `metatiles` JSON (or embedded when loading a `level` JSON). Tools stamp/rectangle/fill/pick/rubber/pan, BGP preview, collision tint, 20x18 screen outline at SCX/SCY (tiles, no wrap), JSON save/load (`<name>_level.json`), export RGBDS/C (tiles + metatile table + collision + level map), expanded `.tilemap` (one tile index per tile), `.2bpp`.
  - Shared: `components/CellGridCanvas.tsx` (generic zoom/pan cell grid; metatile and level editors render cells from cached offscreen canvases via `utils/render.ts`), `components/MetatilePalette.tsx`, `utils/{grid,metatile,levelExport}.ts`, `constants/level.ts`, `types/metatile.ts`, hooks `useMetatile{Drawing,Project}.ts`, `useLevel{Drawing,Project}.ts`. `MapCanvas` (map editor) is a thin wrapper around it too (cached tile images, one `drawImage` per cell).
- Phase 7 (music editor + APU worklet): done – `/music_editor`. All seven editors are now real (the `StubEditor` placeholder component is gone).
  - Tracker: 4 channels (Pulse 1 with sweep, Pulse 2, Wave, Noise), patterns 4-128 rows (add/delete/resize), order list (the song loops), speed = frames (1/60 s) per row, octaves 2-7 (A4 = 440 Hz), keyboard note entry (Z-M / Q-U, `1` = note off, Backspace clears, arrows move), per-channel instrument + octave pickers, cell editor popover (note/octave/instrument/volume override for pulse+noise). No effect column (the ZX editor's effects were never played either) and no length counters.
  - Instruments (`Instruments…` modal): pulse (duty, hardware volume envelope, sweep), wave (32x4-bit drawn waveform, output level, shape presets), noise (7/15-bit LFSR, envelope). The noise note picks NR43 via `noiseNr43()` (closest clock to note pitch x 8). Preview button auditions an instrument; entering a note also sounds it.
  - Single source of truth: `utils/gbMusic.ts` turns cells into sound-register writes (`cellWrites`/`rowWrites`). The browser preview (`useMusicSequencer`), the APU emulator input and the exported players all use exactly these writes. Wave RAM is rewritten (DAC off, 16 bytes, DAC on) on every wave trigger.
  - Emulator: `public/gb-apu-worklet.js` (plain JS, loadable from Jest via `module.exports`) = pulse x2 + sweep, wave, noise LFSR, 64 Hz envelopes, 512 Hz frame sequencer, NR50/NR51 mixing, DC-blocking filter; wrapper `utils/gbApuEmulator.ts`.
  - Export: `utils/musicExport.ts` -> RGBDS (`name_init` / `name_update` per frame / `name_stop`, needs RGBDS >= 0.5) and a GBDK-2020 header with the same API. Data is a stream: per pattern `rows`, then per row a write count and (register low byte, value) pairs.
  - Verification beyond Jest: `__tests__/utils/rgbdsAssemble.test.ts` assembles and links every RGBDS export (tiles, sprite, map, font, metatiles, level, music) with the real `rgbasm`/`rgblink` when installed (skipped otherwise). The exported SM83 player was also executed in a throwaway SM83 interpreter (not in the repo) and made byte-for-byte the same register writes per frame as the TS engine over 180 frames incl. loop wrap. The GBDK C player and the real-hardware sound are NOT verified (no GBDK/emulator available).
- Phase 8 (documentation + runnable examples): done.
  - **Book**: `public/gameboy_book.html` is a copy of the Game Boy assembly book (the counterpart of the ZX editor's `z80_book.html`). Its source of truth is the separate repo `~/gamebook_assembly` (parts in `gameboy_book_src/`, built by `gameboy_tests/build_book.py`, tested there with PyBoy); re-copy the built `gameboy_book.html` when it changes. The navbar has a **Documentation** menu (`constants/docItems.ts`, `components/Navbar.tsx`) with the book and the six example pages; every editor's export dialog links to its example page (`docsLink`).
  - **Example programs** in `examples/` (see `examples/README.md`): `tiles/tile_viewer`, `sprite/sprite_demo`, `map/map_viewer`, `font/font_demo`, `level/level_demo` (collision + camera), `music/music_demo`. Each INCLUDEs the editor's real export next to it (`forest.asm`, `hero.asm`, `meadow.asm`, `gbfont.asm`, `cave.asm`, `song.asm`) and has the editor project it came from (`*_tiles.json`, `*_sprite.json`, ... loadable with Load project). `common/hardware.inc` extends the book's file of the same name; `common/util.inc` has the shared routines (reserves the interrupt vectors with `reti`). `make` builds them (RGBDS), `make run-<dir>/<program>` opens mGBA.
  - **Example pages**: `public/{tile,sprite,map,font,level,music}_examples.html` are GENERATED from `docs/pages/*.html` by `npm run docs` (`scripts/build-docs.cjs`, same `[[file]]`/`[[part]]`/`[[lines]]`/`[[asm]]`/`[[text]]` markers as the book, highlighter ported from the book's `build_book.py`, stylesheet `docs/style.css` copied from the book). Listings come straight from the example sources, so they cannot drift; a test fails if `public/` is stale. Edit `docs/pages`, then run `npm run docs`.
  - **Verification**: `examples/verify_examples.py` (PyBoy, needs `pip install pyboy numpy`; not run by Jest) runs every ROM headless: the emulated screen must equal, pixel for pixel, a picture drawn from the project JSON (tiles, both sprite frames, map incl. scrolling, typed font text, level + camera); the level demo is walked with random input and compared to an independent collision model; the music demo is checked with PyBoy's own APU (the first row's C5/C4/C3 are the loudest frequencies) - this confirms the whole chain tracker -> export -> SM83 player -> real APU. Jest (`__tests__/examples.test.ts`, `__tests__/docs/`) checks that each committed `.asm` is exactly the editor's export of its project JSON (`utils/projectExport.ts`), that every project loads in its editor's `loadProject`, that every example assembles/links/fixes with no warnings (skipped without RGBDS), and the docs build/links/anchors.
  - Found and fixed by this phase: an example's tile data was not exported because no metatile used it (the level now has a flower metatile, documented); a level border hole; stale ZX "Z80" wording in the export dialog and its tests (some "should not show" assertions had been passing vacuously). Not verified: the GBDK C snippets on the pages (no GBDK installed).
- All planned phases are done. Possible next steps: GBC colour support, hUGEDriver export, PNG import for the map editor, Window-layer overlay.

- Home page (`app/page.tsx`): hero (dot grid, glows, feature chips, gradient VT323 title) and seven decorative tiles in a centred wrapping flex list (1/2/3/4 across, short last row centred). Per-editor data (description, accent colour, 12x12 pixel-art icon) lives in `constants/editorCards.ts`; `components/PixelIcon.tsx` draws the art as SVG in the DMG greens. Tiles keep `aria-label` = the editor name (tests and e2e match it exactly); hover/focus use the tile's `--accent`, movement only under `motion-safe:`. Tests: `__tests__/app/pages.test.tsx`, `__tests__/components/PixelIcon.test.tsx`, `e2e/home.spec.ts`.

Everything below is the original plan.

---


## Context
`/Users/genehunt/zx-editor/zxe` is a Next.js 16 / React 19 / TS / Tailwind 4 client-only suite of retro asset editors for the ZX Spectrum (UDG, software sprite, scene/.scr, tile, level, charset, AY music). We want a sibling app, **Game Boy Editor**, in `/Users/genehunt/gameboy-editor` (currently only `.git` + LICENSE) that mimics each ZX section where sensible, targeting **DMG (original Game Boy) only** and exporting **RGBDS assembly + GBDK-2020 C arrays** (plus raw binaries).

This turn: plan + scaffolding only. Deliverables: (1) `gameboy-editor/CLAUDE.md` containing this plan, (2) the empty project skeleton (config, folders, stub pages, shared code copied from zx-editor). Editor features are implemented in later phases, one at a time.

## Key hardware differences driving the design
| ZX Spectrum | Game Boy (DMG) |
|---|---|
| 1bpp pixels + 8x8 attribute (ink/paper/bright) → colour clash | 2bpp pixels, 4 shades, no clash; colour via palette registers (BGP/OBP0/OBP1) |
| 256x192 screen, `.scr` 6912 bytes interleaved | 160x144 LCD (20x18 tiles) viewing a 32x32-tile BG map; tile-based, no framebuffer |
| UDGs (max 21), software sprites w/ pre-shift + mask | 384 tiles VRAM; 40 hardware OAM sprites, 8x8 or 8x16, colour 0 transparent, h/v flip, priority, OBP0/1 – no mask/pre-shift needed |
| Z80 asm / pasmo | SM83 asm / RGBDS; C / GBDK-2020 |
| AY-3-8912, 3 tone + noise | APU: 2 pulse (CH1 has sweep), wave (32×4-bit), noise |

Tile encoding: each 8x8 tile = 16 bytes, per row 2 bytes (low bitplane, high bitplane), pixel 0 = leftmost = bit 7.

## Section mapping (ZX → Game Boy)
1. **Tile editor** (replaces ZX UDG editor `/sprite_editor`): edit a tileset of 8x8 2bpp tiles (grid of up to 256 BG / 384 total), tools pencil/line/rubber/bucket/pan + shade picker (4 shades), tracing image kept. Exports `.2bpp`, RGBDS `db` / C `const unsigned char[]`, JSON.
2. **Sprite editor** (replaces `/player_sprite_editor`): 8x8 and 8x16 (also composite multi-OAM metasprites e.g. 16x16, 16x24), up to 32 frames, per-frame duration, FPS playback, onion skin. Colour 0 = transparent; OBP0/OBP1 preview, flip-X/Y/priority flags per OAM entry. Drops mask/pre-shift/interleave options (not applicable). Exports tile data + frame table + OAM attribute lists.
3. **Background map editor** (replaces `/scene_editor`): paint tiles from a tileset onto a 32x32 BG map with a 160x144 viewport overlay (SCX/SCY), optional Window layer overlay; grid; replaces attribute-clash logic with BGP palette preview. Import/export tilemap `.tilemap`/`.tmap`, RGBDS/C, JSON. Includes "import PNG → tileset + map" with dedupe/4-shade quantise (optional later).
4. **Metatile editor** (replaces `/tile_editor` multi-cell tiles): 2x2 (16px) and 3x3? → 2x2 and 4x4 tile metatiles composed from the tileset, saved as JSON, exported as metatile tables.
5. **Level editor** (`/level_editor`): metatile library painted on multi-screen/scrolling maps (max 256x256 tiles), collision flag per metatile. Exports map data, metatile table, collision table, `draw`/load routine.
6. **Font editor** (replaces `/charset_editor`): 96 ASCII glyphs (32–127) 8x8, default starter font, 2bpp tile export (usually shades 0/3), `.2bpp`, RGBDS, C, JSON.
7. **Sound/Music editor** (replaces AY `/music_editor`): 4-channel tracker (Pulse1, Pulse2, Wave, Noise), patterns 4–128 rows, order list, ticks per row (60 Hz frame), instruments (duty, volume envelope, sweep for CH1, 4-bit wave table editor for CH3, LFSR width/divisor for noise). New `public/gb-apu-worklet.js` emulating the APU for preview; `utils/gbApuEmulator.ts` mirrors `ayEmulator.ts`. Exports RGBDS data + simple VBlank player (`NRxx` register writes) and C data.

Out of scope initially: GBC colour, in-browser assembler/emulator, `.gb` ROM build, hUGEDriver format (possible later export).

## Architecture (reuse from zx-editor)
Stack identical to `zxe/`: Next 16.1.3 App Router, React 19, TS strict, Tailwind 4, react-icons, Jest 30 + RTL, ESLint 9, 80% coverage gate. Project lives at repo root (no nested `zxe/` folder), `@/*` alias.

Copy-and-adapt (generic) from `/Users/genehunt/zx-editor/zxe`:
- `hooks/useHistory.ts`, `hooks/useUndoRedoShortcuts.ts`
- `utils/drawing.ts` (`getLinePoints`, bounds) – `createEmptyPixels` becomes `number[][]` (0–3)
- `components/` shared: `Navbar`, `EditorToolbar`, `FileNameModal`, `InfoTooltip`, `UndoRedoButtons`, instructions-modal pattern (localStorage flag)
- `app/layout.tsx`, `(editor)/layout.tsx`, `globals.css`, jest/eslint/postcss/tsconfig configs
- Each editor keeps the pattern: `useXDrawing` + `useXProject` hooks, `XCanvas`, `XToolbarContent`, `XInstructionsModal`, JSON `{version, type}` project files.

New/rewritten (GB-specific): `constants/index.ts` (DMG shades & palette presets: classic green, grey, pocket; screen/tile/OAM limits; APU constants), `types/index.ts` (pixels `number[][]` 0–3, Tile, Tileset, Sprite, Metatile, BGMap, Level, Pattern/Instrument), `utils/encode.ts` (2bpp encode/decode, shared by all exporters), `utils/export.ts` (RGBDS + C exporters), `utils/musicExport.ts`, shade/palette picker replacing `ColorPicker`, BGP/OBP palette-remap control. Refactor opportunity: one shared `downloadBlob` util instead of per-hook copies.

## Scaffolding layout
```
gameboy-editor/
  CLAUDE.md            # this plan + conventions
  README.md  .gitignore  LICENSE (exists)
  package.json  tsconfig.json  next.config.ts  postcss.config.mjs
  eslint.config.mjs  jest.config.js  jest.setup.js
  app/ layout.tsx page.tsx globals.css
       (editor)/layout.tsx
       (editor)/{tile_editor,sprite_editor,map_editor,metatile_editor,level_editor,font_editor,music_editor}/page.tsx   # stubs
  components/  hooks/  utils/  constants/  types/
  public/      # gb-apu-worklet.js later, docs pages later
  examples/    # RGBDS + GBDK demo projects later
  __tests__/   # mirrors source
```

## Implementation phases
0. **Scaffold** (this task): `git`-tracked skeleton, `package.json` (deps matching zx-editor), configs, stub pages with working Navbar/landing page, `CLAUDE.md`, `npm install`, confirm `npm run build`, `npm test`, `npm run lint` pass.
1. Foundations: constants, types, 2bpp encode/decode + tests, shared hooks/components ported.
2. Tile editor end-to-end (canvas, tools, save/load, export).
3. Sprite editor. 4. Background map editor. 5. Font editor. 6. Metatile + level editors. 7. Music editor + APU worklet. 8. Docs pages, examples (RGBDS/GBDK that assemble and run in an emulator), polish.
Each phase ends with tests ≥80% coverage and a manual browser check.

## Verification (scaffold phase)
- `cd /Users/genehunt/gameboy-editor && npm install && npm run build && npm run lint && npm test` all succeed.
- `npm run dev`: landing page and all 7 stub routes render with Navbar.
- `CLAUDE.md` exists in the folder and contains this plan.
- Later phases: round-trip tests for 2bpp encoding against known byte patterns; assemble exported RGBDS (`rgbasm`/`rgblink`) and build GBDK output, run in an emulator (e.g. SameBoy/mGBA).

## Review fixes (after the first code review)
- `hooks/useMusicSequencer.ts`: `play()` has a `starting` guard (double Play = one player; Stop during audio start-up cancels it; a failed start recovers). The channel Ins/Oct pickers now only choose what NEW notes use (they used to rewrite every existing note, flattening melodies). `removeInstrument` moves notes and channel selections that used it to the first instrument of the channel's kind, and `canRemoveInstrument` forbids removing the last instrument of a kind (the modal disables Delete with a reason).
- `hooks/useEditStream.ts`: a stream of edits (slider drag, typing a name or a frame duration) is ONE undo step (`EDIT_STREAM_MS` = 800 ms per key). Used by instrument and sprite-duration edits.
- `components/NumberField.tsx`: every number input uses it; typed text is applied on Enter/blur (typing "32" no longer passes through a destructive "3"), spinner-arrow changes apply at once.
- `hooks/useSpriteDrawing.ts`: `objSize` is part of the undo history (undo after switching to 8x16 used to leave an odd height with 8x16 mode and silently drop a tile row on export). `useSpriteProject` refuses to export a sprite needing more than 256 tiles (tile numbers are one byte).
- `utils/validate.ts` (`isIntIn`, `isShade`): the tile and sprite loaders no longer accept null / "2" / 1.5 pixels or durations over 255.
- `hooks/useUndoRedoShortcuts.ts`: ignores text fields (native undo works while typing a file name), Mac redo (Cmd+Shift+Z reports key `Z`) and Ctrl+Shift+Z work.
- `utils/download.ts`: the anchor is attached to the document and the object URL is revoked after 1 s.

## Review fixes, round 2
- `hooks/useMusicSequencer.ts`: a channel's instrument for new notes is remembered by instrument **id** (derived index `channelInstrument`), so deleting an instrument and undoing it restores the selection; a wrong-kind/missing selection falls back to the first instrument of the channel's kind. `cursorRow` is clamped to the selected pattern, and `setCell`/`enterNote` ignore rows that do not exist (no sound, no undo step). The 600 ms preview auto-off no longer silences a note the song is playing, and Stop / starting the song cancel pending previews.
- `hooks/useEditStream.ts` returns `[pushOnce, reset]`; undo, redo and loading call `reset`, so an edit right after an undo always gets its own undo step (music and sprite hooks).
- `useTileDrawing` / `useSpriteDrawing`: `resizeCanvas` ignores non-whole sizes (2.5 used to be accepted); tracing-image object URLs are revoked on load/error.
- `utils/gbApuEmulator.ts`: a failed audio start is not cached (the next Play retries) and the failed `AudioContext` is closed.
- `utils/gbMusic.ts` `isValidSong`: every note's instrument must exist and match its channel's kind.
- `utils/map.ts` `cropMap('used')`: a map of only tile 0 exports in full instead of 1x1 (tile 0 always counts as empty; the toolbar says so).
- `components/FileNameModal.tsx`: removed the ZX leftovers (`exportScr`, `exportChr`); an unknown action falls back to ASM instead of crashing.
- `components/MapCanvas.tsx` is rebuilt on `CellGridCanvas` with cached tile images (was ~65k `fillRect` per repaint; now one `drawImage` per cell, and a test pins that).

## End-to-end tests (Playwright)
- `npm run test:e2e` builds the app, starts it (`next start -p 3100`, reused if already running) and drives it in Chromium: 221 tests in `e2e/*.spec.ts` (`npm run test:e2e -- e2e/tile-editor.spec.ts --headed` for one file). `PW_ALL_BROWSERS=1` adds Firefox and WebKit (`npx playwright install firefox webkit` first; not run here).
- `@playwright/test` is pinned to **1.60.0**: newer releases refuse to install browsers on macOS 13, and 1.60 uses the Chromium build already cached on this machine. Bump it when the OS is upgraded.
- `e2e/fixtures.ts`: every test fails on a console error or page error, and the first-visit "How to use" dialogs are pre-dismissed (`test.use({ skipInstructions: false })` to see them). `e2e/helpers.ts`: load a project through the real file input, export through the real dialog and read the download, sample canvas pixels, type into number fields. `e2e/audio.ts`: puts an `AnalyserNode` behind the app's AudioWorklet so tests can measure the actual sound (peak level, pitch strength, silence after Stop).
- What they cover: navigation and the Documentation menu; for every editor, load the example project -> export -> byte-identical to the committed `examples/**.asm` (and Save writes the same project back); drawing/painting with real mouse and keyboard and reading the canvas pixels; undo/redo shortcuts (including not hijacking Ctrl+Z inside text fields); real typing into number fields; layout (toolbar width, nothing clipped or unreachable at several window sizes); the music editor's real sound (pitch of entered notes, Play/Stop, preview not cutting the song, the example song's first chord); the example pages and the book (links, anchors, highlighting, phone width, WCAG contrast).
- Keys: use `ControlOrMeta+z` (the app uses Cmd on a Mac, Ctrl elsewhere). Playwright name matching is a substring match: use `exact: true` ("Tile Editor" also matches "Metatile Editor").
- Bugs these found that jsdom unit tests could not see (fixed): the fixed toolbar had no width and grew to 750-900 px, covering most of the canvas (`EditorToolbar` now defaults to `w-[220px]`, matching the `ml-[220px]` of the pages); big canvases (the 768 px map) were centred with `items-center`, which clipped the top rows out of reach under the navbar, and the work area was `100vh` although the page starts 40 px lower (now `m-auto` centring and `h-[calc(100vh-40px)]`).
