import { test, expect } from './fixtures';
import { zoomWheel } from './helpers';

const EDITORS = ['/tile_editor', '/sprite_editor', '/background_editor', '/metatile_editor', '/level_editor', '/font_editor', '/music_editor'];
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1024, height: 700 },
  { width: 1920, height: 1080 },
];

test.describe('editor layout', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of EDITORS) {
      test(`${route} at ${viewport.width}x${viewport.height}: the toolbar is 220px, fits its content and leaves the work area clear`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(route);
        const toolbar = page.locator('div.fixed.left-0').filter({ has: page.getByRole('heading', { level: 1 }) });
        await expect(toolbar).toBeVisible();

        const box = (await toolbar.boundingBox())!;
        expect(box.width, 'the page reserves 220px for the toolbar (ml-[220px])').toBe(220);

        // nothing inside the toolbar sticks out sideways, and it does not scroll sideways
        const overflow = await toolbar.evaluate((t) => {
          const right = t.getBoundingClientRect().right;
          return {
            scrolls: t.scrollWidth > t.clientWidth,
            wide: [...t.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > right + 0.5).map((e) => e.tagName + (e.getAttribute('aria-label') ?? e.id ?? '')),
          };
        });
        expect(overflow).toEqual({ scrolls: false, wide: [] });

        // the page itself does not scroll sideways
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

        // the work area starts to the right of the toolbar: its first control is not covered by it
        const work = page.locator('div.min-h-screen.ml-\\[220px\\]');
        const workBox = (await work.boundingBox())!;
        expect(workBox.x).toBeGreaterThanOrEqual(box.x + box.width);
      });
    }
  }

  for (const route of EDITORS) {
    test(`${route}: the toolbar can be closed to give the work area the full width, and opened again`, async ({ page }) => {
      await page.goto(route);
      const toolbarTitle = page.getByRole('heading', { level: 1 }).first();
      await expect(toolbarTitle).toBeInViewport();
      await page.getByTitle('Close toolbar').click();
      await expect(toolbarTitle).not.toBeInViewport();
      const work = page.locator('div.min-h-screen.transition-all');
      await expect.poll(async () => (await work.boundingBox())!.x).toBe(0);
      await page.getByTitle('Open toolbar').click();
      await expect(toolbarTitle).toBeInViewport();
      await expect.poll(async () => (await work.boundingBox())!.x).toBe(220);
    });
  }
});

test.describe('big canvases stay reachable', () => {
  const cases = [
    { route: '/background_editor', canvas: 'map-canvas', note: '32x32 tiles at zoom 3 is 768px tall' },
    { route: '/tile_editor', canvas: 'tile-canvas', note: 'zoomed in with the wheel' },
    { route: '/level_editor', canvas: 'level-canvas', note: 'zoomed in with the wheel' },
  ];
  for (const { route, canvas, note } of cases) {
    test(`${route} (${note}): the canvas starts inside its scroll area, so its top-left cell can be clicked`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(route);
      const target = page.getByTestId(canvas);
      await expect(target).toBeVisible();
      if (route !== '/background_editor') {
        await target.hover();
        for (let i = 0; i < 14; i++) await zoomWheel(page, -100);
      }
      const geometry = await target.evaluate((c) => {
        const area = c.closest('.overflow-auto')!;
        const a = area.getBoundingClientRect();
        const b = c.getBoundingClientRect();
        const navbarBottom = document.querySelector('nav')!.getBoundingClientRect().bottom;
        return { canvasTop: b.top, canvasLeft: b.left, areaTop: a.top, areaLeft: a.left, areaBottom: a.bottom, navbarBottom, innerHeight };
      });
      expect(geometry.canvasTop, 'the top of the canvas is not above its scroll area').toBeGreaterThanOrEqual(geometry.areaTop - 1);
      expect(geometry.canvasLeft, 'the left of the canvas is not left of its scroll area').toBeGreaterThanOrEqual(geometry.areaLeft - 1);
      expect(geometry.areaTop, 'the scroll area starts below the navbar').toBeGreaterThanOrEqual(geometry.navbarBottom);
      expect(geometry.areaBottom, 'the scroll area ends inside the window').toBeLessThanOrEqual(geometry.innerHeight);
      // and the very first cell really can be clicked (nothing is on top of it)
      await target.click({ position: { x: 4, y: 4 }, trial: true });
    });
  }

  test('a canvas that is bigger than its area scrolls instead of being cut off', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.goto('/background_editor');
    const area = page.locator('.overflow-auto').filter({ has: page.getByTestId('map-canvas') });
    const sizes = await area.evaluate((a) => ({ scrollH: a.scrollHeight, clientH: a.clientHeight, scrollW: a.scrollWidth, clientW: a.clientWidth }));
    expect(sizes.scrollH).toBeGreaterThan(sizes.clientH); // it needs to scroll ...
    await area.evaluate((a) => a.scrollTo(0, a.scrollHeight));
    await page.getByTestId('map-canvas').click({ position: { x: 30, y: 750 }, trial: true }); // ... and the bottom can be reached
    await area.evaluate((a) => a.scrollTo(0, 0));
    await page.getByTestId('map-canvas').click({ position: { x: 4, y: 4 }, trial: true }); // ... and so can the top
  });

  for (const route of EDITORS) {
    test(`${route}: Load/Save/Export stay pinned in view, and the Export menu opens inside the toolbar`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 600 });
      await page.goto(route);
      const bar = page.getByTestId('file-actions');
      const viewport = page.viewportSize()!;
      const inView = async () => {
        const b = (await bar.boundingBox())!;
        return b.y >= 0 && b.y + b.height <= viewport.height + 0.5;
      };
      expect(await inView(), 'visible without scrolling').toBe(true);
      // still pinned after the toolbar is scrolled to its end
      await page.locator('div.fixed.left-0 div.overflow-y-auto').first().evaluate((el) => (el.scrollTop = el.scrollHeight));
      expect(await inView()).toBe(true);

      await bar.locator('summary').click();
      const menu = bar.locator('details > div');
      await expect(menu).toBeVisible();
      const m = (await menu.boundingBox())!;
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x + m.width).toBeLessThanOrEqual(220);
      expect(m.y).toBeGreaterThanOrEqual(40); // below the navbar
      // Escape and an outside click both close it
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await bar.locator('summary').click();
      await page.mouse.click(700, 300);
      await expect(menu).toBeHidden();
    });
  }

  for (const route of EDITORS.filter((r) => r !== '/music_editor')) {
    test(`${route}: tool buttons form an even grid (no lone button on a row)`, async ({ page }) => {
      await page.goto(route);
      const tops = await page.locator('button[aria-pressed]').evaluateAll((els) => {
        const rows = new Map<number, number>();
        for (const e of els.slice(0, 8)) {
          if (!e.closest('.grid')) continue;
          const y = Math.round(e.getBoundingClientRect().top);
          rows.set(y, (rows.get(y) ?? 0) + 1);
        }
        return [...rows.values()];
      });
      expect(tops.length).toBeGreaterThan(0);
      expect(Math.min(...tops), `buttons per row: ${tops}`).toBeGreaterThan(1);
    });
  }

  for (const route of EDITORS) {
    test(`${route}: nothing sticks out of its toolbar card`, async ({ page }) => {
      await page.goto(route);
      const out = await page.locator('details[open]').evaluateAll((cards) =>
        cards.flatMap((card) => {
          const right = card.getBoundingClientRect().right;
          return [...card.querySelectorAll('*')]
            .filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > right + 0.5 && !e.closest('[data-testid="file-actions"]'))
            .map((e) => `${e.tagName}${e.getAttribute('data-testid') ?? e.getAttribute('aria-label') ?? ''}`);
        })
      );
      expect(out).toEqual([]);
    });
  }
});
