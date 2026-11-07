import { test, expect } from './fixtures';
import { readExample } from './helpers';

const PAGES = [
  { path: '/tile_examples.html', label: 'Tiles', program: 'tiles/tile_viewer.asm' },
  { path: '/sprite_examples.html', label: 'Sprites', program: 'sprite/sprite_demo.asm' },
  { path: '/background_examples.html', label: 'Background', program: 'map/map_viewer.asm' },
  { path: '/font_examples.html', label: 'Font', program: 'font/font_demo.asm' },
  { path: '/level_examples.html', label: 'Level', program: 'level/level_demo.asm' },
  { path: '/music_examples.html', label: 'Music', program: 'music/music_demo.asm' },
];

test.describe('example pages', () => {
  for (const { path, label, program } of PAGES) {
    test.describe(`${path}`, () => {
      test('loads, with a title block, the menu and highlighted code', async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.locator('.title-block h1')).toBeVisible();
        const menu = page.getByRole('navigation', { name: 'Documentation' });
        await expect(menu.getByRole('link')).toHaveCount(PAGES.length + 1); // six examples and the book
        await expect(menu.locator('a[aria-current="page"]')).toHaveText(label);
        expect(await page.locator('pre code').count()).toBeGreaterThanOrEqual(3);
        await expect(page.locator('pre .keyword').first()).toBeVisible();
        await expect(page.locator('pre .comment').first()).toBeVisible();
        await expect(page.locator('pre .number').first()).toBeVisible();
      });

      test('shows the complete source of its program', async ({ page }) => {
        await page.goto(path);
        const code = (await page.locator('pre code').allTextContents()).join('\n');
        for (const line of readExample(program).split('\n')) if (line.trim()) expect(code).toContain(line.trimEnd());
      });

      test('every link goes somewhere that exists, and every #anchor exists on its page', async ({ page }) => {
        await page.goto(path);
        const links = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
        expect(links.length).toBeGreaterThan(8);
        for (const href of new Set(links)) {
          if (/^https?:/.test(href)) continue; // external sites are not tested
          const [target, fragment] = href.split('#');
          const response = await page.request.get(target || path);
          expect(response.status(), href).toBe(200);
          if (fragment) expect(await response.text(), href).toContain(`id="${fragment}"`);
        }
      });

      test('fits a phone screen without sideways scrolling', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 700 });
        await page.goto(path);
        const overflow = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth - innerWidth,
          wide: [...document.querySelectorAll('pre')].filter((p) => p.scrollWidth > p.clientWidth + 1).length,
        }));
        expect(overflow.page).toBeLessThanOrEqual(0);
        expect(overflow.wide, 'code blocks wrap their lines instead of overflowing').toBe(0);
      });
    });
  }

  test('the menu moves between the example pages and the book', async ({ page }) => {
    await page.goto('/tile_examples.html');
    const menu = page.getByRole('navigation', { name: 'Documentation' });
    for (const next of ['Sprites', 'Background', 'Font', 'Level', 'Music', 'Tiles']) {
      await menu.getByRole('link', { name: next, exact: true }).click();
      await expect(menu.locator('a[aria-current="page"]')).toHaveText(next);
    }
    await menu.getByRole('link', { name: 'Game Boy Assembly Introduction' }).click();
    await expect(page).toHaveURL(/gameboy_book\.html$/);
    await expect(page.locator('h1').first()).toContainText('Game Boy Assembly Language');
  });

  test('the "helpers" anchor on the Tiles page is the target of the other pages\' links', async ({ page }) => {
    await page.goto('/sprite_examples.html');
    await page.getByRole('link', { name: 'helper routines' }).click();
    await expect(page).toHaveURL(/tile_examples\.html#helpers$/);
    await expect(page.locator('#helpers')).toBeInViewport();
  });

  test('the code colours are readable against the code background', async ({ page }) => {
    await page.goto('/tile_examples.html');
    const contrast = await page.evaluate(() => {
      const channels = (css: string) => (css.match(/\d+/g) ?? []).slice(0, 3).map(Number);
      const luminance = ([r, g, b]: number[]) => {
        const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      };
      const ratio = (a: number[], b: number[]) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
      const pre = document.querySelector('pre')!;
      const bg = channels(getComputedStyle(pre).backgroundColor);
      const result: Record<string, number> = {};
      for (const cls of ['keyword', 'label', 'comment', 'number', 'string', 'directive']) {
        const el = document.querySelector(`pre .${cls}`);
        if (el) result[cls] = ratio(channels(getComputedStyle(el).color), bg);
      }
      result.plain = ratio(channels(getComputedStyle(pre.querySelector('code')!).color), bg);
      return result;
    });
    for (const [kind, value] of Object.entries(contrast)) expect(value, `${kind} text contrast`).toBeGreaterThanOrEqual(4.5); // WCAG AA
  });
});

test.describe('the Game Boy book', () => {
  test('loads, and its contents links jump to their sections', async ({ page }) => {
    const response = await page.goto('/gameboy_book.html');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toContainText('An Introduction to Game Boy Assembly Language');
    const toc = page.locator('nav#toc');
    await expect(toc).toBeVisible();
    const link = toc.getByRole('link', { name: /Functions/ }).first();
    const target = (await link.getAttribute('href'))!;
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    await expect(page.locator(`[id="${target.slice(1)}"]`)).toBeInViewport(); // (an attribute selector: the id starts with a digit)
  });

  test('every in-page link of the contents resolves to a section', async ({ page }) => {
    await page.goto('/gameboy_book.html');
    const hrefs = await page.locator('nav#toc a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!.slice(1)));
    expect(hrefs.length).toBeGreaterThan(30);
    const missing = await page.evaluate((ids) => ids.filter((id) => !document.getElementById(id)), hrefs);
    expect(missing).toEqual([]);
  });

  test('has runnable-looking code blocks with highlighting', async ({ page }) => {
    await page.goto('/gameboy_book.html');
    expect(await page.locator('pre code').count()).toBeGreaterThan(30);
    await expect(page.locator('pre .keyword').first()).toBeVisible();
  });
});
