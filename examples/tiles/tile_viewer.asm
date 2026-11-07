; tile_viewer.asm - show the tiles exported from the Tile Editor
;
; Export "forest" from the Tile Editor (Export RGBDS) and put forest.asm next to this file.
; It provides forest_tiles (the tile data), forest_tiles_end and FOREST_TILE_COUNT.

INCLUDE "hardware.inc"
INCLUDE "forest.asm"

SECTION "Header", ROM0[$100]
    nop
    jp Start
    ds $150 - @, 0           ; room for the cartridge header (rgbfix fills it in)

SECTION "Main", ROM0[$150]
Start:
    call LcdOff              ; VRAM can only be written freely while the LCD is off

    ; Copy the tile data to the start of tile memory: tile 0 lives at $8000, tile 1 at $8010, ...
    ld hl, forest_tiles
    ld de, VRAM_TILES
    ld bc, forest_tiles_end - forest_tiles
    call CopyBytes

    ; Clear the background map: every cell shows tile 0 (the blank tile)
    ld hl, VRAM_MAP
    ld bc, VRAM_MAP_W * VRAM_MAP_W
    xor a
    call FillBytes

    ; Put tile 0, 1, 2 ... in a row across the middle of the screen
    ld hl, VRAM_MAP + 8 * VRAM_MAP_W + 6
    xor a                    ; A = tile number to show
    ld b, FOREST_TILE_COUNT
.showTiles:
    ld [hl+], a
    inc a
    dec b
    jr nz, .showTiles

    ld a, %11100100          ; palette: colour 0 = lightest ... colour 3 = darkest
    ldh [rBGP], a
    ld a, LCDCF_ON | LCDCF_BG8000 | LCDCF_BGON
    ldh [rLCDC], a           ; LCD on, background on, tile data at $8000

.forever:
    halt
    nop
    jr .forever

    INCLUDE "util.inc"
