import { downloadBlob } from '@/utils/download';
import { isIntIn, isShade } from '@/utils/validate';

describe('downloadBlob', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (URL.revokeObjectURL as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('clicks an anchor that is in the document, then removes it', () => {
    let attachedWhenClicked = false;
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      attachedWhenClicked = document.body.contains(this);
    });
    downloadBlob('data', 'file.txt', 'text/plain');
    expect(click).toHaveBeenCalledTimes(1);
    expect(attachedWhenClicked).toBe(true);
    const clicked = click.mock.contexts[0] as HTMLAnchorElement; // the anchor that was clicked
    expect(clicked.download).toBe('file.txt');
    expect(clicked.href).toContain('mock-url');
    expect(document.body.contains(clicked)).toBe(false);
    click.mockRestore();
  });

  it('keeps the download URL valid for a moment instead of revoking it straight away', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob('data', 'file.txt', 'text/plain');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    click.mockRestore();
  });
});

describe('validate', () => {
  it('isIntIn accepts only whole numbers in range', () => {
    expect(isIntIn(5, 1, 10)).toBe(true);
    expect(isIntIn(1, 1, 10)).toBe(true);
    expect(isIntIn(10, 1, 10)).toBe(true);
    for (const bad of [0, 11, 1.5, NaN, Infinity, null, undefined, '5', [5], {}, true]) expect(isIntIn(bad, 1, 10)).toBe(false);
  });

  it('isShade accepts 0-3 only (not null, strings or fractions, which a plain range check lets through)', () => {
    for (const ok of [0, 1, 2, 3]) expect(isShade(ok)).toBe(true);
    for (const bad of [-1, 4, 1.5, null, '2', undefined, false]) expect(isShade(bad)).toBe(false);
  });
});
