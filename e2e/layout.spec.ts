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
});
