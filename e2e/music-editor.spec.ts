import { test, expect } from './fixtures';
import { exportFile, exportText, examplePath, readExample, loadProject, typeNumber } from './helpers';
import { installAudioProbe, peakLevel, pitchStrength, workletNodeCount } from './audio';

const cell = (page: import('@playwright/test').Page, channel: number, row: number) => page.getByTestId(`cell-${channel}-${row}`);

test.describe('music editor - writing music', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/music_editor');
    await expect(cell(page, 0, 0)).toBeVisible();
  });

  test('shows four channels and 32 rows', async ({ page }) => {
    for (const name of ['Pulse 1', 'Pulse 2', 'Wave', 'Noise']) await expect(page.getByRole('columnheader', { name: new RegExp(name) })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(32);
  });

  test('piano keys enter notes and move down a row', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z');
    await expect(cell(page, 0, 0)).toContainText('C-4');
    await page.keyboard.press('s');
    await expect(cell(page, 0, 1)).toContainText('C#4');
    await page.keyboard.press('q'); // one octave up
    await expect(cell(page, 0, 2)).toContainText('C-5');
    await page.keyboard.press('1'); // note off
    await expect(cell(page, 0, 3)).toContainText('---');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Backspace'); // clear
    await expect(cell(page, 0, 3)).toContainText('...');
  });

  test('arrow keys move between channels; each has its own octave', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // the wave channel starts at octave 3
    await page.keyboard.press('n');
    await expect(cell(page, 2, 0)).toContainText('A-3');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // stays on the last channel
    await page.keyboard.press('ArrowUp'); // up from row 1 to row 0
    await page.keyboard.press('x');
    await expect(cell(page, 3, 0)).toContainText('D-4');
  });

  test('the Oct and Ins pickers only change the notes entered afterwards', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z');
    await page.getByLabel('Pulse 1 octave').selectOption('6');
    await page.getByLabel('Pulse 1 instrument').selectOption({ label: '2: Pluck' });
    await expect(cell(page, 0, 0)).toContainText('C-4'); // the melody is not flattened to octave 6
    await expect(cell(page, 0, 0)).toContainText('00'); // ... nor moved to the new instrument
    await cell(page, 0, 1).click();
    await page.keyboard.press('z');
    await expect(cell(page, 0, 1)).toContainText('C-6');
    await expect(cell(page, 0, 1)).toContainText('02');
  });

  test('a channel only offers instruments it can play', async ({ page }) => {
    const options = async (label: string) => page.getByLabel(label).locator('option').allTextContents();
    expect(await options('Pulse 1 instrument')).toHaveLength(4);
    expect(await options('Wave instrument')).toEqual(['4: Wave Bass', '5: Wave Saw']);
    expect(await options('Noise instrument')).toHaveLength(3);
  });

  test('undo and redo', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z');
    await expect(cell(page, 0, 0)).toContainText('C-4');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(cell(page, 0, 0)).toContainText('...');
    await page.keyboard.press('Control+y');
    await expect(cell(page, 0, 0)).toContainText('C-4');
  });

  test('clicking a note opens the cell editor; the right button clears it', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z');
    await cell(page, 0, 0).click();
    const dialog = page.getByRole('dialog', { name: 'Edit cell' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox').first().selectOption('G');
    await expect(cell(page, 0, 0)).toContainText('G-4');
    await dialog.getByRole('combobox').nth(3).selectOption('9'); // volume
    await expect(cell(page, 0, 0)).toContainText('9');
    await page.getByRole('heading', { name: 'Music Editor', exact: true }).click(); // click elsewhere
    await expect(dialog).toBeHidden();
    await cell(page, 0, 0).click({ button: 'right' });
    await expect(cell(page, 0, 0)).toContainText('...');
  });

  test('typing in Rows does not cut the pattern on the way to the number', async ({ page }) => {
    await typeNumber(page, /Rows/, 64);
    await expect(page.locator('tbody tr')).toHaveCount(64);
    await cell(page, 0, 40).click();
    await page.keyboard.press('z');
    await expect(cell(page, 0, 40)).toContainText('C-4');

    const rows = page.getByLabel(/Rows/);
    await rows.click();
    await rows.press('ControlOrMeta+a');
    await rows.pressSequentially('3'); // on the way to 32: this must not cut the pattern to 4 rows
    await expect(page.locator('tbody tr')).toHaveCount(64);
    await expect(cell(page, 0, 40)).toContainText('C-4');
    await rows.pressSequentially('2');
    await rows.press('Enter');
    await expect(page.locator('tbody tr')).toHaveCount(32);
  });

  test('patterns and the order list', async ({ page }) => {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByLabel('Pattern', { exact: true })).toHaveValue('1');
    await page.getByRole('button', { name: 'Add current pattern to order' }).click();
    await expect(page.getByLabel('Order position 1', { exact: true })).toHaveValue('1');
    await page.getByLabel('Order position 0', { exact: true }).selectOption('1');
    await page.getByLabel('Remove order position 1').click();
    await expect(page.getByLabel('Order position 1', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Delete', exact: true }).click(); // delete pattern 1
    await expect(page.getByLabel('Pattern', { exact: true })).toHaveValue('0');
    await expect(page.getByLabel('Order position 0', { exact: true })).toHaveValue('0');
  });

  test('the speed shows rows per second', async ({ page }) => {
    await expect(page.getByText(/10\.0 rows\/s/)).toBeVisible();
    await typeNumber(page, /Speed/, 3);
    await expect(page.getByText(/20\.0 rows\/s/)).toBeVisible();
  });

  test('exports RGBDS and C with the player for the song that was written', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z');
    const asm = await exportText(page, 'tune');
    expect(asm).toContain('tune_update::');
    expect(asm).toContain('db $14, $86 ; NR14'); // C-4 on Pulse 1
    const header = (await exportFile(page, 'Export C (.h)', 'Export C', 'tune')).data.toString();
    expect(header).toContain('static void tune_update(void)');
    expect(header).toContain('0x14, 0x86, // NR14');
  });
});

test.describe('music editor - instruments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/music_editor');
    await page.getByRole('button', { name: 'Instruments…' }).click();
    await expect(page.getByRole('dialog', { name: 'Instruments' })).toBeVisible();
  });

  test('lists the presets; selecting one shows its settings', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    await expect(dialog.getByRole('button', { name: /^3: Zap/ })).toBeVisible();
    await dialog.getByRole('button', { name: /^3: Zap/ }).click();
    await expect(dialog.getByLabel('Instrument name')).toHaveValue('Zap');
    await expect(dialog.getByLabel('Sweep period')).toHaveValue('3');
    await dialog.getByRole('button', { name: /^6: Hi-hat/ }).click();
    await expect(dialog.getByLabel('Noise width')).toBeVisible();
    await expect(dialog.getByLabel('Sweep period')).toHaveCount(0);
  });

  test('renaming an instrument changes the pickers', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    await dialog.getByLabel('Instrument name').fill('My lead');
    await dialog.getByLabel('Close').click();
    await expect(page.getByLabel('Pulse 1 instrument').locator('option', { hasText: '0: My lead' })).toHaveCount(1);
  });

  test('drawing a waveform with the mouse changes the wave instrument', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    await dialog.getByRole('button', { name: /^4: Wave Bass/ }).click();
    const wave = dialog.getByTestId('wave-editor');
    const box = (await wave.boundingBox())!;
    await page.mouse.move(box.x + 5, box.y + 2); // sample 0, level 15
    await page.mouse.down();
    await page.mouse.move(box.x + 315, box.y + 125, { steps: 20 }); // slanting down to sample 31, level 0
    await page.mouse.up();
    await dialog.getByLabel('Close').click();
    await cell(page, 2, 0).click();
    await page.keyboard.press('n');
    const asm = await exportText(page, 'w');
    expect(asm).toContain('db $30, $F'); // wave RAM 0: the first sample is now 15 (the first nibble)
  });

  test('wave shape presets and the output level', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    await dialog.getByRole('button', { name: /^5: Wave Saw/ }).click();
    await dialog.getByRole('button', { name: 'Square', exact: true }).click();
    await dialog.getByLabel('Output level').selectOption('3');
    await dialog.getByLabel('Close').click();
    await cell(page, 2, 0).click();
    await page.getByLabel('Wave instrument').selectOption({ label: '5: Wave Saw' });
    await page.keyboard.press('n');
    const asm = await exportText(page, 'w');
    expect(asm).toContain('db $1C, $60 ; NR32'); // output level 3 = 25%
    expect(asm).toContain('db $30, $FF ; wave RAM 0'); // a square wave starts with 16 samples of 15
  });

  test('the sweep of a pulse instrument is exported in NR10', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    await dialog.getByRole('button', { name: /^3: Zap/ }).click();
    await dialog.getByLabel('Close').click();
    await cell(page, 0, 0).click();
    await page.getByLabel('Pulse 1 instrument').selectOption({ label: '3: Zap' });
    await page.keyboard.press('z');
    expect(await exportText(page, 's')).toContain('db $10, $3A ; NR10'); // period 3, pitch down, shift 2
  });

  test('adding an instrument selects it; the last of a kind cannot be deleted', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    await dialog.getByRole('button', { name: '+ noise' }).click();
    await expect(dialog.getByRole('button', { name: /^9: noise 9/ })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click(); // it is not the last noise instrument
    await expect(dialog.getByRole('button', { name: /^9:/ })).toHaveCount(0);

    // delete the pulse instruments until one is left
    for (let i = 0; i < 3; i++) {
      await dialog.getByRole('button', { name: /^0:/ }).click();
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    }
    const remaining = dialog.getByRole('button', { name: /\(pulse\)/ });
    await expect(remaining).toHaveCount(1);
    await remaining.click();
    await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toHaveAttribute('title', 'This is the last pulse instrument');
  });

  test('a stream of edits to one setting is a single undo step', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    const volume = dialog.getByLabel('Initial volume');
    await volume.focus();
    for (let i = 0; i < 6; i++) await volume.press('ArrowLeft'); // 15 -> 9 in six steps
    await expect(volume).toHaveValue('9');
    await dialog.getByLabel('Close').click();
    await page.getByLabel('Pulse 1 instrument').focus();
    await page.keyboard.press('ControlOrMeta+z');
    await page.getByRole('button', { name: 'Instruments…' }).click();
    await expect(page.getByRole('dialog', { name: 'Instruments' }).getByLabel('Initial volume')).toHaveValue('15');
  });
});

test.describe('music editor - hearing it', () => {
  test.beforeEach(async ({ page }) => {
    await installAudioProbe(page);
    await page.goto('/music_editor');
    await expect(cell(page, 0, 0)).toBeVisible();
  });

  const silent = (page: import('@playwright/test').Page) => expect.poll(() => peakLevel(page), { timeout: 4000 }).toBeLessThan(0.004);
  const loud = (page: import('@playwright/test').Page) => expect.poll(() => peakLevel(page), { timeout: 4000 }).toBeGreaterThan(0.02);

  test('entering a note sounds it at the right pitch, and it fades out by itself', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z'); // C-4 = 261.6 Hz
    await loud(page);
    await expect.poll(() => pitchStrength(page, 261.63)).toBeGreaterThan(8);
    expect(await pitchStrength(page, 700)).toBeLessThan(await pitchStrength(page, 261.63));
    await silent(page); // the preview switches itself off after a moment
  });

  test('an octave higher sounds twice as high', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('q'); // C-5 = 523.25 Hz
    await loud(page);
    await expect.poll(() => pitchStrength(page, 523.25)).toBeGreaterThan(8);
  });

  test('Play sounds the song, Stop silences it', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z');
    await silent(page); // wait for the preview to finish
    await page.getByLabel('Play').click();
    await expect(page.getByLabel('Stop')).toBeVisible();
    await loud(page);
    await expect.poll(() => pitchStrength(page, 261.63)).toBeGreaterThan(8);
    await page.getByLabel('Stop').click();
    await silent(page);
    await expect(page.getByLabel('Play')).toBeVisible();
  });

  test('a double-click on Play is a start and a stop: nothing keeps playing in the background', async ({ page }) => {
    await typeNumber(page, /Rows/, 4); // a 4-row pattern at 1 frame per row loops every 67 ms ...
    await typeNumber(page, /Speed/, 1);
    await cell(page, 0, 0).click();
    await page.keyboard.press('z'); // ... so any player left running would re-trigger the note again and again
    await silent(page);
    await page.getByLabel('Play').dblclick({ delay: 0 }); // the first click starts, the second (on the button that now says Stop) stops
    await expect(page.getByLabel('Play')).toBeVisible();
    await page.waitForTimeout(800);
    expect(await peakLevel(page)).toBeLessThan(0.004);
    expect(await workletNodeCount(page)).toBeLessThanOrEqual(1); // and only ever one sound chip
  });

  test('Stop pressed straight after Play does not leave music playing', async ({ page }) => {
    await typeNumber(page, /Rows/, 4);
    await typeNumber(page, /Speed/, 1);
    await cell(page, 0, 0).click();
    await page.keyboard.press('z');
    await silent(page);
    await page.getByLabel('Play').click();
    await page.getByLabel(/Stop|Play/).first().click(); // (the button already says Stop)
    await page.waitForTimeout(1200);
    await expect(page.getByLabel('Play')).toBeVisible();
    expect(await peakLevel(page)).toBeLessThan(0.004);
  });

  test('previewing a note while the song plays does not cut the song\'s note short', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('z'); // the song: one sustained note at row 0 ...
    await silent(page);
    await page.getByLabel('Play').click();
    await loud(page);
    await cell(page, 0, 30).click();
    await page.keyboard.press('g'); // ... and a note entered meanwhile, previewed on the same channel
    await page.waitForTimeout(1000); // longer than the 600 ms preview
    expect(await peakLevel(page)).toBeGreaterThan(0.02); // the song's note is still sounding
    await page.getByLabel('Stop').click();
    await silent(page);
  });

  test('the example song plays its first chord: C5, C4 and C3', async ({ page }) => {
    await loadProject(page, examplePath('music/song_music.json'));
    await page.getByLabel('Play').click();
    await loud(page);
    await expect.poll(() => pitchStrength(page, 523.25), { timeout: 3000 }).toBeGreaterThan(5);
    await page.getByLabel('Stop').click();
    await silent(page);
  });

  test('the Preview button in the instrument editor plays that instrument', async ({ page }) => {
    await page.getByRole('button', { name: 'Instruments…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Instruments' });
    await dialog.getByRole('button', { name: /^4: Wave Bass/ }).click();
    await dialog.getByRole('button', { name: 'Preview', exact: true }).click(); // C-3 on the wave channel = 130.8 Hz
    await loud(page);
    await expect.poll(() => pitchStrength(page, 130.81)).toBeGreaterThan(5);
  });
});

test.describe('music editor - project files', () => {
  test('a song with a note that uses a missing instrument is refused', async ({ page }) => {
    await page.goto('/music_editor');
    const song = JSON.parse(readExample('music/song_music.json'));
    song.patterns[0].cells[0][0].instrument = 20;
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await page.getByTestId('project-input').setInputFiles({ name: 'bad_music.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(song)) });
    expect(await message).toMatch(/not a Game Boy music project/);
  });

  test('a note on a channel that cannot play its instrument is refused', async ({ page }) => {
    await page.goto('/music_editor');
    const song = JSON.parse(readExample('music/song_music.json'));
    song.patterns[0].cells[2][0].instrument = 0; // a pulse instrument on the wave channel
    const message = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
    await page.getByTestId('project-input').setInputFiles({ name: 'bad_music.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(song)) });
    expect(await message).toMatch(/not a Game Boy music project/);
  });

  test('the example song loads with its two patterns in the order list', async ({ page }) => {
    await page.goto('/music_editor');
    await loadProject(page, examplePath('music/song_music.json'));
    await expect(page.getByLabel('Order position 1', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Order position 2', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Pattern', { exact: true }).locator('option')).toHaveCount(2);
    await expect(cell(page, 0, 0)).toContainText('C-5');
  });
});
