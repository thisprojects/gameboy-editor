import { test, expect } from './fixtures';
import { exportFile, examplePath, readExample, loadProject } from './helpers';

/**
 * For every editor: load the example project through the real file input, export it, and compare with the
 * files in examples/ (which the example programs include and the emulator tests run).
 */
const EDITORS = [
  { route: '/tile_editor', dir: 'tiles', name: 'forest', suffix: 'tiles' },
  { route: '/sprite_editor', dir: 'sprite', name: 'hero', suffix: 'sprite' },
  { route: '/map_editor', dir: 'map', name: 'meadow', suffix: 'map' },
  { route: '/font_editor', dir: 'font', name: 'gbfont', suffix: 'font' },
  { route: '/level_editor', dir: 'level', name: 'cave', suffix: 'level' },
  { route: '/music_editor', dir: 'music', name: 'song', suffix: 'music' },
];

for (const { route, dir, name, suffix } of EDITORS) {
  test.describe(`${route}`, () => {
    test(`loading ${name}_${suffix}.json and exporting RGBDS gives exactly examples/${dir}/${name}.asm`, async ({ page }) => {
      await page.goto(route);
      await loadProject(page, examplePath(`${dir}/${name}_${suffix}.json`));
      const exported = await exportFile(page, 'Export RGBDS (.asm)', 'Export ASM', name);
      expect(exported.name).toBe(`${name}.asm`);
      expect(exported.data.toString('utf-8')).toBe(readExample(`${dir}/${name}.asm`));
    });

    test('saving the loaded project writes the same project back', async ({ page }) => {
      await page.goto(route);
      await loadProject(page, examplePath(`${dir}/${name}_${suffix}.json`));
      const saved = await exportFile(page, 'Save project', 'Save', name);
      expect(saved.name).toBe(`${name}_${suffix}.json`);
      expect(JSON.parse(saved.data.toString('utf-8'))).toEqual(JSON.parse(readExample(`${dir}/${name}_${suffix}.json`)));
    });

    test('loading the project updates the file name suggested for exports', async ({ page }) => {
      await page.goto(route);
      await loadProject(page, examplePath(`${dir}/${name}_${suffix}.json`));
      await page.getByRole('button', { name: 'Save project', exact: true }).click();
      await expect(page.locator('div.fixed input[type="text"]')).toHaveValue(name);
    });

    test('the export dialog links to the matching example page', async ({ page }) => {
      await page.goto(route);
      await page.getByRole('button', { name: 'Export RGBDS (.asm)', exact: true }).click();
      const link = page.getByRole('link', { name: 'How do I use this on a Game Boy?' });
      await expect(link).toBeVisible();
      const href = (await link.getAttribute('href'))!;
      const response = await page.request.get(href);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain('Game Boy');
    });
  });
}

test.describe('metatile editor', () => {
  test('loads a metatile library, exports tiles, metatiles and collision, and saves it back', async ({ page }) => {
    const level = JSON.parse(readExample('level/cave_level.json'));
    const library = { version: 1, type: 'metatiles', size: level.size, tiles: level.tiles, metatiles: level.metatiles };
    await page.goto('/metatile_editor');
    await page.getByTestId('project-input').setInputFiles({
      name: 'cave_metatiles.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(library)),
    });
    await expect(page.getByText(/Metatiles — 0 of 7/)).toBeVisible();

    const asm = (await exportFile(page, 'Export RGBDS (.asm)', 'Export ASM', 'cave')).data.toString('utf-8');
    expect(asm).toContain('DEF CAVE_METATILE_COUNT EQU 7');
    expect(asm).toContain('DEF CAVE_METATILE_SIZE EQU 2');
    expect(asm).toContain('cave_metatiles::');
    expect(asm).toContain('cave_collision::');
    expect(asm).not.toContain('cave_map::'); // a library has no level map
    // the same metatile table and collision table the level export contains
    const levelAsm = readExample('level/cave.asm');
    for (const section of [/cave_metatiles::[\s\S]*?cave_collision::\n.*\n/]) {
      expect(asm.match(section)![0]).toBe(levelAsm.match(section)![0]);
    }

    const saved = await exportFile(page, 'Save project', 'Save', 'cave');
    expect(saved.name).toBe('cave_metatiles.json');
    expect(JSON.parse(saved.data.toString('utf-8'))).toEqual(library);
  });
});

test.describe('loading bad files', () => {
  const BAD = [
    { route: '/tile_editor', file: 'sprite/hero_sprite.json', alert: /not a Game Boy tileset project/ },
    { route: '/sprite_editor', file: 'tiles/forest_tiles.json', alert: /not a Game Boy sprite project/ },
    { route: '/map_editor', file: 'font/gbfont_font.json', alert: /not a Game Boy map project/ },
    { route: '/font_editor', file: 'map/meadow_map.json', alert: /not a Game Boy font project/ },
    { route: '/level_editor', file: 'music/song_music.json', alert: /not a Game Boy level project/ },
    { route: '/music_editor', file: 'level/cave_level.json', alert: /not a Game Boy music project/ },
  ];
  for (const { route, file, alert } of BAD) {
    test(`${route} refuses another editor's project with a clear message`, async ({ page }) => {
      const message = new Promise<string>((resolve) =>
        page.once('dialog', async (dialog) => {
          resolve(dialog.message());
          await dialog.accept();
        })
      );
      await page.goto(route);
      await loadProject(page, examplePath(file));
      expect(await message).toMatch(alert);
    });
  }

  test('a file that is not JSON is refused', async ({ page }) => {
    const message = new Promise<string>((resolve) =>
      page.once('dialog', async (dialog) => {
        resolve(dialog.message());
        await dialog.accept();
      })
    );
    await page.goto('/tile_editor');
    await page.getByTestId('project-input').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{oops') });
    expect(await message).toMatch(/invalid JSON/);
  });
});
