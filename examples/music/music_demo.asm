; music_demo.asm - play the song exported from the Music Editor
;
; Export "song" from the Music Editor (Export RGBDS) and put song.asm next to this file.
; It provides the player: song_init (once), song_update (once per frame) and song_stop.
; Press A to stop the music and B to start it again.

INCLUDE "hardware.inc"
INCLUDE "song.asm"

SECTION "Header", ROM0[$100]
    nop
    jp Start
    ds $150 - @, 0

SECTION "MusicVars", WRAM0
wPlaying: DS 1

SECTION "Main", ROM0[$150]
Start:
    call LcdOff              ; (nothing to draw: the screen stays blank)
    ld a, %11100100
    ldh [rBGP], a
    ld a, LCDCF_ON | LCDCF_BG8000 | LCDCF_BGON
    ldh [rLCDC], a

    call song_init           ; power the sound chip up and rewind the song
    ld a, 1
    ld [wPlaying], a

.loop:
    call WaitFrame           ; the player expects exactly one call per frame
    call ReadJoypad
    ld a, [wJoypad]
    bit PADB_A, a
    jr z, .notA
    ld a, [wPlaying]
    or a
    jr z, .notA
    call song_stop           ; silence all four channels
    xor a
    ld [wPlaying], a
.notA:
    ld a, [wJoypad]
    bit PADB_B, a
    jr z, .update
    ld a, [wPlaying]
    or a
    jr nz, .update
    call song_init           ; start again from the beginning
    ld a, 1
    ld [wPlaying], a
.update:
    ld a, [wPlaying]
    or a
    jr z, .loop
    call song_update
    jr .loop

    INCLUDE "util.inc"
