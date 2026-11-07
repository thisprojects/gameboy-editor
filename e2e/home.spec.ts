import { test, expect } from './fixtures';

const EDITORS = [
  { path: '/tile_editor', name: 'Tile Editor', accent: 'rgb(163, 230, 53)' },
  { path: '/sprite_editor', name: 'Sprite Editor', accent: 'rgb(52, 211, 153)' },
  { path: '/map_editor', name: 'Map Editor', accent: 'rgb(34, 211, 238)' },
  { path: '/metatile_editor', name: 'Metatile Editor', accent: 'rgb(129, 140, 248)' },
  { path: '/level_editor', name: 'Level Editor', accent: 'rgb(244, 114, 182)' },
  { path: '/font_editor', name: 'Font Editor', accent: 'rgb(251, 191, 36)' },
  { path: '/music_editor', name: 'Music Editor', accent: 'rgb(251, 113, 133)' },
];

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the title, the feature chips and a tile for every editor', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Game Boy Editor');
    for (const chip of ['DMG', '160 × 144', '4 shades', 'RGBDS & GBDK']) await expect(page.getByText(chip, { exact: true })).toBeVisible();
    for (const [i, editor] of EDITORS.entries()) {
      const tile = page.getByRole('main').getByRole('link', { name: editor.name, exact: true });
      await expect(tile).toBeVisible();
      await expect(tile.getByRole('heading', { level: 2 })).toHaveText(editor.name);
      await expect(tile).toContainText(String(i + 1).padStart(2, '0'));
      await expect(tile.getByTestId('pixel-icon')).toBeVisible();
      await expect(tile).toContainText('Open editor');
    }
  });

  test('the icons are drawn in the Game Boy greens', async ({ page }) => {
    const fills = await page.getByTestId('pixel-icon').first().evaluate((svg) => [...new Set([...svg.querySelectorAll('rect')].map((r) => r.getAttribute('fill')))]);
    expect(fills.length).toBeGreaterThanOrEqual(2);
    for (const fill of fills) expect(['#8bac0f', '#306230', '#0f380f']).toContain(fill);
    const box = await page.getByTestId('pixel-icon').first().boundingBox();
    expect(Math.round(box!.width)).toBe(Math.round(box!.height)); // square, not stretched
  });

  for (const editor of EDITORS) {
    test(`hovering ${editor.name} highlights it in its own colour and lifts it`, async ({ page }) => {
      const tile = page.getByRole('main').getByRole('link', { name: editor.name, exact: true });
      const restingBorder = await tile.evaluate((el) => getComputedStyle(el).borderTopColor);
      const restingTop = (await tile.boundingBox())!.y;
      expect(restingBorder).not.toBe(editor.accent);
      await tile.hover();
      await expect.poll(() => tile.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(editor.accent); // (it fades in)
      await expect.poll(async () => (await tile.boundingBox())!.y).toBeLessThan(restingTop); // moved up
    });
  }

  test('keyboard focus shows the same highlight', async ({ page }) => {
    const tile = page.getByRole('main').getByRole('link', { name: 'Map Editor', exact: true });
    await tile.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => tile.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe('rgb(34, 211, 238)');
    await expect.poll(() => tile.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
  });

  test('the tiles can be reached with Tab and opened with Enter', async ({ page }) => {
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab'); // the three first tiles
    await expect(page.getByRole('main').getByRole('link', { name: 'Map Editor', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/map_editor$/);
  });

  for (const editor of EDITORS) {
    test(`clicking ${editor.name} opens it`, async ({ page }) => {
      await page.getByRole('main').getByRole('link', { name: editor.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${editor.path}$`));
      await expect(page.getByRole('heading', { name: editor.name, exact: true })).toBeVisible();
    });
  }

  for (const viewport of [
    { width: 375, height: 800, across: 1 },
    { width: 700, height: 900, across: 2 },
    { width: 1000, height: 900, across: 3 },
    { width: 1440, height: 900, across: 4 },
    { width: 1920, height: 1080, across: 4 },
  ]) {
    test(`at ${viewport.width}px wide there are ${viewport.across} tile(s) across, nothing overflows`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      const tops = await page.getByRole('main').getByRole('link').evaluateAll((links) => links.map((l) => Math.round(l.getBoundingClientRect().top)));
      const firstRow = tops.filter((t) => Math.abs(t - tops[0]) < 3).length;
      expect(firstRow).toBe(viewport.across);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const outside = await page.getByRole('main').getByRole('link').evaluateAll((links) => links.filter((l) => l.getBoundingClientRect().right > innerWidth + 1 || l.getBoundingClientRect().left < -1).length);
      expect(outside).toBe(0);
    });
  }

  test('the last, shorter row of tiles is centred, not pushed to the left', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 }); // 4 across: 4 tiles, then 3
    await page.goto('/');
    const boxes = await Promise.all(EDITORS.map((e) => page.getByRole('main').getByRole('link', { name: e.name, exact: true }).boundingBox()));
    const lastRow = boxes.slice(4).map((b) => b!);
    const firstRow = boxes.slice(0, 4).map((b) => b!);
    const centre = (row: typeof firstRow) => (row[0].x + row[row.length - 1].x + row[row.length - 1].width) / 2;
    expect(Math.abs(centre(lastRow) - centre(firstRow))).toBeLessThan(3);
    expect(lastRow[0].x).toBeGreaterThan(firstRow[0].x + 50); // indented relative to the row above
  });

  test('the title text and tile text are readable on their backgrounds (WCAG AA)', async ({ page }) => {
    const ratios = await page.evaluate(() => {
      const parse = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: number[], b: number[]) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
      const tile = document.querySelector('main a')!;
      const background = parse(getComputedStyle(document.querySelector('main')!).backgroundColor);
      const out: Record<string, number> = {};
      out.description = ratio(parse(getComputedStyle(tile.querySelector('p')!).color), [31, 41, 55]); // against the lightest tile colour (gray-800)
      out.heading = ratio(parse(getComputedStyle(tile.querySelector('h2')!).color), [31, 41, 55]);
      out.subtitle = ratio(parse(getComputedStyle(document.querySelector('header p')!).color), background);
      out.openLink = ratio(parse(getComputedStyle(tile.querySelector('span[aria-hidden]:last-of-type')!).color), [31, 41, 55]);
      return out;
    });
    for (const [what, value] of Object.entries(ratios)) expect(value, what).toBeGreaterThanOrEqual(4.5);
  });
});
