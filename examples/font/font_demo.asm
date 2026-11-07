; font_demo.asm - type a message with the font exported from the Font Editor
;
; Export "gbfont" from the Font Editor (Export RGBDS) and put gbfont.asm next to this file.
; It provides gbfont_font (96 tiles, one per character), gbfont_font_end and GBFONT_FIRST_CHAR (32).
; The tile for a character is simply (character - GBFONT_FIRST_CHAR), when the font is loaded at tile 0.

INCLUDE "hardware.inc"
INCLUDE "gbfont.asm"

DEF FIRST_COLUMN EQU 1
DEF FIRST_ROW    EQU 2
DEF NEWLINE      EQU 10

SECTION "Header", ROM0[$100]
    nop
    jp Start
    ds $150 - @, 0

SECTION "Main", ROM0[$150]
Start:
    call LcdOff

    ld hl, gbfont_font
    ld de, VRAM_TILES
    ld bc, gbfont_font_end - gbfont_font
    call CopyBytes           ; character 32 (a space) is now tile 0

    ld hl, VRAM_MAP
    ld bc, VRAM_MAP_W * VRAM_MAP_W
    xor a                    ; tile 0 = space, so this blanks the screen
    call FillBytes

    ld a, %11100100
    ldh [rBGP], a
    ld a, LCDCF_ON | LCDCF_BG8000 | LCDCF_BGON
    ldh [rLCDC], a

    ld hl, Message
    ld de, VRAM_MAP + FIRST_ROW * VRAM_MAP_W + FIRST_COLUMN
.nextChar:
    ld a, [hl+]
    or a
    jr z, .done              ; 0 ends the message
    cp NEWLINE
    jr z, .newline
    sub GBFONT_FIRST_CHAR    ; character code -> tile number
    ld b, a
    call WaitFrame           ; one character every few frames, written at the start of VBlank
    call WaitFrame
    call WaitFrame
    ld a, b
    ld [de], a
    inc de
    jr .nextChar

.newline:                    ; go to the first column of the next row
    ld a, e
    and %11100000            ; the low 5 bits of the address are the column
    add a, VRAM_MAP_W
    ld e, a
    jr nc, .sameHigh
    inc d
.sameHigh:
    inc e                    ; (the low byte is a multiple of 32 here, so this cannot carry)
    jr .nextChar

.done:
    halt
    nop
    jr .done

Message:
    db "HELLO, GAME BOY!", NEWLINE
    db NEWLINE
    db "Typed with a font", NEWLINE
    db "from the Font Editor.", 0

    INCLUDE "util.inc"
