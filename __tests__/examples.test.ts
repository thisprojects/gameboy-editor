import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { renderHook, act } from '@testing-library/react';
import { exportProjectRGBDS } from '@/utils/projectExport';
import { useTileProject } from '@/hooks/useTileProject';
import { useSpriteProject } from '@/hooks/useSpriteProject';
import { useMapProject } from '@/hooks/useMapProject';
import { useFontProject } from '@/hooks/useFontProject';
import { useLevelProject } from '@/hooks/useLevelProject';
import { useMusicProject } from '@/hooks/useMusicProject';

const EXAMPLES = path.join(__dirname, '..', 'examples');
const read = (file: string) => fs.readFileSync(path.join(EXAMPLES, file), 'utf-8');

/** examples/<dir>/<name>_<suffix>.json -> the editor project, and name.asm: the editor's export of it */
const PROJECTS = [
  { dir: 'tiles', name: 'forest', suffix: 'tiles', type: 'tileset' },
  { dir: 'sprite', name: 'hero', suffix: 'sprite', type: 'sprite' },
  { dir: 'map', name: 'meadow', suffix: 'map', type: 'map' },
  { dir: 'font', name: 'gbfont', suffix: 'font', type: 'font' },
  { dir: 'level', name: 'cave', suffix: 'level', type: 'level' },
  { dir: 'music', name: 'song', suffix: 'music', type: 'music' },
];

describe('example projects', () => {
  it.each(PROJECTS)('$dir/$name.asm is exactly what the editor exports from $name_$suffix.json', ({ dir, name, suffix, type }) => {
    const project = JSON.parse(read(`${dir}/${name}_${suffix}.json`));
    expect(project.type).toBe(type);
    expect(exportProjectRGBDS(project, name)).toBe(read(`${dir}/${name}.asm`));
  });

  it('every project file in examples/ is listed above', () => {
    const found = fs.readdirSync(EXAMPLES, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => fs.readdirSync(path.join(EXAMPLES, d.name)).filter((f) => f.endsWith('.json')).map((f) => `${d.name}/${f}`))
      .sort();
    expect(found).toEqual(PROJECTS.map((p) => `${p.dir}/${p.name}_${p.suffix}.json`).sort());
  });

  describe('exportProjectRGBDS', () => {
    it('exports a metatile library and returns null for anything else', () => {
      const level = JSON.parse(read('level/cave_level.json'));
      const lib = exportProjectRGBDS({ ...level, type: 'metatiles' }, 'set')!;
      expect(lib).toContain('set_metatiles::');
      expect(lib).not.toContain('set_map::');
      expect(exportProjectRGBDS({ type: 'nope' }, 'x')).toBeNull();
      expect(exportProjectRGBDS(null, 'x')).toBeNull();
    });
  });
});

/** Make the next FileReader deliver `content` to readAsText. */
function deliver(content: string) {
  jest.spyOn(global, 'FileReader').mockImplementation(function (this: FileReader) {
    const self = this as unknown as { onload: (e: unknown) => void };
    (this as unknown as Record<string, unknown>).readAsText = () => self.onload({ target: { result: content } });
    return this;
  } as unknown as typeof FileReader);
}
const pick = (name: string) => ({ target: { files: [new File(['x'], name)], value: 'x' } }) as unknown as React.ChangeEvent<HTMLInputElement>;

describe('"Load project" accepts the example project files', () => {
  beforeEach(() => (global.alert as jest.Mock).mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('tile editor', () => {
    deliver(read('tiles/forest_tiles.json'));
    const loadProjectData = jest.fn();
    const { result } = renderHook(() => useTileProject({ pixels: [], tilesWidth: 1, tilesHeight: 1, fileName: 'x', setFileName: jest.fn(), loadProjectData }));
    act(() => result.current.loadProject(pick('forest_tiles.json')));
    expect(global.alert).not.toHaveBeenCalled();
    expect(loadProjectData).toHaveBeenCalledWith(4, 2, expect.any(Array));
  });

  it('sprite editor', () => {
    deliver(read('sprite/hero_sprite.json'));
    const loadProjectData = jest.fn();
    const { result } = renderHook(() =>
      useSpriteProject({ frames: [], tilesWidth: 1, tilesHeight: 1, objSize: '8x8', palette: 0, priority: false, fileName: 'x', setFileName: jest.fn(), loadProjectData })
    );
    act(() => result.current.loadProject(pick('hero_sprite.json')));
    expect(global.alert).not.toHaveBeenCalled();
    expect(loadProjectData).toHaveBeenCalledWith(expect.objectContaining({ objSize: '8x16', tilesWidth: 2, tilesHeight: 2 }));
    expect(loadProjectData.mock.calls[0][0].frames).toHaveLength(2);
  });

  it('map editor', () => {
    deliver(read('map/meadow_map.json'));
    const loadProjectData = jest.fn();
    const { result } = renderHook(() =>
      useMapProject({ map: [], tiles: [], scx: 0, scy: 0, exportArea: 'full', fileName: 'x', setFileName: jest.fn(), loadProjectData, setTileset: jest.fn() })
    );
    act(() => result.current.loadProject(pick('meadow_map.json')));
    expect(global.alert).not.toHaveBeenCalled();
    expect(loadProjectData.mock.calls[0][0].tiles).toHaveLength(8);
  });

  it('font editor', () => {
    deliver(read('font/gbfont_font.json'));
    const loadFontData = jest.fn();
    const { result } = renderHook(() => useFontProject({ glyphs: [], fileName: 'x', setFileName: jest.fn(), loadFontData }));
    act(() => result.current.loadProject(pick('gbfont_font.json')));
    expect(global.alert).not.toHaveBeenCalled();
    expect(loadFontData.mock.calls[0][0]).toHaveLength(96);
  });

  it('level editor, and the metatile editor can load the same library', () => {
    const level = read('level/cave_level.json');
    deliver(level);
    const loadProjectData = jest.fn();
    const hook = renderHook(() =>
      useLevelProject({ map: [], size: 2, tiles: [], metatiles: [], fileName: 'x', setFileName: jest.fn(), loadProjectData, setLibrary: jest.fn() })
    );
    act(() => hook.result.current.loadProject(pick('cave_level.json')));
    expect(global.alert).not.toHaveBeenCalled();
    expect(loadProjectData.mock.calls[0][0].map).toHaveLength(16);
    expect(loadProjectData.mock.calls[0][0].library.metatiles).toHaveLength(7);
  });

  it('music editor', () => {
    deliver(read('music/song_music.json'));
    const loadMusicData = jest.fn();
    const { result } = renderHook(() => useMusicProject({ patterns: [], instruments: [], orderList: [0], ticksPerRow: 6, fileName: 'x', setFileName: jest.fn(), loadMusicData }));
    act(() => result.current.loadProject(pick('song_music.json')));
    expect(global.alert).not.toHaveBeenCalled();
    expect(loadMusicData.mock.calls[0][0]).toMatchObject({ orderList: [0, 1], ticksPerRow: 6 });
  });
});

const rgbds = ['rgbasm', 'rgblink', 'rgbfix'].every((tool) => spawnSync(tool, ['--version']).status === 0);

(rgbds ? describe : describe.skip)('the example programs assemble, link and get a valid header', () => {
  const programs = read('Makefile').match(/^PROGRAMS := (.*)$/m)![1].split(/\s+/);
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gbe-examples-'));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it.each(programs)('%s', (program) => {
    const [folder, base] = program.split('/');
    const run = (cmd: string, args: string[]) => {
      const r = spawnSync(cmd, args, { cwd: EXAMPLES });
      return { status: r.status, stderr: r.stderr.toString() };
    };
    const obj = path.join(dir, `${base}.o`);
    const rom = path.join(dir, `${base}.gb`);
    const assembled = run('rgbasm', ['-I', 'common/', '-I', `${folder}/`, '-o', obj, `${program}.asm`]);
    expect(assembled.stderr).toBe(''); // no warnings either
    expect(assembled.status).toBe(0);
    expect(run('rgblink', ['-o', rom, obj])).toEqual({ status: 0, stderr: '' });
    expect(run('rgbfix', ['-v', '-p', '0xFF', rom])).toEqual({ status: 0, stderr: '' });
    expect(fs.statSync(rom).size).toBe(32768);
  });
});
