import { test, expect } from './fixtures';
import { exportFile, exportText, canvasSize, pixelAt, clickAt, nearColour, typeNumber } from './helpers';

const CANVAS = 'tile-canvas';
const LIGHTEST = '#9bbc0f';
const DARKEST = '#0f380f';
const PX = 16; // 2x2 tiles = 16x16 pixels at 16 screen pixels each
const centre = (pixel: number) => pixel * PX + PX / 2;

test.describe('sprite editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sprite_editor');
    await expect(page.getByTestId(CANVAS)).toBeVisible();
  });

  test('starts with one blank 16x16 frame', async ({ page }) => {
    expect(await canvasSize(page, CANVAS)).toEqual({ width: 16 * PX, height: 16 * PX });
    await expect(page.getByText(/Frames — 1\/1/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Play')).toBeDisabled(); // nothing to animate yet
  });

  test('draws on the current frame only', async ({ page }) => {
    await clickAt(page, CANVAS, centre(3), centre(3));
    expect(await pixelAt(page, CANVAS, centre(3), centre(3))).toBe(DARKEST);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText(/Frames — 2\/2/)).toBeVisible();
    await page.getByLabel('Onion skin (previous frame)').uncheck();
    expect(await pixelAt(page, CANVAS, centre(3), centre(3))).toBe(LIGHTEST); // the new frame is blank
    await page.getByLabel('Frame 1').click();
    expect(await pixelAt(page, CANVAS, centre(3), centre(3))).toBe(DARKEST);
  });

  test('the onion skin shows the previous frame faintly behind shade 0', async ({ page }) => {
    await clickAt(page, CANVAS, centre(3), centre(3));
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click(); // frame 2 is a copy: ghost AND drawn
    await page.getByRole('button', { name: 'Add', exact: true }).click(); // frame 3 is blank, frame 2 is behind it
    await page.getByLabel('Onion skin (previous frame)').check();
    // frame 2 has the dot, so frame 3 shows it as a ghost: darkest at 40% over lightest
    const ghost = await pixelAt(page, CANVAS, centre(3), centre(3));
    expect(ghost).not.toBe(LIGHTEST);
    expect(ghost).not.toBe(DARKEST);
    expect(nearColour(ghost, '#63870f')).toBe(true);
    await page.getByLabel('Onion skin (previous frame)').uncheck();
    expect(await pixelAt(page, CANVAS, centre(3), centre(3))).toBe(LIGHTEST);
  });

  test('frames can be duplicated and deleted', async ({ page }) => {
    await clickAt(page, CANVAS, centre(1), centre(1));
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await expect(page.getByText(/Frames — 2\/2/)).toBeVisible();
    expect(await pixelAt(page, CANVAS, centre(1), centre(1))).toBe(DARKEST); // the copy has the dot
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/Frames — 1\/1/)).toBeVisible();
  });

  test('Play steps through the frames using their durations, and Stop stops', async ({ page }) => {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Frame 1').click();
    await expect(page.getByLabel('Play')).toBeEnabled();
    await page.getByLabel('Play').click();
    await expect(page.getByLabel('Stop')).toBeVisible();
    await expect(page.getByText(/Frames — 2\/2/)).toBeVisible(); // it reached frame 2 on its own (6 ticks = 100 ms)
    await expect(page.getByText(/Frames — 1\/2/)).toBeVisible(); // and looped back
    await page.getByLabel('Stop').click();
    const text = await page.getByText(/Frames — \d\/2/).textContent();
    await page.waitForTimeout(400);
    await expect(page.getByText(/Frames — \d\/2/)).toHaveText(text!); // stopped on a frame
  });

  test('without Loop it stops on the last frame', async ({ page }) => {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Frame 1').click();
    await page.getByLabel('Loop').uncheck();
    await page.getByLabel('Play').click();
    await expect(page.getByLabel('Play')).toBeVisible({ timeout: 3000 }); // the button went back to Play by itself
    await expect(page.getByText(/Frames — 2\/2/)).toBeVisible();
  });

  test('the palette choice recolours the canvas through OBP1', async ({ page }) => {
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(LIGHTEST);
    await page.getByLabel('Palette', { exact: true }).selectOption('1');
    expect(await pixelAt(page, CANVAS, centre(0), centre(0))).toBe(DARKEST); // $1B inverts the shades
  });

  test('a typed frame duration is exported', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    await typeNumber(page, /Duration/, 30);
    await expect(page.getByLabel(/Duration/)).toHaveValue('30');
    const asm = await exportText(page, 'blob');
    expect(asm).toContain('blob_durations::\n    db 30');
  });

  test('exports tiles, frame table, OAM entries and durations', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await clickAt(page, CANVAS, centre(9), centre(9));
    const asm = await exportText(page, 'blob');
    expect(asm).toContain('DEF BLOB_FRAME_COUNT EQU 2');
    expect(asm).toContain('DEF BLOB_TILE_COUNT EQU 2');
    expect(asm).toContain('blob_frames::\n    dw blob_frame0\n    dw blob_frame1');
    expect(asm).toContain('blob_frame0:\n    db 1\n    db 0, 0, 0, $00'); // one sprite at the top left
    expect(asm).toContain('blob_frame1:\n    db 1\n    db 8, 8, 1, $00'); // frame 2's dot is in the second tile column, second row
  });

  test('the OAM attribute byte follows the palette and priority choices', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    await page.getByLabel('Palette', { exact: true }).selectOption('1');
    await page.getByLabel(/Behind background/).check();
    expect(await exportText(page, 'blob')).toContain(', $90'); // priority (bit 7) + OBP1 (bit 4)
  });

  test('8x16 mode: undo after the height was rounded up restores both height and mode', async ({ page }) => {
    await typeNumber(page, 'Width in tiles', 1);
    await typeNumber(page, 'Height in tiles', 3);
    expect(await canvasSize(page, CANVAS)).toEqual({ width: 8 * PX, height: 24 * PX });
    await page.getByLabel('OBJ size').selectOption('8x16');
    await expect(page.getByLabel('Height in tiles')).toHaveValue('4'); // 8x16 needs an even height
    await page.getByLabel('OBJ size').focus(); // (as a user clicking the dropdown would: Ctrl+Z is left alone inside a number field)
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.getByLabel('Height in tiles')).toHaveValue('3');
    await expect(page.getByLabel('OBJ size')).toHaveValue('8x8'); // not left on 8x16 with an odd height
  });

  test('8x16 mode refuses an odd height with a message', async ({ page }) => {
    await page.getByLabel('OBJ size').selectOption('8x16');
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await typeNumber(page, 'Height in tiles', 3);
    expect(await message).toMatch(/multiple of 16/);
    await expect(page.getByLabel('Height in tiles')).toHaveValue('2');
  });

  test('a sprite that needs more than 256 tiles cannot be exported, and says why', async ({ page }) => {
    const full = Array.from({ length: 32 }, () => Array(32).fill(3));
    const project = {
      version: 1, type: 'sprite', tilesWidth: 4, tilesHeight: 4, objSize: '8x8', palette: 0, priority: false,
      frames: Array.from({ length: 32 }, () => ({ pixels: full, duration: 6 })),
    };
    await page.getByTestId('project-input').setInputFiles({ name: 'big_sprite.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await page.getByRole('button', { name: 'Export RGBDS (.asm)', exact: true }).click();
    await page.getByRole('button', { name: 'Export ASM', exact: true }).click();
    expect(await message).toMatch(/512 tiles.*at most 256/);
  });

  test('a project with an out-of-range value is refused', async ({ page }) => {
    const pixels = Array.from({ length: 16 }, () => Array(16).fill(0));
    pixels[2][3] = null as unknown as number;
    const project = { version: 1, type: 'sprite', tilesWidth: 2, tilesHeight: 2, objSize: '8x8', palette: 0, priority: false, frames: [{ pixels, duration: 6 }] };
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await page.getByTestId('project-input').setInputFiles({ name: 'bad_sprite.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
    expect(await message).toMatch(/not a Game Boy sprite project/);
  });

  test('the sprite can be exported as raw tiles too', async ({ page }) => {
    await clickAt(page, CANVAS, centre(0), centre(0));
    const file = await exportFile(page, 'Export .2bpp (tiles)', 'Export 2bpp', 'dot');
    expect(file.name).toBe('dot.2bpp');
    expect([...file.data]).toEqual([0x80, 0x80, ...Array(14).fill(0)]);
  });
});
