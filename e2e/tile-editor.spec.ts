import { test, expect } from './fixtures';
import { exportFile, canvasSize, pixelAt, clickAt, zoomWheel, clickToolbarExport } from './helpers';

const CANVAS = 'tile-canvas';
// Classic Green palette: shade 0 is the lightest, shade 3 the darkest; the canvas is 4x4 tiles at 16 px per pixel
const LIGHTEST = '#9bbc0f';
const DARKEST = '#0f380f';
const PX = 16;
const centre = (pixel: number) => pixel * PX + PX / 2;

const undoButton = (page: import('@playwright/test').Page) => page.getByTitle('Undo (Ctrl+Z)');

test.describe('tile editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tile_editor');
    await expect(page.getByTestId(CANVAS)).toBeVisible();
    // the tile numbers are drawn over the first pixel of each tile; hide them so that sampled colours are the shades
    await page.getByLabel('Show tile numbers').uncheck();
  });

  test('starts with a blank 4x4 tile canvas', async ({ page }) => {
    expect(await canvasSize(page, CANVAS)).toEqual({ width: 4 * 8 * PX, height: 4 * 8 * PX });
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(LIGHTEST);
    await expect(undoButton(page)).toBeDisabled();
  });

  test('the pencil draws a pixel in the selected shade, and it is exported as 2bpp', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(DARKEST);
    expect(await pixelAt(page, CANVAS, centre(1), centre(0))).toBe(LIGHTEST);

    const file = await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'dot');
    expect(file.name).toBe('dot.2bpp');
    // one tile: the left-most pixel of the first row is bit 7 of both bit planes
    expect([...file.data]).toEqual([0x80, 0x80, ...Array(14).fill(0)]);
  });

  test('dragging draws a stroke of pixels', async ({ page }) => {
    const canvas = page.getByTestId(CANVAS);
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + centre(2), box.y + centre(2));
    await page.mouse.down();
    await page.mouse.move(box.x + centre(6), box.y + centre(2), { steps: 8 });
    await page.mouse.up();
    for (const x of [2, 3, 4, 5, 6]) expect(await pixelAt(page, CANVAS, centre(x), centre(2))).toBe(DARKEST);
    expect(await pixelAt(page, CANVAS, centre(7), centre(2))).toBe(LIGHTEST);
    await undoButton(page).click(); // the whole stroke is one undo step
    for (const x of [2, 4, 6]) expect(await pixelAt(page, CANVAS, centre(x), centre(2))).toBe(LIGHTEST);
  });

  test('shades: the picker changes what is drawn, and the rubber erases back to shade 0', async ({ page }) => {
    await page.getByRole('radio', { name: 'Shade 1' }).click();
    await clickAt(page, CANVAS, centre(0), centre(0));
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe('#8bac0f');
    await page.getByRole('radio', { name: 'Shade 2' }).click();
    await clickAt(page, CANVAS, centre(1), centre(0));
    expect(await pixelAt(page, CANVAS, centre(1), centre(0))).toBe('#306230');
    await page.getByRole('button', { name: 'Rubber' }).click();
    await clickAt(page, CANVAS, centre(0), centre(0));
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(LIGHTEST);
  });

  test('the line tool draws between two clicks', async ({ page }) => {
    await page.getByRole('button', { name: 'Line' }).click();
    await clickAt(page, CANVAS, centre(1), centre(1));
    await clickAt(page, CANVAS, centre(9), centre(1));
    for (const x of [1, 5, 9]) expect(await pixelAt(page, CANVAS, centre(x), centre(1))).toBe(DARKEST);
    expect(await pixelAt(page, CANVAS, centre(10), centre(1))).toBe(LIGHTEST);
  });

  test('the bucket flood-fills the whole blank canvas, and exports every tile', async ({ page }) => {
    await page.getByRole('radio', { name: 'Shade 1' }).click();
    await page.getByRole('button', { name: /Bucket/ }).click();
    await clickAt(page, CANVAS, centre(3), centre(3));
    expect(await pixelAt(page, CANVAS, centre(31), centre(31))).toBe('#8bac0f');
    const file = await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'fill');
    expect(file.data.length).toBe(16 * 16); // all 16 tiles
    expect([...file.data.slice(0, 4)]).toEqual([0xff, 0x00, 0xff, 0x00]); // shade 1: low plane set, high plane clear
  });

  test('undo and redo: the toolbar buttons and the keyboard shortcuts', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    await expect(undoButton(page)).toBeEnabled();
    await page.keyboard.press('ControlOrMeta+z');
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(LIGHTEST);
    await expect(undoButton(page)).toBeDisabled();
    await page.keyboard.press('Control+y');
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(DARKEST);
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.press('ControlOrMeta+Shift+z'); // the other common redo
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(DARKEST);
    await undoButton(page).click();
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(LIGHTEST);
  });

  test('Ctrl+Z while typing a file name undoes the typing, not the drawing', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    await page.getByRole('button', { name: 'Save project', exact: true }).click();
    const name = page.locator('div.fixed input[type="text"]');
    await name.focus();
    await name.press('End');
    await name.pressSequentially('xyz');
    await expect(name).toHaveValue('tilesxyz');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(name).not.toHaveValue('tilesxyz'); // the browser undid the typing ...
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(DARKEST); // ... and the drawing is untouched
    await expect(undoButton(page)).toBeEnabled();
  });

  test('typing a size only applies it when you press Enter or leave the field', async ({ page }) => {
    const width = page.getByLabel('Width in tiles');
    await width.click();
    await width.press('ControlOrMeta+a');
    await width.pressSequentially('1');
    expect((await canvasSize(page, CANVAS)).width).toBe(4 * 8 * PX); // "1" on the way to "16" changes nothing
    await width.pressSequentially('6');
    expect((await canvasSize(page, CANVAS)).width).toBe(4 * 8 * PX);
    await width.press('Enter');
    expect((await canvasSize(page, CANVAS)).width).toBe(16 * 8 * PX);
    await expect(width).toHaveValue('16');

    const height = page.getByLabel('Height in tiles');
    await height.press('ControlOrMeta+a');
    await height.pressSequentially('2');
    await page.getByRole('heading', { name: 'Tile Editor', exact: true }).click(); // leaving the field applies it too
    expect((await canvasSize(page, CANVAS)).height).toBe(2 * 8 * PX);
  });

  test('the spinner arrows change the size at once', async ({ page }) => {
    const width = page.getByLabel('Width in tiles');
    await width.focus();
    await width.press('ArrowUp');
    expect((await canvasSize(page, CANVAS)).width).toBe(5 * 8 * PX);
    await width.press('ArrowDown');
    await width.press('ArrowDown');
    expect((await canvasSize(page, CANVAS)).width).toBe(3 * 8 * PX);
  });

  test('a size that is too big is refused with a message, and a smaller one keeps the drawing', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    const height = page.getByLabel('Height in tiles');
    page.once('dialog', (d) => d.accept());
    await height.press('ControlOrMeta+a');
    await height.pressSequentially('200');
    await height.press('Enter');
    expect((await canvasSize(page, CANVAS)).height).toBe(4 * 8 * PX); // 4 x 200 tiles is over the 384 limit
    await height.press('ControlOrMeta+a');
    await height.pressSequentially('2');
    await height.press('Enter');
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(DARKEST);
  });

  test('the palette presets recolour the canvas', async ({ page }) => {
    await page.getByLabel('Palette', { exact: true }).selectOption('Grey');
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe('#ffffff');
    await clickAt(page, CANVAS, centre(0), centre(0));
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe('#000000');
  });

  test('Ctrl/Cmd + wheel zooms', async ({ page }) => {
    const canvas = page.getByTestId(CANVAS);
    await canvas.hover();
    await zoomWheel(page, -100);
    await expect.poll(async () => (await canvasSize(page, CANVAS)).width).toBe(4 * 8 * (PX + 1));
    await zoomWheel(page, 100);
    await zoomWheel(page, 100);
    await expect.poll(async () => (await canvasSize(page, CANVAS)).width).toBe(4 * 8 * (PX - 1));
  });

  test('exporting an empty canvas explains that there is nothing to export', async ({ page }) => {
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await clickToolbarExport(page, 'Export RGBDS (.asm)');
    await page.getByRole('button', { name: 'Export ASM', exact: true }).click();
    expect(await message).toMatch(/Nothing to export/);
  });

  test('a tracing image can be loaded, adjusted and removed', async ({ page }) => {
    // a 1x1 transparent PNG
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    await page.getByLabel('Load tracing image').setInputFiles({ name: 'ref.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('button', { name: 'Remove image' })).toBeVisible();
    await page.getByLabel('Adjust (drag / scroll)').check();
    await page.getByLabel('Opacity').fill('0.8');
    await page.getByLabel('Show', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Remove image' }).click();
    await expect(page.getByLabel('Load tracing image')).toBeVisible();
  });
});

test.describe('first visit', () => {
  test.use({ skipInstructions: false });

  test('shows the instructions once, and "Don\'t show this again" is remembered', async ({ page }) => {
    await page.goto('/tile_editor');
    const dialogTitle = page.getByRole('heading', { name: 'Tile Editor — How to Use' });
    await expect(dialogTitle).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(dialogTitle).toBeHidden();
    await page.reload();
    await expect(dialogTitle).toBeVisible(); // not remembered: it comes back

    await page.getByLabel("Don't show this again").check();
    await page.getByRole('button', { name: 'Got it' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Tile Editor', exact: true })).toBeVisible();
    await expect(dialogTitle).toBeHidden();
  });
});

test('a plain scroll (trackpad swipe) pans sideways and does not zoom', async ({ page }) => {
  await page.goto('/tile_editor');
  const canvas = page.getByTestId(CANVAS);
  const before = await canvas.boundingBox();
  await canvas.hover();
  await page.mouse.wheel(-120, 0);
  await expect.poll(async () => (await canvas.boundingBox())!.x).toBeGreaterThan(before!.x + 100);
  expect((await canvasSize(page, CANVAS)).width).toBe(4 * 8 * PX);
});
