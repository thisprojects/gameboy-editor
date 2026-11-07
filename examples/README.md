# Game Boy editor examples

One small, runnable program per editor. Each takes the file the editor exports and shows it on a Game Boy (screen or
sound). The worked explanations are in the editor's **Documentation** menu (`public/*_examples.html`, built from
`docs/pages/`).

| Folder | Editor | Program | What it does |
|---|---|---|---|
| `tiles/` | Tile Editor | `tile_viewer.asm` | copies the tiles to VRAM and shows them in a row |
| `sprite/` | Sprite Editor | `sprite_demo.asm` | animates the hero from the frame table and moves it with the d-pad |
| `map/` | Map Editor | `map_viewer.asm` | copies the tile map to the background and scrolls it |
| `font/` | Font Editor | `font_demo.asm` | types a message using the exported font |
| `level/` | Metatile + Level Editors | `level_demo.asm` | draws the level, collision-checks a sprite, scrolls a camera |
| `music/` | Music Editor | `music_demo.asm` | plays the song with the exported player (A stops, B restarts) |

Next to each program are the editor project file (`*_tiles.json`, `*_sprite.json`, ... load it with **Load project**) and
the RGBDS file the editor exports from it (`forest.asm`, `hero.asm`, ...). A Jest test checks that the committed `.asm`
files are exactly what the editor exports from the project files. `common/` has the shared `hardware.inc` (an extension of
the one in the Game Boy book) and `util.inc`.

## Build and run

You need [RGBDS](https://rgbds.gbdev.io/) 0.5 or later (`brew install rgbds`) and an emulator such as mGBA.

    make                          # build every example (writes .gb files next to the sources)
    make run-tiles/tile_viewer    # build one and open it in mGBA (EMU=other to change the emulator)
    make clean

## Verify

`verify_examples.py` runs every ROM headless on an emulated Game Boy ([PyBoy](https://pyboy.dev/)) and checks it:

- the emulated screen must match, pixel for pixel, a picture drawn from the editor project file (tiles, sprite frames,
  map with scrolling, typed text, level with camera);
- the level demo is walked with random key presses and every position is compared with an independent model of the collision rules;
- the music demo is played with PyBoy's sound emulation and the notes of the first row must be the loudest frequencies.

<!-- -->

    make
    python3 -m venv .venv && .venv/bin/pip install pyboy numpy
    .venv/bin/python verify_examples.py            # or: verify_examples.py tiles music
