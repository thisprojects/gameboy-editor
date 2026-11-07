import { isZoomWheel, zoomStep } from '@/utils/wheel';

describe('wheel helpers', () => {
  it('only pinch / Ctrl / Cmd zoom', () => {
    expect(isZoomWheel({ ctrlKey: false, metaKey: false })).toBe(false);
    expect(isZoomWheel({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isZoomWheel({ ctrlKey: false, metaKey: true })).toBe(true);
  });
  it('a wheel notch is one step, in the right direction', () => {
    expect(zoomStep({ current: 0 }, -100)).toBe(1);
    expect(zoomStep({ current: 0 }, 100)).toBe(-1);
  });
  it('small pinch deltas add up to a step', () => {
    const acc = { current: 0 };
    const steps = Array.from({ length: 10 }, () => zoomStep(acc, -5));
    expect(steps.filter((s) => s === 1)).toHaveLength(1);
    expect(steps.filter((s) => s === -1)).toHaveLength(0);
  });
});
