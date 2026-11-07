import { getShadeHex, PALETTE_PRESETS } from '@/constants';

describe('constants', () => {
  it('returns shade hex from default and given preset', () => {
    expect(getShadeHex(0)).toBe(PALETTE_PRESETS[0].colours[0]);
    expect(getShadeHex(3, PALETTE_PRESETS[1])).toBe('#000000');
  });
});
