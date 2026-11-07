import { test, expect } from './fixtures';

const EDITORS = [
  { path: '/tile_editor', link: 'Tile Editor' },
  { path: '/sprite_editor', link: 'Sprite Editor' },
  { path: '/background_editor', link: 'Background Editor' },
  { path: '/metatile_editor', link: 'Metatile Editor' },
  { path: '/level_editor', link: 'Level Editor' },
  { path: '/font_editor', link: 'Font Editor' },
  { path: '/music_editor', link: 'Music Editor' },
];

test.describe('landing page and navigation', () => {
  test('the landing page lists every editor and each link opens that editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Game Boy Editor' })).toBeVisible();
    for (const editor of EDITORS) {
      await page.goto('/');
      await page.getByRole('main').getByRole('link', { name: editor.link, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${editor.path}$`));
      await expect(page.getByRole('heading', { name: editor.link, exact: true })).toBeVisible();
    }
  });

  test('the navbar switches between editors and marks the current one', async ({ page }) => {
    await page.goto('/tile_editor');
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: 'Tile Editor', exact: true })).toHaveClass(/bg-blue-600/);
    await expect(nav.getByRole('link', { name: 'Background Editor', exact: true })).not.toHaveClass(/bg-blue-600/);
    for (const editor of EDITORS) {
      await nav.getByRole('link', { name: editor.link, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${editor.path}$`));
      await expect(nav.getByRole('link', { name: editor.link, exact: true })).toHaveClass(/bg-blue-600/);
    }
    await nav.getByRole('link', { name: 'NorbSoft', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('every editor is a working page with a toolbar, a canvas or grid, and no console errors', async ({ page }) => {
    for (const editor of EDITORS) {
      const response = await page.goto(editor.path);
      expect(response?.status(), editor.path).toBe(200);
      await expect(page.getByRole('heading', { name: editor.link, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save project' })).toBeVisible();
    }
  });
});

test.describe('Documentation menu', () => {
  const DOCS = [
    { label: 'Game Boy Assembly Introduction', href: '/gameboy_book.html', heading: 'An Introduction to Game Boy Assembly Language' },
    { label: 'ASM Example: Tiles', href: '/tile_examples.html', heading: 'Tiles: Displaying Exported Tiles' },
    { label: 'ASM Example: Sprites', href: '/sprite_examples.html', heading: 'Sprites: Animating an Exported Sprite' },
    { label: 'ASM Example: Background', href: '/background_examples.html', heading: 'Background: Showing and Scrolling a Tile Map' },
    { label: 'ASM Example: Font', href: '/font_examples.html', heading: 'Font: Printing Text with an Exported Font' },
    { label: 'ASM Example: Level', href: '/level_examples.html', heading: 'Level: Metatiles, Collision and a Camera' },
    { label: 'ASM Example: Music', href: '/music_examples.html', heading: 'Music: Playing an Exported Song' },
  ];

  test('opens, lists the book and every example, and closes again', async ({ page }) => {
    await page.goto('/tile_editor');
    const toggle = page.getByRole('button', { name: /Documentation/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    for (const doc of DOCS) await expect(page.getByRole('link', { name: doc.label })).toHaveAttribute('href', doc.href);
    await toggle.click();
    await expect(page.getByRole('link', { name: 'ASM Example: Tiles' })).toHaveCount(0);
    await toggle.click();
    await page.getByRole('heading', { name: 'Tile Editor', exact: true }).click(); // a click elsewhere closes it
    await expect(page.getByRole('link', { name: 'ASM Example: Tiles' })).toHaveCount(0);
  });

  for (const doc of DOCS) {
    test(`"${doc.label}" opens in a new tab and shows its page`, async ({ page, context }) => {
      await page.goto('/music_editor');
      await page.getByRole('button', { name: /Documentation/ }).click();
      const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: doc.label }).click()]);
      await popup.waitForLoadState();
      expect(new URL(popup.url()).pathname).toBe(doc.href);
      await expect(popup.getByRole('heading', { level: 1 }).first()).toContainText(doc.heading);
      await expect(page.getByRole('link', { name: doc.label })).toHaveCount(0); // and the menu closed behind it
      await popup.close();
    });
  }
});

test('old Map Editor links still work', async ({ page }) => {
  await page.goto('/map_editor');
  await expect(page).toHaveURL(/\/background_editor$/);
  await page.goto('/map_examples.html');
  await expect(page).toHaveURL(/\/background_examples\.html$/);
});
