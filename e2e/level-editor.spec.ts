import { test, expect } from './fixtures';
import { exportFile, examplePath, readExample, loadProject, pixelAt, clickAt, canvasSize, typeNumber } from './helpers';
import type { Page } from '@playwright/test';

const LEVEL = 'level-canvas';
const PALETTE = 'metatile-palette';
const LIGHTEST = '#9bbc0f';
const DARKEST = '#0f380f';
const CELL = 32; // a 2x2-tile metatile is 16 pixels, at zoom 2
const mid = (n: number) => n * CELL + CELL / 2;
const metatile = (n: number) => ({ x: (n % 5) * 36 + 18, y: Math.floor(n / 5) * 36 + 18 });

const cave = JSON.parse(readExample('level/cave_level.json')) as {
  size: number; tiles: number[][][]; metatiles: { tiles: number[][]; solid: boolean }[]; map: number[][];
};

/** What the .tilemap export must contain: every metatile written out as its tiles (computed here, independently of the app). */
function expandedTilemap(map: number[][]) {
  const rows: number[][] = [];
  for (const row of map) {
    for (let ty = 0; ty < cave.size; ty++) rows.push(row.flatMap((m) => cave.metatiles[m].tiles[ty]));
  }
  return rows.flat();
}
const exportTilemap = async (page: Page) => [...(await exportFile(page, 'Export tile map (.tilemap)', 'Export Tilemap', 'lv')).data];

test.describe('level editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/level_editor');
    await expect(page.getByTestId(LEVEL)).toBeVisible();
    await loadProject(page, examplePath('level/cave_level.json'));
    await page.getByLabel('Show grid').uncheck();
    await page.getByLabel('Show collision').uncheck();
    await page.getByLabel(/Show 20×18 screen/).uncheck();
  });

  test('draws the level from its metatiles: 16 x 16 cells of 32 px', async ({ page }) => {
    expect(await canvasSize(page, LEVEL)).toEqual({ width: 16 * CELL, height: 16 * CELL });
    expect(await pixelAt(page, LEVEL, 1, 1)).toBe(DARKEST); // cell (0,0) is rock: its top row is solid
    expect(await pixelAt(page, LEVEL, mid(1), mid(1))).toBe(LIGHTEST); // cell (1,1) is empty
    await expect(page.getByText(/Metatiles — 1 of 7/)).toBeVisible();
    await expect(page.getByText(/16×16 tiles|32×32 tiles/).first()).toBeVisible();
  });

  test('solid metatiles are tinted red when Show collision is on', async ({ page }) => {
    expect(await pixelAt(page, LEVEL, 1, 1)).toBe(DARKEST);
    await page.getByLabel('Show collision').check();
    const tinted = await pixelAt(page, LEVEL, 1, 1);
    expect(tinted).not.toBe(DARKEST);
    const [r, g] = [1, 3].map((i) => parseInt(tinted.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g + 20); // reddish
    expect(await pixelAt(page, LEVEL, mid(1), mid(1))).toBe(LIGHTEST); // an empty (non-solid) cell is not tinted
  });

  test('hovering a cell shows its position and metatile', async ({ page }) => {
    await page.getByTestId(LEVEL).hover({ position: { x: mid(0), y: mid(0) } });
    await expect(page.getByText('Cell 0,0 — metatile 5')).toBeVisible();
  });

  test('exports the tile map with every metatile expanded to its tiles', async ({ page }) => {
    const bytes = await exportTilemap(page);
    expect(bytes).toHaveLength(32 * 32);
    expect(bytes).toEqual(expandedTilemap(cave.map));
  });

  test('stamping a metatile changes the cell, the picture and the expanded tile map', async ({ page }) => {
    const water = metatile(3);
    await clickAt(page, PALETTE, water.x, water.y);
    await expect(page.getByText(/Metatiles — 3 of 7/)).toBeVisible();
    await clickAt(page, LEVEL, mid(5), mid(5));
    const changed = cave.map.map((r) => [...r]);
    changed[5][5] = 3;
    expect(await exportTilemap(page)).toEqual(expandedTilemap(changed));
    // the water tile's second row is "oo..oo.." -> shade 2 at its first pixel: row 1 of the tile = canvas y 5*32 + 2
    expect(await pixelAt(page, LEVEL, mid(5) - 15, mid(5) - 15 + 2)).toBe('#306230');
  });

  test('rectangle, fill, pick and rubber, and undo', async ({ page }) => {
    const brick = metatile(2);
    await clickAt(page, PALETTE, brick.x, brick.y);
    await page.getByLabel('Rectangle').click();
    const box = (await page.getByTestId(LEVEL).boundingBox())!;
    await page.mouse.move(box.x + mid(2), box.y + mid(2));
    await page.mouse.down();
    await page.mouse.move(box.x + mid(4), box.y + mid(3), { steps: 5 });
    await page.mouse.up();
    const expected = cave.map.map((r) => [...r]);
    for (let y = 2; y <= 3; y++) for (let x = 2; x <= 4; x++) expected[y][x] = 2;
    expect(await exportTilemap(page)).toEqual(expandedTilemap(expected));

    await page.getByLabel('Pick metatile').click();
    await clickAt(page, LEVEL, mid(0), mid(0));
    await expect(page.getByText(/Metatiles — 5 of 7/)).toBeVisible();

    await page.getByLabel('Rubber').click();
    await clickAt(page, LEVEL, mid(3), mid(2));
    expected[2][3] = 0;
    expect(await exportTilemap(page)).toEqual(expandedTilemap(expected));

    await page.getByTitle('Undo (Ctrl+Z)').click();
    expected[2][3] = 2;
    expect(await exportTilemap(page)).toEqual(expandedTilemap(expected));

    await page.getByLabel('Fill').click();
    await clickAt(page, PALETTE, metatile(3).x, metatile(3).y);
    await clickAt(page, LEVEL, mid(10), mid(3)); // flood-fill the open space
    const filled = await exportTilemap(page);
    expect(filled.filter((t) => t === 3).length).toBeGreaterThan(200); // the water tile (3) now covers the big empty area
  });

  test('the level can be resized: wider levels export a wider tile map, too-big sizes are ignored', async ({ page }) => {
    await typeNumber(page, 'Width in metatiles', 20);
    await expect(page.getByLabel('Width in metatiles')).toHaveValue('20');
    expect(await canvasSize(page, LEVEL)).toEqual({ width: 20 * CELL, height: 16 * CELL });
    expect(await exportTilemap(page)).toHaveLength(40 * 32);
    await typeNumber(page, 'Width in metatiles', 500); // more than the 128 cells (256 tiles) a level can have
    await expect(page.getByLabel('Width in metatiles')).toHaveValue('20');
  });

  test('typing a size only applies it on Enter (typing 24 does not pass through 2)', async ({ page }) => {
    const width = page.getByLabel('Width in metatiles');
    await width.click();
    await width.press('ControlOrMeta+a');
    await width.pressSequentially('2');
    expect(await canvasSize(page, LEVEL)).toEqual({ width: 16 * CELL, height: 16 * CELL }); // still 16 wide
    await width.pressSequentially('4');
    await width.press('Enter');
    expect(await canvasSize(page, LEVEL)).toEqual({ width: 24 * CELL, height: 16 * CELL });
  });

  test('the red outline marks the 20x18 tile screen at SCX/SCY', async ({ page }) => {
    await page.getByLabel(/Show 20×18 screen/).check();
    expect(await pixelAt(page, LEVEL, 12, 0)).toBe('#ef4444');
    await typeNumber(page, 'SCX', 16); // 16 tiles = 128 px at zoom 2... = 8 cells
    expect(await pixelAt(page, LEVEL, 16 * 8 * 2 + 12, 0)).toBe('#ef4444');
  });

  test('importing a metatile library replaces the metatiles and the tileset', async ({ page }) => {
    const library = { version: 1, type: 'metatiles', size: 2, tiles: cave.tiles.slice(0, 2), metatiles: [cave.metatiles[0], cave.metatiles[2]] };
    await page.getByTestId('library-input').setInputFiles({ name: 'small_metatiles.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(library)) });
    await expect(page.getByText(/Metatiles — \d of 2/)).toBeVisible();
    const bytes = await exportTilemap(page);
    expect(Math.max(...bytes)).toBeLessThanOrEqual(1); // cells that used metatiles 3-6 now use metatile 0
  });

  test('a file that is not a metatile library is refused', async ({ page }) => {
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await page.getByTestId('library-input').setInputFiles(examplePath('level/cave_level.json'));
    expect(await message).toMatch(/not a Game Boy metatile project/);
  });

  test('exports the level source with tiles, metatile table, collision table and map', async ({ page }) => {
    const asm = (await exportFile(page, 'Export RGBDS (.asm)', 'Export ASM', 'cave')).data.toString();
    expect(asm).toBe(readExample('level/cave.asm'));
    expect(asm).toContain('cave_collision::\n    db $00, $01, $01, $00, $00, $01, $00');
  });

  test('clearing the level empties the tile map, and can be undone', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear level', exact: true }).click();
    expect((await exportTilemap(page)).every((t) => t === 0)).toBe(true);
    await page.keyboard.press('ControlOrMeta+z');
    expect(await exportTilemap(page)).toEqual(expandedTilemap(cave.map));
  });
});
