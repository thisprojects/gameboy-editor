import { test, expect } from './fixtures';
import { exportFile, pixelAt, clickAt, canvasHasInk, glyphInk } from './helpers';

const GLYPH = 'tile-canvas'; // the 8x8 pixel editor, 20 screen pixels per pixel
const GRID = 'font-grid'; // 16 x 6 glyphs, 28 px cells
const PREVIEW = 'font-preview';
const LIGHTEST = '#9bbc0f';
const DARKEST = '#0f380f';
const cell = (n: number) => ({ x: (n % 16) * 28 + 14, y: Math.floor(n / 16) * 28 + 14 });
const glyphBytes = (data: Buffer, glyph: number) => [...data.subarray(glyph * 16, glyph * 16 + 16)];

test.describe('font editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/font_editor');
    await expect(page.getByTestId(GLYPH)).toBeVisible();
  });

  test('starts on "A" of the starter font', async ({ page }) => {
    await expect(page.getByText('#33')).toBeVisible();
    await expect(page.getByText('ASCII 65 ($41)')).toBeVisible();
    await expect(page.getByText("'A'", { exact: true })).toBeVisible();
    expect(await glyphInk(page)).toBeGreaterThan(10); // "A" is drawn
  });

  test('clicking a glyph in the grid selects it', async ({ page }) => {
    const g = cell(0); // the space
    await clickAt(page, GRID, g.x, g.y);
    await expect(page.getByText('#0', { exact: true })).toBeVisible();
    await expect(page.getByText("'SPACE'", { exact: true })).toBeVisible();
    expect(await glyphInk(page)).toBe(0); // a space is blank
    const z = cell(90 - 32); // 'Z'
    await clickAt(page, GRID, z.x, z.y);
    await expect(page.getByText("'Z'", { exact: true })).toBeVisible();
  });

  test('drawing changes only the selected glyph, and export has 96 glyphs in ASCII order', async ({ page }) => {
    const before = (await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data;
    expect(before.length).toBe(1536);
    const g = cell(0);
    await clickAt(page, GRID, g.x, g.y); // the space
    await clickAt(page, GLYPH, 10, 10); // pixel (0,0)
    expect(await pixelAt(page, GLYPH, 10, 10)).toBe(DARKEST);
    const after = (await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data;
    expect(glyphBytes(after, 0).slice(0, 2)).toEqual([0x80, 0x80]); // the space now has its top-left pixel
    for (let glyph = 1; glyph < 96; glyph++) expect(glyphBytes(after, glyph)).toEqual(glyphBytes(before, glyph));
  });

  test('1bpp export is 8 bytes per glyph, with shades 2 and 3 as set pixels', async ({ page }) => {
    const g = cell(0);
    await clickAt(page, GRID, g.x, g.y);
    await clickAt(page, GLYPH, 10, 10);
    const file = await exportFile(page, 'Export .1bpp', 'Export 1bpp', 'font');
    expect(file.name).toBe('font.1bpp');
    expect(file.data.length).toBe(768);
    expect(file.data[0]).toBe(0x80);
  });

  test('copy and paste move a glyph, and paste is undoable', async ({ page }) => {
    await page.getByRole('button', { name: 'Copy', exact: true }).click(); // "A"
    const g = cell(34 - 32 + 0); // 'B' is 66 - 32 = 34
    await clickAt(page, GRID, cell(34).x, cell(34).y);
    await page.getByRole('button', { name: 'Paste', exact: true }).click();
    const data = (await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data;
    expect(glyphBytes(data, 34)).toEqual(glyphBytes(data, 33)); // B is now an A
    expect(g).toBeDefined();
    await page.keyboard.press('ControlOrMeta+z');
    const undone = (await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data;
    expect(glyphBytes(undone, 34)).not.toEqual(glyphBytes(undone, 33));
  });

  test('Paste is disabled until something has been copied', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Paste', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Paste', exact: true })).toBeEnabled();
  });

  test('Clear glyph, Reset to starter and Load starter font', async ({ page }) => {
    const starter = (await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data;
    await page.getByRole('button', { name: 'Clear glyph', exact: true }).click();
    expect(await glyphInk(page)).toBe(0);
    await page.getByRole('button', { name: 'Reset to starter', exact: true }).click();
    expect(await glyphInk(page)).toBeGreaterThan(10);
    await page.getByRole('button', { name: 'Clear all', exact: true }).click();
    const empty = (await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data;
    expect(empty.every((b) => b === 0)).toBe(true);
    await page.getByRole('button', { name: 'Load starter font', exact: true }).click();
    expect((await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data.equals(starter)).toBe(true);
  });

  test('the preview shows typed text and updates as it changes', async ({ page }) => {
    expect(await canvasHasInk(page, PREVIEW, LIGHTEST)).toBe(true); // the default sample text
    const text = page.getByLabel('Preview text');
    await text.fill('   ');
    expect(await canvasHasInk(page, PREVIEW, LIGHTEST)).toBe(false); // only spaces
    await text.fill('HELLO\nGAME BOY');
    expect(await canvasHasInk(page, PREVIEW, LIGHTEST)).toBe(true);
    expect(await page.getByTestId(PREVIEW).evaluate((c: HTMLCanvasElement) => c.height)).toBe(2 * 16); // two lines of 16 px
  });

  test('editing a glyph is reflected in the preview', async ({ page }) => {
    await page.getByLabel('Preview text').fill(' ');
    const g = cell(0);
    await clickAt(page, GRID, g.x, g.y); // the space
    expect(await canvasHasInk(page, PREVIEW, LIGHTEST)).toBe(false);
    await clickAt(page, GLYPH, 10, 10);
    expect(await canvasHasInk(page, PREVIEW, LIGHTEST)).toBe(true); // the preview shows the edited space
  });

  test('a .2bpp font can be imported (shorter fonts are padded with blank glyphs)', async ({ page }) => {
    const three = Buffer.alloc(48, 0xff);
    await page.getByTestId('import-input').setInputFiles({ name: 'tiny.2bpp', mimeType: 'application/octet-stream', buffer: three });
    const data = (await exportFile(page, 'Export .2bpp', 'Export 2bpp', 'font')).data;
    expect(data.length).toBe(1536);
    expect(data.subarray(0, 48).equals(three)).toBe(true);
    expect(data.subarray(48).every((b) => b === 0)).toBe(true);
  });

  test('a .2bpp file of the wrong size is refused', async ({ page }) => {
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await page.getByTestId('import-input').setInputFiles({ name: 'bad.2bpp', mimeType: 'application/octet-stream', buffer: Buffer.alloc(20) });
    expect(await message).toMatch(/Invalid \.2bpp file/);
  });

  test('RGBDS and C exports list the glyphs with their ASCII codes', async ({ page }) => {
    const asm = (await exportFile(page, 'Export RGBDS (.asm)', 'Export ASM', 'myfont')).data.toString();
    expect(asm).toContain('DEF MYFONT_FIRST_CHAR EQU 32');
    expect(asm).toContain('; $41 A');
    expect(asm).toContain('; $5C backslash');
    const header = (await exportFile(page, 'Export C (.h)', 'Export C', 'myfont')).data.toString();
    expect(header).toContain('const unsigned char myfont_font[] = {');
    expect(header).toContain('// 0x7F DEL');
  });
});
