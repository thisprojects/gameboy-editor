import { render } from '@testing-library/react';
import { PixelIcon } from '@/components/PixelIcon';
import { EDITOR_CARDS, ART_SIZE } from '@/constants/editorCards';
import { navItems } from '@/constants/navItems';
import { PALETTE_PRESETS } from '@/constants';

const rects = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('rect')).map((r) => ({
    x: Number(r.getAttribute('x')),
    y: Number(r.getAttribute('y')),
    width: Number(r.getAttribute('width')),
    fill: r.getAttribute('fill'),
  }));

describe('PixelIcon', () => {
  const [, light, mid, dark] = PALETTE_PRESETS[0].colours;

  it('draws a viewBox of the art size, crisp, and hidden from screen readers', () => {
    const { getByTestId } = render(<PixelIcon art={['#..', '.o.', '..:']} className="h-4" />);
    const svg = getByTestId('pixel-icon');
    expect(svg).toHaveAttribute('viewBox', '0 0 3 3');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('h-4');
  });

  it('turns shade characters into the Game Boy greens and leaves "." empty', () => {
    const { container } = render(<PixelIcon art={['#..', '.o.', '..:']} />);
    expect(rects(container)).toEqual([
      { x: 0, y: 0, width: 1, fill: dark },
      { x: 1, y: 1, width: 1, fill: mid },
      { x: 2, y: 2, width: 1, fill: light },
    ]);
  });

  it('merges neighbouring pixels of one shade into a single rectangle', () => {
    const { container } = render(<PixelIcon art={['####.oo', '#.#...:']} />);
    expect(rects(container)).toEqual([
      { x: 0, y: 0, width: 4, fill: dark },
      { x: 5, y: 0, width: 2, fill: mid },
      { x: 0, y: 1, width: 1, fill: dark },
      { x: 2, y: 1, width: 1, fill: dark },
      { x: 6, y: 1, width: 1, fill: light },
    ]);
  });

  it('ignores characters it does not know, and copes with empty art', () => {
    expect(rects(render(<PixelIcon art={['x?#']} />).container)).toEqual([{ x: 2, y: 0, width: 1, fill: dark }]);
    const { getByTestId } = render(<PixelIcon art={[]} />);
    expect(getByTestId('pixel-icon')).toHaveAttribute('viewBox', '0 0 0 0');
  });
});

describe('editor card data', () => {
  it('has a card for every editor in the navigation, and no others', () => {
    expect(Object.keys(EDITOR_CARDS).sort()).toEqual(navItems.map((i) => i.href).sort());
  });

  it.each(Object.entries(EDITOR_CARDS))('%s has a square piece of art in the three greens', (_href, card) => {
    expect(card.art).toHaveLength(ART_SIZE);
    for (const row of card.art) {
      expect(row).toHaveLength(ART_SIZE);
      expect(row).toMatch(/^[.:o#]+$/);
    }
    expect(card.art.join('')).toMatch(/#/); // something dark enough to read on the light LCD
  });

  it.each(Object.entries(EDITOR_CARDS))('%s has a description and a hex accent colour', (_href, card) => {
    expect(card.description.length).toBeGreaterThan(20);
    expect(card.description.endsWith('.')).toBe(true);
    expect(card.accent).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('every icon is different', () => {
    expect(new Set(Object.values(EDITOR_CARDS).map((c) => c.art.join('|'))).size).toBe(navItems.length);
  });
});
