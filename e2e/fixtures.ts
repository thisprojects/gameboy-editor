import { test as base, expect } from '@playwright/test';

type Options = {
  /** Pre-dismiss the first-visit instructions dialogs (default). Set to false to see them. */
  skipInstructions: boolean;
};

/**
 * `test` with two extras for every test:
 *  - the "How to use" dialogs are dismissed in advance (they would cover the page), unless skipInstructions is false;
 *  - the test fails if the page logs a console error or throws.
 */
export const test = base.extend<Options & { pageErrors: string[] }>({
  skipInstructions: [true, { option: true }],

  pageErrors: [
    async ({ page, skipInstructions }, use) => {
      if (skipInstructions) {
        await page.addInitScript(() => {
          for (const editor of ['tile', 'sprite', 'map', 'metatile', 'level', 'font', 'music']) {
            localStorage.setItem(`${editor}Editor_hideInstructions`, 'true');
          }
        });
      }
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon/i.test(m.text() + m.location().url)) errors.push(`console.error: ${m.text()}`);
      });
      await use(errors);
      expect(errors, 'the page should not log errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
