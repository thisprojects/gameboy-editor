; map_viewer.asm - show the tile map exported from the Background Editor and scroll it
;
; Export "meadow" from the Background Editor (Export RGBDS) and put meadow.asm next to this file.
; It provides meadow_tiles (the tiles the map uses), meadow_map (one byte per cell, row by row),
; and the sizes MEADOW_TILE_COUNT, MEADOW_MAP_WIDTH and MEADOW_MAP_HEIGHT.
; Use the direction keys to scroll the background.

INCLUDE "hardware.inc"
INCLUDE "meadow.asm"

SECTION "Header", ROM0[$100]
    nop
    jp Start
    ds $150 - @, 0

SECTION "MapVars", WRAM0
wScrollX: DS 1
wScrollY: DS 1

SECTION "Main", ROM0[$150]
Start:
    xor a
    ld [wScrollX], a         ; start with the window at the top-left corner of the map
    ld [wScrollY], a
    call LcdOff

    ld hl, meadow_tiles
    ld de, VRAM_TILES
    ld bc, meadow_tiles_end - meadow_tiles
    call CopyBytes

    ld hl, VRAM_MAP          ; every cell shows tile 0 unless the export covers it
    ld bc, VRAM_MAP_W * VRAM_MAP_W
    xor a
    call FillBytes

    ; The hardware background map is always 32 cells wide, but the exported map can be smaller
    ; (for example the 20x18 screen). Copy it one row at a time and skip to the next hardware row.
    ld hl, meadow_map
    ld de, VRAM_MAP
    ld b, MEADOW_MAP_HEIGHT
.copyRow:
    push bc
    ld bc, MEADOW_MAP_WIDTH
    call CopyBytes           ; HL and DE move on by one row of the export
    ld a, VRAM_MAP_W - MEADOW_MAP_WIDTH
    add a, e
    ld e, a
    jr nc, .sameHigh
    inc d
.sameHigh:
    pop bc
    dec b
    jr nz, .copyRow

    ld a, %11100100
    ldh [rBGP], a
    ld a, LCDCF_ON | LCDCF_BG8000 | LCDCF_BGON
    ldh [rLCDC], a

.loop:
    call WaitFrame
    ld a, [wScrollX]         ; set the scroll registers right at the start of VBlank
    ldh [rSCX], a
    ld a, [wScrollY]
    ldh [rSCY], a
    call ReadJoypad
    ld a, [wJoypad]
    ld b, a
    bit PADB_RIGHT, b
    jr z, .notRight
    ld hl, wScrollX
    inc [hl]
.notRight:
    bit PADB_LEFT, b
    jr z, .notLeft
    ld hl, wScrollX
    dec [hl]
.notLeft:
    bit PADB_DOWN, b
    jr z, .notDown
    ld hl, wScrollY
    inc [hl]
.notDown:
    bit PADB_UP, b
    jr z, .loop
    ld hl, wScrollY
    dec [hl]
    jr .loop

    INCLUDE "util.inc"
