import { test, expect } from './fixtures';
import { exportFile, examplePath, readExample, loadProject, pixelAt, clickAt, canvasSize, typeNumber, zoomWheel } from './helpers';

const MAP = 'map-canvas';
const PALETTE = 'tile-palette';
const LIGHTEST = '#9bbc0f';
const DARKEST = '#0f380f';
const CELL = 24; // 8 pixels x zoom 3
const mid = (n: number) => n * CELL + CELL / 2;
const paletteTile = (n: number) => ({ x: (n % 7) * 24 + 12, y: Math.floor(n / 7) * 24 + 12 });
const meadow: { map: number[][] } = JSON.parse(readExample('map/meadow_map.json'));

async function exportMap(page: import('@playwright/test').Page, name = 'm') {
  return [...(await exportFile(page, 'Export map (.tilemap)', 'Export Tilemap', name)).data];
}
const flat = (m: number[][]) => m.flat();

test.describe('map editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/background_editor');
    await expect(page.getByTestId(MAP)).toBeVisible();
    await loadProject(page, examplePath('map/meadow_map.json'));
    await page.getByLabel('Show grid').uncheck(); // (so that sampled pixels are the tile colours)
    await page.getByLabel(/Show 20×18 screen/).uncheck();
  });

  test('draws the loaded map from its tiles, 32x32 cells', async ({ page }) => {
    expect(await canvasSize(page, MAP)).toEqual({ width: 32 * CELL, height: 32 * CELL });
    // cell (0,0) is a tree: the top row of the tree tile is "...##..."
    expect(await pixelAt(page, MAP, 1, 1)).toBe(LIGHTEST);
    expect(await pixelAt(page, MAP, 10, 1)).toBe(DARKEST);
    await expect(page.getByText('Tileset — tile 1 of 8')).toBeVisible();
  });

  test('hovering a cell shows its position and tile', async ({ page }) => {
    await page.getByTestId(MAP).hover({ position: { x: mid(14), y: mid(6) } }); // the pond
    await expect(page.getByText('Cell 14,6 — tile 3')).toBeVisible();
  });

  test('the stamp paints the selected tile, and it is exported', async ({ page }) => {
    const rock = paletteTile(4);
    await clickAt(page, PALETTE, rock.x, rock.y);
    await expect(page.getByText('Tileset — tile 4 of 8')).toBeVisible();
    expect(await pixelAt(page, MAP, mid(1) - 11, mid(1) - 11)).toBe(LIGHTEST); // cell (1,1) is grass or a flower
    await clickAt(page, MAP, mid(1), mid(1));
    expect(await pixelAt(page, MAP, mid(1) - 11, mid(1) - 11)).toBe(DARKEST); // the rock tile's top row is solid
    const bytes = await exportMap(page);
    expect(bytes).toHaveLength(1024);
    expect(bytes[1 * 32 + 1]).toBe(4);
    const expected = flat(meadow.map);
    expected[1 * 32 + 1] = 4;
    expect(bytes).toEqual(expected);
  });

  test('dragging paints a stroke, undone in one step', async ({ page }) => {
    const rock = paletteTile(4);
    await clickAt(page, PALETTE, rock.x, rock.y);
    const box = (await page.getByTestId(MAP).boundingBox())!;
    await page.mouse.move(box.x + mid(2), box.y + mid(25));
    await page.mouse.down();
    await page.mouse.move(box.x + mid(8), box.y + mid(25), { steps: 12 });
    await page.mouse.up();
    let bytes = await exportMap(page);
    for (let x = 2; x <= 8; x++) expect(bytes[25 * 32 + x]).toBe(4);
    await page.getByTitle('Undo (Ctrl+Z)').click();
    bytes = await exportMap(page);
    expect(bytes).toEqual(flat(meadow.map));
  });

  test('the rectangle tool fills the dragged area, with a preview while dragging', async ({ page }) => {
    await clickAt(page, PALETTE, paletteTile(4).x, paletteTile(4).y);
    await page.getByLabel('Rectangle').click();
    const box = (await page.getByTestId(MAP).boundingBox())!;
    await page.mouse.move(box.x + mid(22), box.y + mid(16));
    await page.mouse.down();
    await page.mouse.move(box.x + mid(26), box.y + mid(19), { steps: 6 });
    const preview = await pixelAt(page, MAP, mid(24), mid(18) - 11);
    expect(preview).not.toBe(await pixelAt(page, MAP, mid(10) - 11, mid(18) - 11)); // the translucent blue selection is on top
    await page.mouse.up();
    const bytes = await exportMap(page);
    for (let y = 16; y <= 19; y++) for (let x = 22; x <= 26; x++) expect(bytes[y * 32 + x]).toBe(4);
    expect(bytes[16 * 32 + 21]).toBe(meadow.map[16][21]); // just outside the rectangle
    expect(bytes[20 * 32 + 22]).toBe(meadow.map[20][22]);
  });

  test('the fill tool replaces a whole connected region', async ({ page }) => {
    const water = flat(meadow.map).filter((t) => t === 3).length;
    expect(water).toBe(24); // the 6x4 pond
    await clickAt(page, PALETTE, paletteTile(4).x, paletteTile(4).y);
    await page.getByLabel('Fill').click();
    await clickAt(page, MAP, mid(16), mid(7));
    const bytes = await exportMap(page);
    expect(bytes.filter((t) => t === 3)).toHaveLength(0);
    expect(bytes.filter((t) => t === 4)).toHaveLength(flat(meadow.map).filter((t) => t === 4).length + 24);
  });

  test('pick tile copies a tile from the map to the brush, and the rubber writes tile 0', async ({ page }) => {
    await page.getByLabel('Pick tile').click();
    await clickAt(page, MAP, mid(0), mid(0)); // a tree
    await expect(page.getByText('Tileset — tile 5 of 8')).toBeVisible();
    await page.getByLabel('Rubber').click();
    await clickAt(page, MAP, mid(3), mid(3));
    expect((await exportMap(page))[3 * 32 + 3]).toBe(0);
  });

  test('undo and redo with the keyboard', async ({ page }) => {
    await clickAt(page, MAP, mid(1), mid(1)); // the stamp with the default brush (tile 1)
    expect((await exportMap(page))[33]).toBe(1);
    await page.keyboard.press('ControlOrMeta+z');
    expect((await exportMap(page))[33]).toBe(meadow.map[1][1]);
    await page.keyboard.press('Control+y');
    expect((await exportMap(page))[33]).toBe(1);
  });

  test('export area: the 20x18 screen at SCX/SCY, wrapping like the hardware', async ({ page }) => {
    await page.getByLabel('Export area').selectOption('viewport');
    let bytes = await exportMap(page);
    expect(bytes).toHaveLength(20 * 18);
    expect(bytes.slice(0, 20)).toEqual(meadow.map[0].slice(0, 20));
    await typeNumber(page, 'SCX', 30);
    await typeNumber(page, 'SCY', 31);
    bytes = await exportMap(page);
    expect(bytes[0]).toBe(meadow.map[31][30]);
    expect(bytes[2]).toBe(meadow.map[31][0]); // 30, 31, then round to 0
    expect(bytes[20]).toBe(meadow.map[0][30]); // second row wraps to the top of the map
  });

  test('export area: full map is 1024 bytes and "used area" crops to the tiles that are not tile 0', async ({ page }) => {
    await page.getByLabel('Export area').selectOption('used');
    expect(await exportMap(page)).toHaveLength(1024); // the meadow has no tile 0
    await page.getByRole('button', { name: 'Clear map', exact: true }).click();
    expect(await exportMap(page)).toHaveLength(1024); // nothing but tile 0: exported in full, not as 1x1
    await clickAt(page, PALETTE, paletteTile(1).x, paletteTile(1).y);
    await clickAt(page, MAP, mid(5), mid(7));
    await clickAt(page, MAP, mid(9), mid(8));
    expect(await exportMap(page)).toEqual([1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0].slice(0, 0).concat(
      // 5 columns (5..9) x 2 rows (7..8)
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    ));
  });

  test('the background palette register recolours the map', async ({ page }) => {
    expect(await pixelAt(page, MAP, 1, 1)).toBe(LIGHTEST);
    await page.getByLabel('Background palette').selectOption({ label: 'BGP $1B (inverted)' });
    expect(await pixelAt(page, MAP, 1, 1)).toBe(DARKEST);
  });

  test('the red outline shows the 20x18 screen and follows SCX/SCY', async ({ page }) => {
    await page.getByLabel(/Show 20×18 screen/).check();
    expect(await pixelAt(page, MAP, 12, 0)).toBe('#ef4444'); // top edge of the screen, at the top-left of the map
    await typeNumber(page, 'SCX', 10);
    expect(await pixelAt(page, MAP, 10 * CELL + 12, 0)).toBe('#ef4444'); // moved right by 10 cells
    expect(await pixelAt(page, MAP, 12, 0)).not.toBe('#ef4444');
    await page.getByLabel(/Show 20×18 screen/).uncheck();
    expect(await pixelAt(page, MAP, 10 * CELL + 12, 0)).not.toBe('#ef4444');
  });

  test('the grid can be shown over the tiles', async ({ page }) => {
    const before = await pixelAt(page, MAP, CELL, 12);
    await page.getByLabel('Show grid').check();
    expect(await pixelAt(page, MAP, CELL, 12)).not.toBe(before);
  });

  test('Ctrl/Cmd + wheel zooms between 1x and 8x', async ({ page }) => {
    const canvas = page.getByTestId(MAP);
    await canvas.hover();
    await zoomWheel(page, -100);
    await expect.poll(async () => (await canvasSize(page, MAP)).width).toBe(32 * 8 * 4);
    for (let i = 0; i < 6; i++) await zoomWheel(page, 100);
    await expect.poll(async () => (await canvasSize(page, MAP)).width).toBe(32 * 8 * 1);
  });

  test('the right mouse button does not pan or paint unless the pan tool is selected', async ({ page }) => {
    const canvas = page.getByTestId(MAP);
    const before = (await canvas.boundingBox())!;
    await page.mouse.move(before.x + 100, before.y + 100);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(before.x + 160, before.y + 130, { steps: 5 });
    await page.mouse.up({ button: 'right' });
    const after = (await canvas.boundingBox())!;
    expect(Math.round(after.x - before.x)).toBe(0);
    expect(Math.round(after.y - before.y)).toBe(0);
    expect(await exportMap(page)).toEqual(flat(meadow.map)); // nothing was painted
  });

  test('importing a smaller tileset resets map cells that pointed past it', async ({ page }) => {
    await page.getByTestId('tileset-input').setInputFiles({ name: 'two.2bpp', mimeType: 'application/octet-stream', buffer: Buffer.alloc(32, 0x55) });
    await expect(page.getByText(/Tileset — tile \d of 2/)).toBeVisible();
    const bytes = await exportMap(page);
    expect(Math.max(...bytes)).toBeLessThanOrEqual(1);
  });

  test('importing a tile editor project as the tileset', async ({ page }) => {
    await page.getByTestId('tileset-input').setInputFiles(examplePath('tiles/forest_tiles.json'));
    await expect(page.getByText(/Tileset — tile \d of 8/)).toBeVisible();
    expect(await exportMap(page)).toEqual(flat(meadow.map)); // the same 8 tiles: the map is unchanged
  });

  test('a tileset file that is not valid is refused with a message', async ({ page }) => {
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await page.getByTestId('tileset-input').setInputFiles({ name: 'bad.2bpp', mimeType: 'application/octet-stream', buffer: Buffer.alloc(10) });
    expect(await message).toMatch(/Invalid \.2bpp file/);
  });

  test('exports the RGBDS source for the map with the tiles it uses', async ({ page }) => {
    const asm = (await exportFile(page, 'Export RGBDS (.asm)', 'Export ASM', 'meadow')).data.toString();
    expect(asm).toBe(readExample('map/meadow.asm'));
  });

  test('the raw tiles can be exported as 2bpp', async ({ page }) => {
    const file = await exportFile(page, 'Export tiles (.2bpp)', 'Export 2bpp', 'meadow');
    expect(file.data.length).toBe(8 * 16);
  });
});
