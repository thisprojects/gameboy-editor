import { render, screen, fireEvent } from '@testing-library/react';
import TileEditorPage from '@/app/(editor)/tile_editor/page';
import SpriteEditorPage from '@/app/(editor)/sprite_editor/page';
import MapEditorPage from '@/app/(editor)/map_editor/page';
import MetatileEditorPage from '@/app/(editor)/metatile_editor/page';
import LevelEditorPage from '@/app/(editor)/level_editor/page';
import FontEditorPage from '@/app/(editor)/font_editor/page';
import MusicEditorPage from '@/app/(editor)/music_editor/page';

jest.mock('@/utils/gbApuEmulator', () => ({
  GbApuEmulator: class {
    writes = jest.fn();
    resume = jest.fn().mockResolvedValue(undefined);
    silence = jest.fn();
    close = jest.fn();
  },
}));

describe('export dialogs link to the matching example page', () => {
  beforeEach(() => {
    localStorage.clear();
    for (const key of ['tile', 'sprite', 'map', 'metatile', 'level', 'font', 'music']) localStorage.setItem(`${key}Editor_hideInstructions`, 'true');
  });

  it.each([
    ['Tile Editor', TileEditorPage, '/tile_examples.html', /Tiles example/],
    ['Sprite Editor', SpriteEditorPage, '/sprite_examples.html', /Sprites example/],
    ['Map Editor', MapEditorPage, '/map_examples.html', /Map example/],
    ['Metatile Editor', MetatileEditorPage, '/level_examples.html', /Level example/],
    ['Level Editor', LevelEditorPage, '/level_examples.html', /Level example/],
    ['Font Editor', FontEditorPage, '/font_examples.html', /Font example/],
    ['Music Editor', MusicEditorPage, '/music_examples.html', /Music example/],
  ])('%s', (_name, Page, href, description) => {
    render(<Page />);
    fireEvent.click(screen.getByText('Export RGBDS (.asm)'));
    const link = screen.getByRole('link', { name: 'How do I use this on a Game Boy?' });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.parentElement).toHaveTextContent(description);
  });

  it('the link is not shown when saving a project', () => {
    render(<TileEditorPage />);
    fireEvent.click(screen.getByText('Save project'));
    expect(screen.queryByRole('link', { name: /Game Boy\?/ })).not.toBeInTheDocument();
  });
});
