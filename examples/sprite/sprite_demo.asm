; sprite_demo.asm - animate and move the sprite exported from the Sprite Editor
;
; Export "hero" from the Sprite Editor (Export RGBDS) and put hero.asm next to this file.
; It provides hero_tiles, hero_frames (a table of pointers to the OAM entries of each frame),
; hero_durations and HERO_FRAME_COUNT. Use the direction keys to move the hero.

INCLUDE "hardware.inc"
INCLUDE "hero.asm"

SECTION "Header", ROM0[$100]
    nop
    jp Start
    ds $150 - @, 0

SECTION "SpriteVars", WRAM0
wFrame: DS 1                 ; which animation frame is showing
wTimer: DS 1                 ; frames left before the next animation frame
wX:     DS 1                 ; position of the sprite's top-left corner on the screen
wY:     DS 1

SECTION "Main", ROM0[$150]
Start:
    call LcdOff

    ld hl, hero_tiles
    ld de, VRAM_TILES
    ld bc, hero_tiles_end - hero_tiles
    call CopyBytes

    ld hl, OAM_RAM           ; the sprite table starts with random data: switch all 40 sprites off
    ld bc, OAM_SIZE
    xor a
    call FillBytes

    xor a
    ld [wFrame], a
    ld a, 72
    ld [wX], a
    ld a, 64
    ld [wY], a
    ld a, [hero_durations]   ; the first frame stays for hero_durations[0] frames
    ld [wTimer], a

    ld a, %11100100
    ldh [rOBP0], a           ; sprite palette (colour 0 is transparent)
    ld a, LCDCF_ON | LCDCF_OBJ16 | LCDCF_OBJON
    ldh [rLCDC], a           ; the Sprite Editor exported 8x16 sprites: turn on 8x16 mode

.loop:
    call WaitFrame
    call DrawSprite          ; the sprite table (OAM) may only be written during VBlank
    call ReadJoypad
    call Move
    call Animate
    jr .loop

; Move the sprite one pixel per frame in the direction of the pressed keys
Move:
    ld a, [wJoypad]
    ld b, a
    bit PADB_RIGHT, b
    jr z, .notRight
    ld hl, wX
    inc [hl]
.notRight:
    bit PADB_LEFT, b
    jr z, .notLeft
    ld hl, wX
    dec [hl]
.notLeft:
    bit PADB_DOWN, b
    jr z, .notDown
    ld hl, wY
    inc [hl]
.notDown:
    bit PADB_UP, b
    ret z
    ld hl, wY
    dec [hl]
    ret

; Count down the frame timer and switch to the next animation frame when it runs out
Animate:
    ld a, [wTimer]
    dec a
    ld [wTimer], a
    ret nz
    ld a, [wFrame]
    inc a
    cp HERO_FRAME_COUNT
    jr c, .noWrap
    xor a                    ; after the last frame, start again
.noWrap:
    ld [wFrame], a
    ld e, a
    ld d, 0
    ld hl, hero_durations
    add hl, de
    ld a, [hl]
    ld [wTimer], a
    ret

; Write the OAM entries of the current frame, moved to the sprite's position.
; Each entry in the export is 4 bytes: y offset, x offset, tile, attributes.
DrawSprite:
    ld a, [wFrame]
    add a, a                 ; hero_frames holds 2-byte pointers
    ld e, a
    ld d, 0
    ld hl, hero_frames
    add hl, de
    ld a, [hl+]
    ld h, [hl]
    ld l, a                  ; HL = the entries of this frame
    ld a, [hl+]              ; first byte: how many entries
    ld b, a
    ld de, OAM_RAM
    or a
    jr z, .clearRest
.entry:
    ld a, [wY]
    add a, [hl]              ; + y offset
    add a, 16                ; the hardware subtracts 16 from Y ...
    ld [de], a
    inc hl
    inc de
    ld a, [wX]
    add a, [hl]              ; + x offset
    add a, 8                 ; ... and 8 from X
    ld [de], a
    inc hl
    inc de
    ld a, [hl+]              ; tile number
    ld [de], a
    inc de
    ld a, [hl+]              ; attributes (palette, priority, flip)
    ld [de], a
    inc de
    dec b
    jr nz, .entry
.clearRest:                  ; switch off every sprite we did not use
    ld a, e
    cp OAM_SIZE
    ret nc
    xor a
    ld [de], a
    inc de
    jr .clearRest

    INCLUDE "util.inc"
