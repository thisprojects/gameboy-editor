import type { Locator } from '@playwright/test';
import { test, expect } from './fixtures';

const EDITORS: [string, string, RegExp][] = [
  ['/tile_editor', 'Pencil', /draw single pixels/],
  ['/sprite_editor', 'Bucket (flood fill)', /fill the connected area/],
  ['/background_editor', 'Rectangle', /rectangle/],
  ['/metatile_editor', 'Pick tile', /tile it holds/],
  ['/level_editor', 'Stamp', /paint the selected item/],
  ['/font_editor', 'Line', /straight line/],
];

async function moveOnto(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.page().waitForTimeout(150); // let the scroll settle
  const box = (await locator.boundingBox())!;
  const page = locator.page();
  await page.mouse.move(box.x + box.width / 2 - 3, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('hover tooltips', () => {
  for (const [path, tool, text] of EDITORS) {
    test(`${path}: hovering ${tool} shows its tooltip at once`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('button', { name: tool, exact: true }).hover();
      await expect(page.getByRole('tooltip')).toHaveText(text);
    });
  }

  test('toolbar buttons, undo and sliders have tooltips', async ({ page }) => {
    await page.goto('/tile_editor');
    await moveOnto(page.getByRole('button', { name: 'Load project' }));
    await expect(page.getByRole('tooltip')).toContainText('project file');
    // The toolbar is taller than a short window. Playwright's hover() may scroll the control into view, and a scroll
    // hides the tooltip (as it should), so bring the control into view first and then move the mouse onto it.
    await moveOnto(page.getByRole('button', { name: 'Undo' }));
    await expect(page.getByRole('tooltip')).toContainText('Undo');
    await moveOnto(page.locator('#zoom'));
    await expect(page.getByRole('tooltip')).toContainText('canvas');
  });

  test('music editor Play has a tooltip', async ({ page }) => {
    await page.goto('/music_editor');
    await page.getByRole('button', { name: 'Play' }).hover();
    await expect(page.getByRole('tooltip')).toContainText('Play');
  });
});
