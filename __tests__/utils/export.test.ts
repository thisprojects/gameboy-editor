import { toIdentifier, exportTilesRGBDS, exportTilesC } from '@/utils/export';
import { downloadBlob } from '@/utils/download';

const data = Uint8Array.from([...Array(16).keys(), ...Array(16).fill(255)]);

describe('export', () => {
  it('sanitises identifiers', () => {
    expect(toIdentifier('my tiles!')).toBe('my_tiles');
    expect(toIdentifier('1abc')).toBe('_1abc');
    expect(toIdentifier('  ')).toBe('tiles');
  });

  it('writes RGBDS', () => {
    const out = exportTilesRGBDS('hero', data);
    expect(out).toContain('DEF HERO_TILE_COUNT EQU 2');
    expect(out).toContain('hero_tiles::');
    expect(out).toContain('db $00, $01, $02');
    expect(out).toContain('db $FF, $FF');
    expect(out).toContain('hero_tiles_end::');
  });

  it('writes C with no trailing comma on the last tile', () => {
    const out = exportTilesC('hero', data);
    expect(out).toContain('#define HERO_TILE_COUNT 2');
    expect(out).toContain('const unsigned char hero_tiles[] = {');
    expect(out).toMatch(/0xFF \/\/ tile 1/);
  });

  it('downloads a blob', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob('x', 'f.txt', 'text/plain');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
