#!/usr/bin/env python3
"""Run every example ROM on an emulated Game Boy (PyBoy, headless) and check what it does.

The expected screens are drawn here, independently of the assembly programs, from the editor project
files (*.json) that sit next to each example - so this checks that the exported data really is shown
(and the music really plays) the way the editor says it will.

    cd examples && make                          # build the ROMs
    python3 -m venv .venv && .venv/bin/pip install pyboy numpy
    .venv/bin/python verify_examples.py [example ...]      e.g. tiles sprite map font level music
"""
import json
import os
import random
import re
import sys

import numpy as np
from pyboy import PyBoy

HERE = os.path.dirname(os.path.abspath(__file__))
SCREEN_W, SCREEN_H = 160, 144
# PyBoy's default greys, lightest to darkest = shade 0..3
GREYS = np.array([255, 153, 85, 0])


def load_json(path):
    with open(os.path.join(HERE, path)) as f:
        return json.load(f)


def load_symbols(rom):
    syms = {}
    with open(os.path.join(HERE, rom.replace('.gb', '.sym'))) as f:
        for line in f:
            m = re.match(r'([0-9a-f]{2}):([0-9a-f]{4}) (\S+)', line)
            if m:
                syms[m.group(3)] = int(m.group(2), 16)
    return syms


class GameBoy:
    """One emulated DMG running a ROM. Time is counted in frames (1/60 s)."""

    def __init__(self, rom, sound=False):
        self.path = os.path.join(HERE, rom)
        if not os.path.exists(self.path):
            raise SystemExit(f'{rom} is missing - run make in examples/ first')
        self.pb = PyBoy(self.path, window='null', sound_emulated=sound, cgb=False)
        if not sound:
            self.pb.set_emulation_speed(0)  # fast-forward (this disables audio sampling)
        self.sym = load_symbols(rom)
        self.mem = self.pb.memory
        # PyBoy starts with the boot ROM (the scrolling logo): run it until the cartridge starts at $0100
        booted = []
        self.pb.hook_register(0, 0x0100, lambda ctx: booted.append(1), None)
        for _ in range(600):
            if booted:
                break
            self.pb.tick(1, False)
        assert booted, 'boot ROM never handed over to the cartridge'
        self.pb.hook_deregister(0, 0x0100)

    def run(self, frames):
        for i in range(frames):
            self.pb.tick(1, i == frames - 1)  # only the last frame needs to be drawn, for screenshots

    def hold(self, button, frames):
        self.pb.button_press(button)
        self.run(frames)
        self.pb.button_release(button)

    def byte(self, label):
        return self.mem[self.sym[label]]

    def shades(self):
        """The screen as an array of shades 0 (lightest) to 3 (darkest)."""
        grey = self.pb.screen.ndarray[:, :, 0].astype(int)
        return np.abs(grey[:, :, None] - GREYS[None, None, :]).argmin(axis=2)

    def stop(self):
        self.pb.stop(save=False)


# ---- drawing what the screen should look like ---------------------------------------------------
def tile_array(tile):
    return np.array(tile, dtype=int)


def render_background(tilemap, tiles, scroll=(0, 0)):
    """tilemap: 32x32 tile numbers. Returns the 160x144 window at (scx, scy), wrapping around the 256x256 map."""
    full = np.zeros((256, 256), dtype=int)
    for y in range(32):
        for x in range(32):
            full[y * 8:y * 8 + 8, x * 8:x * 8 + 8] = tile_array(tiles[tilemap[y][x]])
    ys = (np.arange(SCREEN_H) + scroll[1]) % 256
    xs = (np.arange(SCREEN_W) + scroll[0]) % 256
    return full[np.ix_(ys, xs)]


def draw_sprite(screen, pixels, x, y):
    """Draw a sprite (colour 0 = transparent) with its top-left at screen position (x, y)."""
    pixels = np.array(pixels, dtype=int)
    for dy in range(pixels.shape[0]):
        for dx in range(pixels.shape[1]):
            sx, sy = x + dx, y + dy
            if pixels[dy, dx] and 0 <= sx < SCREEN_W and 0 <= sy < SCREEN_H:
                screen[sy, sx] = pixels[dy, dx]
    return screen


def check_screen(name, got, want):
    if not np.array_equal(got, want):
        diff = np.argwhere(got != want)
        y, x = diff[0]
        raise AssertionError(f'{name}: {len(diff)} pixels differ, first at x={x} y={y} (got shade {got[y, x]}, expected {want[y, x]})')


def empty_map():
    return [[0] * 32 for _ in range(32)]


# ---- the examples ------------------------------------------------------------------------------
def verify_tiles():
    project = load_json('tiles/forest_tiles.json')
    sheet = np.array(project['pixels'])
    tiles = [sheet[(i // 4) * 8:(i // 4) * 8 + 8, (i % 4) * 8:(i % 4) * 8 + 8] for i in range(8)]
    tilemap = empty_map()
    for i in range(8):
        tilemap[8][6 + i] = i
    gb = GameBoy('tiles/tile_viewer.gb')
    gb.run(10)
    check_screen('tile viewer', gb.shades(), render_background(tilemap, tiles))
    assert gb.shades().max() == 3, 'all four shades should appear'
    gb.stop()
    return 'screen shows tiles 0-7 in a row, pixel for pixel'


def verify_sprite():
    project = load_json('sprite/hero_sprite.json')
    frames = [f['pixels'] for f in project['frames']]
    gb = GameBoy('sprite/sprite_demo.gb')
    gb.run(6)  # early in animation frame 0 (each frame lasts 12 frames)
    want = draw_sprite(np.zeros((SCREEN_H, SCREEN_W), dtype=int), frames[0], 72, 64)
    check_screen('sprite frame 0', gb.shades(), want)
    gb.run(12)  # now in frame 1
    want = draw_sprite(np.zeros((SCREEN_H, SCREEN_W), dtype=int), frames[1], 72, 64)
    check_screen('sprite frame 1', gb.shades(), want)
    gb.run(12)  # and back to frame 0
    check_screen('sprite frame 0 again', gb.shades(), draw_sprite(np.zeros((SCREEN_H, SCREEN_W), dtype=int), frames[0], 72, 64))
    x0, y0 = gb.byte('wX'), gb.byte('wY')
    gb.hold('right', 10)
    gb.hold('down', 6)
    assert (gb.byte('wX'), gb.byte('wY')) == (x0 + 10, y0 + 6), 'direction keys move the hero one pixel per frame'
    gb.stop()
    return 'both animation frames drawn pixel for pixel, loop works, d-pad moves the hero'


def verify_map():
    project = load_json('map/meadow_map.json')
    tiles, tilemap = project['tiles'], project['map']
    gb = GameBoy('map/map_viewer.gb')
    gb.run(10)
    check_screen('map at scroll 0,0', gb.shades(), render_background(tilemap, tiles))
    gb.hold('right', 24)
    gb.hold('down', 40)
    gb.run(2)  # the registers are updated at the start of the next frame
    sx, sy = gb.mem[0xFF43], gb.mem[0xFF42]
    assert (sx, sy) == (24, 40), f'scroll registers should follow the d-pad (got {sx},{sy})'
    check_screen('map scrolled', gb.shades(), render_background(tilemap, tiles, (sx, sy)))
    gb.stop()
    return 'meadow shown pixel for pixel, scrolls with the d-pad'


def verify_font():
    glyphs = load_json('font/gbfont_font.json')['glyphs']
    message = ['HELLO, GAME BOY!', '', 'Typed with a font', 'from the Font Editor.']
    tilemap = empty_map()
    for row, text in enumerate(message):
        for col, ch in enumerate(text):
            tilemap[2 + row][1 + col] = ord(ch) - 32
    gb = GameBoy('font/font_demo.gb')
    gb.run(40)
    partial = gb.shades()
    assert partial.any() and not np.array_equal(partial, render_background(tilemap, glyphs)), 'text should still be typing'
    gb.run(300)
    check_screen('font demo', gb.shades(), render_background(tilemap, glyphs))
    gb.stop()
    return 'message types out and matches the font pixel for pixel'


def level_simulation(project, start, presses):
    """Independent model of the demo's movement: 8x8 player, moves 1 px per frame per key, blocked by solid metatiles."""
    metatiles, level = project['metatiles'], project['map']

    def solid_at(x, y):
        if not (0 <= x < 256 and 0 <= y < 256):
            return True  # (the level has a solid border, so the demo never gets here)
        return metatiles[level[y // 16][x // 16]]['solid']

    def blocked(x, y):
        return any(solid_at(x + dx, y + dy) for dx in (0, 7) for dy in (0, 7))

    x, y = start
    for keys in presses:
        if 'right' in keys and not blocked(x + 1, y): x += 1
        if 'left' in keys and not blocked(x - 1, y): x -= 1
        if 'down' in keys and not blocked(x, y + 1): y += 1
        if 'up' in keys and not blocked(x, y - 1): y -= 1
    return x, y


def verify_level():
    project = load_json('level/cave_level.json')
    tiles, metatiles, level = project['tiles'], project['metatiles'], project['map']
    tilemap = empty_map()
    for my in range(16):
        for mx in range(16):
            for ty in range(2):
                for tx in range(2):
                    tilemap[my * 2 + ty][mx * 2 + tx] = metatiles[level[my][mx]]['tiles'][ty][tx]

    gb = GameBoy('level/level_demo.gb')
    gb.run(10)
    # the start position (24, 192): the camera is clamped to the bottom-left of the level
    want = render_background(tilemap, tiles, (0, 112))
    draw_sprite(want, tiles[6], 24 - 0, 192 - 112)
    check_screen('level at start', gb.shades(), want)

    # walk around at random; the ROM and the independent model must agree about every blocked step
    rng = random.Random(1)
    x, y = 24, 192
    moves = 0
    for _ in range(40):
        keys = rng.sample(['right', 'left', 'up', 'down'], rng.choice([1, 1, 2]))
        frames = rng.randint(5, 60)
        for k in keys:
            gb.pb.button_press(k)
        gb.run(frames)
        for k in keys:
            gb.pb.button_release(k)
        x, y = level_simulation(project, (x, y), [keys] * frames)
        got = (gb.byte('wPlayerX'), gb.byte('wPlayerY'))
        assert got == (x, y), f'player at {got}, the model says {(x, y)} after holding {keys} for {frames} frames'
        moves += frames
    # and the camera follows: the final screen matches the model's camera
    gb.run(2)
    sx = min(max(x - 76, 0), 96)
    sy = min(max(y - 68, 0), 112)
    want = render_background(tilemap, tiles, (sx, sy))
    draw_sprite(want, tiles[6], x - sx, y - sy)
    check_screen('level after walking', gb.shades(), want)
    gb.stop()
    return f'level drawn pixel for pixel, {moves} frames of random walking match the collision model, camera follows'


def verify_music():
    project = load_json('music/song_music.json')
    gb = GameBoy('music/music_demo.gb', sound=True)
    chunks = []
    for _ in range(42):  # 0.7 s: the first rows of the song
        gb.pb.tick(1, False)
        chunks.append(gb.pb.sound.ndarray.astype(float).mean(axis=1))
    audio = np.concatenate(chunks)
    rate = gb.pb.sound.sample_rate
    assert np.abs(audio).max() > 0.01, 'the song should be audible'

    def level_at(window, hz):
        """Spectrum level near a frequency, relative to the typical level."""
        spectrum = np.abs(np.fft.rfft(window * np.hanning(len(window))))
        freqs = np.fft.rfftfreq(len(window), 1 / rate)
        band = (freqs > 80) & (freqs < 2000)
        near = (freqs > hz * 0.97) & (freqs < hz * 1.03)
        return spectrum[near].max() / np.median(spectrum[band])

    # skip the first frame or two, then take 0.15 s (row 0 lasts 0.1 s): row 0 plays C5 (pulse), C4 (pulse) and C3 (wave)
    start = int(rate * 2 / 60)
    window = audio[start:start + int(rate * 0.15)]
    found = {name: level_at(window, hz) for name, hz in [('C5 lead', 523.25), ('C4 pluck', 261.63), ('C3 bass', 130.81)]}
    for name, level in found.items():
        assert level > 8, f'{name} should be a clear peak in the sound (only {level:.1f}x the typical level)'
    off = level_at(window, 700.0)  # a frequency nothing plays (and not a harmonic of the notes)
    assert off < min(found.values()), 'unplayed frequencies should be quieter than the notes'

    # A stops the music, B starts it again
    gb.hold('a', 3)
    gb.run(6)
    quiet = []
    for _ in range(6):
        gb.pb.tick(1, False)
        quiet.append(gb.pb.sound.ndarray.astype(float).mean(axis=1))
    assert np.abs(np.concatenate(quiet)).max() < 0.02, 'A should silence the song'
    gb.hold('b', 3)
    loud = []
    for _ in range(12):
        gb.pb.tick(1, False)
        loud.append(gb.pb.sound.ndarray.astype(float).mean(axis=1))
    assert np.abs(np.concatenate(loud)).max() > 0.01, 'B should start the song again'
    gb.stop()
    names = ', '.join(f'{n} {v:.0f}x' for n, v in found.items())
    return f'sound output has clear peaks at the notes the first row plays ({names}); A stops it, B restarts it ({len(project["patterns"])} patterns)'


EXAMPLES = {
    'tiles': verify_tiles,
    'sprite': verify_sprite,
    'map': verify_map,
    'font': verify_font,
    'level': verify_level,
    'music': verify_music,
}


def main(argv):
    names = argv or list(EXAMPLES)
    unknown = [n for n in names if n not in EXAMPLES]
    if unknown:
        raise SystemExit(f'unknown example(s) {unknown}; choose from {list(EXAMPLES)}')
    failed = 0
    for name in names:
        try:
            print(f'PASS {name:6} {EXAMPLES[name]()}')
        except AssertionError as e:
            failed += 1
            print(f'FAIL {name:6} {e}')
    print(f'\n{len(names) - failed} of {len(names)} examples verified')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
