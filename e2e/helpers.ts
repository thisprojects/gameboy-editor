import fs from 'fs';
import path from 'path';
import { Page, expect } from '@playwright/test';

const EXAMPLES = path.join(__dirname, '..', 'examples');
export const examplePath = (file: string) => path.join(EXAMPLES, file);
export const readExample = (file: string) => fs.readFileSync(examplePath(file), 'utf-8');

/** Load a project file through the editor's hidden "Load project" file input. */
export async function loadProject(page: Page, file: string) {
  await page.getByTestId('project-input').setInputFiles(file);
}

/** Open the toolbar's Export menu (it is a pop-up above the pinned file actions) and click one entry. */
export async function clickToolbarExport(page: Page, toolbarButton: string) {
  if (toolbarButton.startsWith('Export')) {
    const menu = page.getByTestId('file-actions').locator('details');
    if (!(await menu.evaluate((d: HTMLDetailsElement) => d.open))) await menu.locator('summary').click();
  }
  await page.getByRole('button', { name: toolbarButton, exact: true }).click();
}

/**
 * Click an export button in the toolbar, name the file in the dialog, confirm, and return what was downloaded.
 * (The dialog's confirm button is called e.g. "Export ASM", the toolbar's e.g. "Export RGBDS (.asm)".)
 */
export async function exportFile(page: Page, toolbarButton: string, confirmButton: string, fileName?: string) {
  await clickToolbarExport(page, toolbarButton);
  const dialogInput = page.locator('div.fixed input[type="text"]');
  await expect(dialogInput).toBeVisible();
  if (fileName !== undefined) await dialogInput.fill(fileName);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: confirmButton, exact: true }).click(),
  ]);
  const file = await download.path();
  return { name: download.suggestedFilename(), data: fs.readFileSync(file) };
}

export const exportText = async (page: Page, fileName: string) =>
  (await exportFile(page, 'Export RGBDS (.asm)', 'Export ASM', fileName)).data.toString('utf-8');

/** The canvas's drawing surface size in canvas pixels. */
export async function canvasSize(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((c: HTMLCanvasElement) => ({ width: c.width, height: c.height }));
}

/** The colour of one canvas pixel as '#rrggbb'. */
export async function pixelAt(page: Page, testId: string, x: number, y: number) {
  return page.getByTestId(testId).evaluate(
    (c: HTMLCanvasElement, [px, py]) => {
      const [r, g, b] = c.getContext('2d')!.getImageData(px, py, 1, 1).data;
      return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    },
    [x, y]
  );
}

/** Click a position (in CSS pixels from the top-left) inside an element. */
export async function clickAt(page: Page, testId: string, x: number, y: number) {
  await page.getByTestId(testId).click({ position: { x, y } });
}

/** Compare two '#rrggbb' colours channel by channel, allowing a small difference (for blended pixels). */
export function nearColour(actual: string, expected: string, tolerance = 3) {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = channels(actual);
  const e = channels(expected);
  return a.every((v, i) => Math.abs(v - e[i]) <= tolerance);
}

/** Whether any pixel of a canvas differs from `background` ('#rrggbb'). */
export async function canvasHasInk(page: Page, testId: string, background: string) {
  return page.getByTestId(testId).evaluate((c: HTMLCanvasElement, bg) => {
    const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    for (let i = 0; i < data.length; i += 4) if (data[i] !== r || data[i + 1] !== g || data[i + 2] !== b) return true;
    return false;
  }, background);
}

/** Set a NumberField the way a user does: select its text, type, press Enter. */
export async function typeNumber(page: Page, label: string | RegExp, value: string | number) {
  const field = page.getByLabel(label);
  await field.click();
  await field.press('ControlOrMeta+a');
  await field.pressSequentially(String(value));
  await field.press('Enter');
}

/**
 * How many pixels of an 8x8 glyph editor canvas are set (darkest shade). The canvas has grid lines drawn over it,
 * so this samples the middle of each pixel instead of looking at the whole canvas.
 */
export async function glyphInk(page: Page, testId = 'tile-canvas', darkest = '#0f380f') {
  return page.getByTestId(testId).evaluate((c: HTMLCanvasElement, dark) => {
    const ctx = c.getContext('2d')!;
    const size = c.width / 8;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(dark.slice(i, i + 2), 16));
    let count = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const d = ctx.getImageData(Math.floor(x * size + size / 2), Math.floor(y * size + size / 2), 1, 1).data;
        if (d[0] === r && d[1] === g && d[2] === b) count++;
      }
    }
    return count;
  }, darkest);
}

/** Zoom the canvas under the mouse: Ctrl/Cmd + wheel (what a trackpad pinch sends). A plain wheel pans. */
export async function zoomWheel(page: import('@playwright/test').Page, deltaY: number): Promise<void> {
  await page.keyboard.down('ControlOrMeta');
  await page.mouse.wheel(0, deltaY);
  await page.keyboard.up('ControlOrMeta');
}
