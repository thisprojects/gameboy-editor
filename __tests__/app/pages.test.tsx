import { render, screen, within } from '@testing-library/react';
import Home from '@/app/page';
import { navItems } from '@/constants/navItems';
import { EDITOR_CARDS } from '@/constants/editorCards';

describe('landing page', () => {
  it('renders the landing page with all editors', () => {
    render(<Home />);
    expect(screen.getByText('Game Boy Editor')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(7);
  });

  it('has the title as the one h1', () => {
    render(<Home />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Game Boy Editor');
  });

  it.each(navItems.map((item, i) => [item.label, item.href, i] as const))('the %s tile links to %s with exactly that name', (label, href) => {
    render(<Home />);
    // exact name: "Tile Editor" must not also match "Metatile Editor" (the tile also has a description and an arrow)
    const link = screen.getByRole('link', { name: label });
    expect(link).toHaveAttribute('href', href);
    expect(screen.getAllByRole('link', { name: label })).toHaveLength(1);
  });

  it('gives every tile a heading, a description that is announced with the link, a number and an icon', () => {
    render(<Home />);
    navItems.forEach((item, index) => {
      const link = screen.getByRole('link', { name: item.label });
      expect(within(link).getByRole('heading', { level: 2, name: item.label })).toBeInTheDocument();
      expect(link).toHaveAccessibleDescription(EDITOR_CARDS[item.href].description);
      expect(link).toHaveTextContent(String(index + 1).padStart(2, '0'));
      expect(within(link).getByTestId('pixel-icon')).toBeInTheDocument();
    });
  });

  it('colours each tile with its own accent', () => {
    render(<Home />);
    for (const item of navItems) {
      expect(screen.getByRole('link', { name: item.label }).style.getPropertyValue('--accent')).toBe(EDITOR_CARDS[item.href].accent);
    }
    expect(new Set(navItems.map((i) => EDITOR_CARDS[i.href].accent)).size).toBe(navItems.length); // all different
  });

  it('keeps the decoration out of the accessibility tree', () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(7);
    expect(container.querySelectorAll('[aria-hidden]').length).toBeGreaterThanOrEqual(7 + 2); // icons, glows, numbers, arrows
  });

  it('does not rely on motion: the hover movement is only for people who allow animation', () => {
    render(<Home />);
    const link = screen.getByRole('link', { name: 'Tile Editor' });
    expect(link.className).toContain('motion-safe:hover:-translate-y-1');
    expect(link.className).not.toMatch(/(^|\s)hover:-translate-y/);
  });
});
