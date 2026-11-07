import { test, expect } from './fixtures';
import { exportFile, exportText, examplePath, pixelAt, clickAt, canvasSize, typeNumber } from './helpers';

const GRID = 'metatile-canvas'; // the tiles of the selected metatile: 64 px per tile at the default zoom
const TILES = 'tile-palette';
const METATILES = 'metatile-palette';
const LIGHTEST = '#9bbc0f';
const DARKEST = '#0f380f';
const TILE = 64;
const tileCell = (n: number) => ({ x: (n % 8) * 24 + 12, y: Math.floor(n / 8) * 24 + 12 });
const metatileCell = (n: number) => ({ x: (n % 5) * 36 + 18, y: Math.floor(n / 5) * 36 + 18 });

test.describe('metatile editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/metatile_editor');
    await expect(page.getByTestId(GRID)).toBeVisible();
    await page.getByLabel('Show grid').uncheck();
  });

  test('starts with a library of an empty and a solid metatile, the solid one selected', async ({ page }) => {
    await expect(page.getByText(/Metatiles — 1 of 2 \(max 256\)/)).toBeVisible();
    await expect(page.getByText('Tileset — tile 1 of 2')).toBeVisible();
    expect(await canvasSize(page, GRID)).toEqual({ width: 2 * TILE, height: 2 * TILE });
    expect(await pixelAt(page, GRID, 10, 10)).toBe(DARKEST); // all four tiles are the solid tile
    await expect(page.getByLabel('Solid (collision)')).toBeChecked();
  });

  test('stamping a tile changes the picture and the exported metatile table', async ({ page }) => {
    await clickAt(page, TILES, tileCell(0).x, tileCell(0).y); // the blank tile
    await clickAt(page, GRID, TILE / 2, TILE / 2); // top-left cell
    expect(await pixelAt(page, GRID, 10, 10)).toBe(LIGHTEST);
    expect(await pixelAt(page, GRID, TILE + 10, 10)).toBe(DARKEST);
    const asm = await exportText(page, 'set');
    expect(asm).toContain('db $00, $01, $01, $01 ; metatile 1');
    expect(asm).toContain('db $00, $00, $00, $00 ; metatile 0');
  });

  test('dragging stamps several tiles in one undo step', async ({ page }) => {
    await clickAt(page, TILES, tileCell(0).x, tileCell(0).y);
    const box = (await page.getByTestId(GRID).boundingBox())!;
    await page.mouse.move(box.x + TILE / 2, box.y + TILE / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + TILE * 1.5, box.y + TILE / 2, { steps: 5 });
    await page.mouse.move(box.x + TILE * 1.5, box.y + TILE * 1.5, { steps: 5 });
    await page.mouse.up();
    expect(await exportText(page, 'a')).toContain('db $00, $00, $01, $00 ; metatile 1');
    await page.getByTitle('Undo (Ctrl+Z)').click();
    expect(await exportText(page, 'a')).toContain('db $01, $01, $01, $01 ; metatile 1');
  });

  test('fill, pick and rubber', async ({ page }) => {
    await page.getByLabel('Rubber').click();
    await clickAt(page, GRID, TILE * 1.5, TILE * 1.5);
    expect(await exportText(page, 'a')).toContain('db $01, $01, $01, $00 ; metatile 1');
    await page.getByLabel('Pick tile').click();
    await clickAt(page, GRID, TILE / 2, TILE / 2);
    await expect(page.getByText('Tileset — tile 1 of 2')).toBeVisible();
    await clickAt(page, TILES, tileCell(0).x, tileCell(0).y);
    await page.getByLabel('Fill').click();
    await clickAt(page, GRID, TILE * 1.5, TILE * 1.5); // the one tile 0 cell: filling it with tile 0 changes nothing
    await clickAt(page, GRID, TILE / 2, TILE / 2); // the region of tile 1 cells: filled with tile 0
    expect(await exportText(page, 'a')).toContain('db $00, $00, $00, $00 ; metatile 1');
  });

  test('Solid (collision) is exported as the collision table', async ({ page }) => {
    expect(await exportText(page, 'set')).toContain('set_collision::\n    db $00, $01');
    await page.getByLabel('Solid (collision)').uncheck();
    expect(await exportText(page, 'set')).toContain('set_collision::\n    db $00, $00');
  });

  test('metatiles can be added, duplicated, deleted and selected', async ({ page }) => {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText(/Metatiles — 2 of 3/)).toBeVisible();
    await expect(page.getByLabel('Solid (collision)')).not.toBeChecked(); // a new metatile is empty and not solid
    await clickAt(page, METATILES, metatileCell(1).x, metatileCell(1).y);
    await expect(page.getByText(/Metatiles — 1 of 3/)).toBeVisible();
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await expect(page.getByText(/Metatiles — 2 of 4/)).toBeVisible();
    await expect(page.getByLabel('Solid (collision)')).toBeChecked(); // the copy of the solid metatile
    expect(await pixelAt(page, GRID, 10, 10)).toBe(DARKEST);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/Metatiles — 1 of 3/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear metatile', exact: true }).click();
    expect(await pixelAt(page, GRID, 10, 10)).toBe(LIGHTEST);
  });

  test('the last metatile cannot be deleted', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/Metatiles — 0 of 1/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
  });

  test('switching to 4x4 metatiles keeps each metatile\'s top-left tiles', async ({ page }) => {
    await typeNumber(page, 'Metatile width in tiles', 4);
    await typeNumber(page, 'Metatile height in tiles', 4);
    expect(await canvasSize(page, GRID)).toEqual({ width: 4 * TILE, height: 4 * TILE });
    const asm = await exportText(page, 'big');
    expect(asm).toContain('DEF BIG_METATILE_SIZE EQU 4');
    expect(asm).toContain('db $01, $01, $00, $00, $01, $01, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00 ; metatile 1');
    await page.keyboard.press('ControlOrMeta+z'); // back to 4 wide x 2 high
    await page.keyboard.press('ControlOrMeta+z'); // back to 2x2
    expect(await canvasSize(page, GRID)).toEqual({ width: 2 * TILE, height: 2 * TILE });
  });

  test('a metatile can be any shape: a 1x4 floor strip', async ({ page }) => {
    await typeNumber(page, 'Metatile width in tiles', 1);
    await typeNumber(page, 'Metatile height in tiles', 4);
    expect(await canvasSize(page, GRID)).toEqual({ width: 1 * TILE, height: 4 * TILE });
    const asm = await exportText(page, 'floor');
    expect(asm).toContain('DEF FLOOR_METATILE_WIDTH EQU 1');
    expect(asm).toContain('DEF FLOOR_METATILE_HEIGHT EQU 4');
    expect(asm).not.toContain('METATILE_SIZE');
  });

  test('importing a tileset (a Tile Editor project) and a project round trip', async ({ page }) => {
    await page.getByTestId('tileset-input').setInputFiles(examplePath('tiles/forest_tiles.json'));
    await expect(page.getByText(/Tileset — tile \d of 8/)).toBeVisible();
    await clickAt(page, TILES, tileCell(6).x, tileCell(6).y); // the flower
    await clickAt(page, GRID, TILE / 2, TILE / 2);
    const saved = await exportFile(page, 'Save project', 'Save', 'mine');
    expect(saved.name).toBe('mine_metatiles.json');
    const project = JSON.parse(saved.data.toString());
    expect(project).toMatchObject({ type: 'metatiles', size: 2 });
    expect(project.tiles).toHaveLength(8);
    expect(project.metatiles[1].tiles[0]).toEqual([6, 1]);
  });

  test('a saved library can be loaded again', async ({ page }) => {
    const saved = await exportFile(page, 'Save project', 'Save', 'lib');
    await page.reload();
    await page.getByTestId('project-input').setInputFiles({ name: saved.name, mimeType: 'application/json', buffer: saved.data });
    await expect(page.getByText(/Metatiles — 0 of 2/)).toBeVisible();
  });

  test('exports C with the three tables', async ({ page }) => {
    const header = (await exportFile(page, 'Export C (.h)', 'Export C', 'set')).data.toString();
    expect(header).toContain('const unsigned char set_metatiles[] = {');
    expect(header).toContain('const unsigned char set_collision[] = { 0, 1 };');
  });
});
