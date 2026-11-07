/**
 * What the home page shows for each editor: a one-line description, an accent colour and a small pixel-art icon.
 * Art characters: '.' = transparent, ':' = light green, 'o' = mid green, '#' = darkest green (three of the four DMG shades).
 */
export interface EditorCard {
  description: string;
  /** Glow and highlight colour of the tile */
  accent: string;
  /** 12 rows of 12 characters */
  art: string[];
}

export const ART_SIZE = 12;

/** Place small square pieces of art side by side: layout[row][column] is an index into `pieces`. */
function compose(pieces: string[][], layout: number[][]): string[] {
  const size = pieces[0].length;
  return layout.flatMap((row) => Array.from({ length: size }, (_, y) => row.map((p) => pieces[p][y]).join('')));
}

const tree = ['.##.', '####', '####', '.oo.'];
const water = ['o..o', '.oo.', 'o..o', '.oo.'];
const path = [':.:.', '.:.:', ':.:.', '.:.:'];
const grass = ['....', '.:..', '....', '..:.'];

const rock = ['######', '#oooo#', '#o##o#', '#o##o#', '#oooo#', '######'];
const plain = ['::::::', '::::::', '::::::', '::::::', '::::::', '::::::'];
const checker = ['o.o.o.', '.o.o.o', 'o.o.o.', '.o.o.o', 'o.o.o.', '.o.o.o'];
const bush = ['..##..', '.####.', '######', '.####.', '..oo..', '..oo..'];

export const EDITOR_CARDS: Record<string, EditorCard> = {
  '/tile_editor': {
    description: 'Draw 8×8 tiles in four shades and export them as 2bpp, RGBDS or C.',
    accent: '#a3e635',
    art: ['############', '#oooo#ooooo#', '#oooo#ooooo#', '############', 'ooo#oooo#ooo', 'ooo#oooo#ooo', '############', '#oooo#ooooo#', '#oooo#ooooo#', '############', 'ooo#oooo#ooo', 'ooo#oooo#ooo'],
  },
  '/sprite_editor': {
    description: 'Animate hardware sprites frame by frame, with palettes and priority.',
    accent: '#34d399',
    art: ['....####....', '...######...', '...#oooo#...', '...#o##o#...', '...#oooo#...', '....####....', '..##oooo##..', '.#o#oooo#o#.', '.#o#oooo#o#.', '...#o##o#...', '...#o..o#...', '..###..###..'],
  },
  '/background_editor': {
    description: 'Paint the background layer: title screens, menus and single-screen scenes, with the 20×18 screen shown scrolling over it.',
    accent: '#22d3ee',
    art: compose([tree, water, path, grass], [[0, 0, 3], [1, 2, 3], [1, 2, 0]]),
  },
  '/metatile_editor': {
    description: 'Build blocks of any shape out of tiles (2×2, 1×4 floors...), with collision flags.',
    accent: '#818cf8',
    art: compose([rock, plain, checker, bush], [[0, 1], [2, 3]]),
  },
  '/level_editor': {
    description: 'Lay out scrolling levels from metatiles, ready for your game loop.',
    accent: '#f472b6',
    art: ['............', '............', '..::........', '.::::...#o#.', '........###.', '..#######...', '..#ooooo#...', '............', '............', '############', '#oooo#oooo##', '############'],
  },
  '/font_editor': {
    description: 'Edit all 96 glyphs and preview text the way the screen will show it.',
    accent: '#fbbf24',
    art: ['............', '....####....', '...######...', '..##....##..', '..##....##..', '..########..', '..########..', '..##....##..', '..##....##..', '..##....##..', '............', '............'],
  },
  '/music_editor': {
    description: 'Compose four-channel chiptune with a real sound-chip preview.',
    accent: '#fb7185',
    art: ['....########', '....#......#', '....#......#', '....#......#', '....#......#', '....#......#', '..###....###', '.####...####', '.####...####', '..##.....##.', '............', '............'],
  },
};
