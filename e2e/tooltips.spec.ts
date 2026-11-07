import { test, expect } from './fixtures';

const EDITORS: [string, string, RegExp][] = [
  ['/tile_editor', 'Pencil', /draw single pixels/],
  ['/sprite_editor', 'Bucket (flood fill)', /fill the connected area/],
  ['/background_editor', 'Rectangle', /rectangle/],
  ['/metatile_editor', 'Pick tile', /tile it holds/],
  ['/level_editor', 'Stamp', /paint the selected item/],
  ['/font_editor', 'Line', /straight line/],
];

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
    await page.getByRole('button', { name: 'Load project' }).hover();
    await expect(page.getByRole('tooltip')).toContainText('project file');
    await page.getByRole('button', { name: 'Undo' }).hover();
    await expect(page.getByRole('tooltip')).toContainText('Undo');
    await page.locator('#zoom').hover();
    await expect(page.getByRole('tooltip')).toContainText('canvas');
  });

  test('music editor Play has a tooltip', async ({ page }) => {
    await page.goto('/music_editor');
    await page.getByRole('button', { name: 'Play' }).hover();
    await expect(page.getByRole('tooltip')).toContainText('Play');
  });
});
