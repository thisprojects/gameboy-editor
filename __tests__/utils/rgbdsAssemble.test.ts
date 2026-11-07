/**
 * Assembles and links every RGBDS export with the real toolchain. Skipped when rgbasm/rgblink are not installed.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { encodeTiles, createBlankTile, createSolidTile } from '@/utils/map';
import { exportTilesRGBDS } from '@/utils/export';
import { encodeTileset } from '@/utils/encode';
import { layoutSprite } from '@/utils/sprite';
import { exportSpriteRGBDS } from '@/utils/spriteExport';
import { exportMapRGBDS } from '@/utils/mapExport';
import { exportFontRGBDS } from '@/utils/fontExport';
import { encodeGlyphs, starterGlyphs } from '@/utils/font';
import { exportMetatilesRGBDS, exportLevelRGBDS } from '@/utils/levelExport';
import { createMetatile } from '@/utils/metatile';
import { exportMusicRGBDS } from '@/utils/musicExport';
import { createPattern, createInstrument } from '@/utils/gbMusic';
import { PRESET_INSTRUMENTS } from '@/constants/musicPresets';
import { createEmptyPixels } from '@/utils/drawing';

const available = ['rgbasm', 'rgblink'].every((tool) => spawnSync(tool, ['--version']).status === 0);
const suite = available ? describe : describe.skip;

function sampleSong() {
  const instruments = PRESET_INSTRUMENTS.map((p, i) => ({ id: `i${i}`, ...p }));
  const a = createPattern('p0', 'P0', 8);
  const b = createPattern('p1', 'P1', 4);
  a.cells[0][0] = { note: 'C', octave: 4, instrument: 0, volume: null };
  a.cells[0][4] = { note: 'OFF', octave: 4, instrument: null, volume: null };
  a.cells[1][2] = { note: 'G', octave: 3, instrument: 3, volume: 9 };
  a.cells[2][0] = { note: 'A', octave: 3, instrument: 4, volume: null };
  a.cells[3][1] = { note: 'C', octave: 4, instrument: 8, volume: null };
  b.cells[3][0] = { note: 'F#', octave: 5, instrument: 6, volume: null };
  return { patterns: [a, b], instruments, orderList: [0, 1, 0], ticksPerRow: 3 };
}

suite('RGBDS exports assemble and link', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gbe-rgbds-'));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function check(name: string, source: string) {
    const asm = path.join(dir, `${name}.asm`);
    const obj = path.join(dir, `${name}.o`);
    const rom = path.join(dir, `${name}.gb`);
    fs.writeFileSync(asm, source);
    const assembled = spawnSync('rgbasm', ['-o', obj, asm]);
    expect(assembled.stderr.toString()).toBe('');
    expect(assembled.status).toBe(0);
    const linked = spawnSync('rgblink', ['-o', rom, obj]);
    expect(linked.stderr.toString()).toBe('');
    expect(linked.status).toBe(0);
  }

  const tiles = [createBlankTile(), createSolidTile(3), createSolidTile(1)];
  const tileData = encodeTiles(tiles);
  const metatiles = [createMetatile(2, 0), createMetatile(2, 1, true)];

  it('tiles', () => {
    const px = createEmptyPixels(16, 8);
    px[0][0] = 3;
    check('tiles', exportTilesRGBDS('my tiles', encodeTileset(px, 2, 2)));
  });

  it('sprite', () => {
    const f = createEmptyPixels(16, 16);
    f[0][0] = 3;
    f[9][9] = 2;
    check('sprite', exportSpriteRGBDS('hero', { layout: layoutSprite([{ pixels: f }, { pixels: f }], 2, 2, '8x8'), durations: [6, 6], palette: 1, priority: true }));
  });

  it('map', () => check('map', exportMapRGBDS('level 1', { map: [[0, 1], [1, 2]], tileData })));
  it('font', () => check('font', exportFontRGBDS('font', encodeGlyphs(starterGlyphs()))));
  it('metatiles', () => check('metatiles', exportMetatilesRGBDS('set', { tileData, metatiles, size: 2 })));
  it('level', () => check('lvl', exportLevelRGBDS('lvl', { tileData, metatiles, size: 2, map: [[0, 1, 1], [1, 0, 0]] })));
  it('music', () => check('song', exportMusicRGBDS('song', sampleSong())));
  it('music with a single pattern and one order entry', () => {
    const s = sampleSong();
    check('song1', exportMusicRGBDS('s1', { ...s, patterns: [s.patterns[0]], orderList: [0] }));
  });
  it('music with a freshly created instrument of each kind', () => {
    const s = sampleSong();
    const instruments = [createInstrument('a', 'A', 'pulse'), createInstrument('b', 'B', 'wave'), createInstrument('c', 'C', 'noise')];
    check('song2', exportMusicRGBDS('s2', { ...s, instruments }));
  });
});
