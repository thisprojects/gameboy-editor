import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '@/components/Navbar';
import { docItems } from '@/constants/docItems';

jest.mock('next/navigation', () => ({ usePathname: () => '/tile_editor' }));

describe('Navbar', () => {
  it('renders links and highlights the active one', () => {
    render(<Navbar />);
    expect(screen.getAllByRole('link')).toHaveLength(8);
    expect(screen.getByText('Tile Editor').className).toContain('bg-blue-600');
    expect(screen.getByText('Background Editor').className).not.toContain('bg-blue-600');
  });

  describe('Documentation menu', () => {
    const toggle = () => screen.getByRole('button', { name: /Documentation/ });

    it('is closed to start with', () => {
      render(<Navbar />);
      expect(toggle()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Game Boy Assembly Introduction')).not.toBeInTheDocument();
    });

    it('opens and lists the book and every example', () => {
      render(<Navbar />);
      fireEvent.click(toggle());
      expect(toggle()).toHaveAttribute('aria-expanded', 'true');
      for (const item of docItems) {
        const link = screen.getByRole('link', { name: item.label });
        expect(link).toHaveAttribute('href', item.href);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      }
      expect(screen.getAllByRole('link')).toHaveLength(8 + docItems.length);
    });

    it('closes when the button is clicked again, a link is chosen, or the user clicks elsewhere', () => {
      render(<Navbar />);
      fireEvent.click(toggle());
      fireEvent.click(toggle());
      expect(screen.queryByText('ASM Example: Tiles')).not.toBeInTheDocument();

      fireEvent.click(toggle());
      fireEvent.click(screen.getByText('ASM Example: Tiles'));
      expect(screen.queryByText('ASM Example: Tiles')).not.toBeInTheDocument();

      fireEvent.click(toggle());
      fireEvent.mouseDown(document.body);
      expect(screen.queryByText('ASM Example: Tiles')).not.toBeInTheDocument();
    });

    it('stays open when the click is inside the menu', () => {
      render(<Navbar />);
      fireEvent.click(toggle());
      fireEvent.mouseDown(screen.getByText('ASM Example: Music'));
      expect(screen.getByText('ASM Example: Music')).toBeInTheDocument();
    });
  });
});

describe('docItems', () => {
  it('only point at files that exist in public/', () => {
    for (const item of docItems) {
      expect(fs.existsSync(path.join(__dirname, '..', '..', 'public', item.href.slice(1)))).toBe(true);
    }
  });

  it('start with the book, then one example per editor', () => {
    expect(docItems[0].href).toBe('/gameboy_book.html');
    expect(docItems.slice(1).map((d) => d.href)).toEqual([
      '/tile_examples.html', '/sprite_examples.html', '/background_examples.html', '/font_examples.html', '/level_examples.html', '/music_examples.html',
    ]);
  });
});
