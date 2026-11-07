; song - 2 pattern(s), order length 2, 6 frame(s) per row
;
; Usage: call song_init once, then call song_update once per frame (for example from your VBlank
; handler). Call song_stop to silence the sound chip. The song loops. Needs RGBDS 0.5.0 or later.
;
; The data is a stream of sound register writes: per row a write count, then (register, value) pairs
; where the register is the low byte of $FF00+n. The player simply replays them.

DEF SONG_TICKS_PER_ROW EQU 6
DEF SONG_ORDER_LENGTH EQU 2
DEF SONG_PATTERN_COUNT EQU 2

SECTION "song_music_ram", WRAM0
song_tick: db
song_rows_left: db
song_order_pos: db
song_row_ptr: dw

SECTION "song_music_player", ROM0

song_init::
    ld a, $80
    ldh [$FF26], a ; NR52: sound on
    ld a, $77
    ldh [$FF24], a ; NR50: master volume
    ld a, $FF
    ldh [$FF25], a ; NR51: all channels to both outputs
    xor a
    ld [song_tick], a
    ld [song_rows_left], a
    ld [song_order_pos], a
    ret

song_stop::
    xor a
    ldh [$FF12], a ; NR12
    ldh [$FF17], a ; NR22
    ldh [$FF1A], a ; NR30
    ldh [$FF21], a ; NR42
    ret

song_update::
    ld a, [song_tick]
    or a
    jr nz, .wait
    call song_play_row
    ld a, SONG_TICKS_PER_ROW
.wait:
    dec a
    ld [song_tick], a
    ret

song_play_row:
    ld a, [song_rows_left]
    or a
    call z, song_next_pattern
    ld a, [song_row_ptr]
    ld l, a
    ld a, [song_row_ptr + 1]
    ld h, a
    ld a, [hl+]
    or a
    jr z, .done
    ld b, a
.write:
    ld a, [hl+]
    ld c, a
    ld a, [hl+]
    ldh [c], a
    dec b
    jr nz, .write
.done:
    ld a, l
    ld [song_row_ptr], a
    ld a, h
    ld [song_row_ptr + 1], a
    ld hl, song_rows_left
    dec [hl]
    ret

song_next_pattern:
    ld a, [song_order_pos]
    ld e, a
    ld d, 0
    ld hl, song_order
    add hl, de
    ld a, [hl]
    add a, a
    ld e, a
    ld d, 0
    ld hl, song_patterns
    add hl, de
    ld a, [hl+]
    ld h, [hl]
    ld l, a
    ld a, [hl+]
    ld [song_rows_left], a
    ld a, l
    ld [song_row_ptr], a
    ld a, h
    ld [song_row_ptr + 1], a
    ld a, [song_order_pos]
    inc a
    cp SONG_ORDER_LENGTH
    jr c, .store
    xor a
.store:
    ld [song_order_pos], a
    ret

SECTION "song_music_data", ROM0

song_order::
    db 0, 1

song_patterns::
    dw song_pattern0
    dw song_pattern1

song_pattern0:
    db 16 ; rows
    db 33 ; row 0
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $06 ; NR13
    db $14, $87 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $0B ; NR23
    db $19, $86 ; NR24
    db $1A, $00 ; NR30
    db $30, $01 ; wave RAM 0
    db $31, $23 ; wave RAM 1
    db $32, $45 ; wave RAM 2
    db $33, $67 ; wave RAM 3
    db $34, $89 ; wave RAM 4
    db $35, $AB ; wave RAM 5
    db $36, $CD ; wave RAM 6
    db $37, $EF ; wave RAM 7
    db $38, $FE ; wave RAM 8
    db $39, $DC ; wave RAM 9
    db $3A, $BA ; wave RAM 10
    db $3B, $98 ; wave RAM 11
    db $3C, $76 ; wave RAM 12
    db $3D, $54 ; wave RAM 13
    db $3E, $32 ; wave RAM 14
    db $3F, $10 ; wave RAM 15
    db $1A, $80 ; NR30
    db $1C, $20 ; NR32
    db $1D, $0B ; NR33
    db $1E, $86 ; NR34
    db $21, $F3 ; NR42
    db $22, $7C ; NR43
    db $23, $80 ; NR44
    db 0 ; row 1
    db 8 ; row 2
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $39 ; NR13
    db $14, $87 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 3
    db 12 ; row 4
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $59 ; NR13
    db $14, $87 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $B2 ; NR23
    db $19, $86 ; NR24
    db $21, $F2 ; NR42
    db $22, $54 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 5
    db 8 ; row 6
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $39 ; NR13
    db $14, $87 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 7
    db 33 ; row 8
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $06 ; NR13
    db $14, $87 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $0B ; NR23
    db $19, $86 ; NR24
    db $1A, $00 ; NR30
    db $30, $01 ; wave RAM 0
    db $31, $23 ; wave RAM 1
    db $32, $45 ; wave RAM 2
    db $33, $67 ; wave RAM 3
    db $34, $89 ; wave RAM 4
    db $35, $AB ; wave RAM 5
    db $36, $CD ; wave RAM 6
    db $37, $EF ; wave RAM 7
    db $38, $FE ; wave RAM 8
    db $39, $DC ; wave RAM 9
    db $3A, $BA ; wave RAM 10
    db $3B, $98 ; wave RAM 11
    db $3C, $76 ; wave RAM 12
    db $3D, $54 ; wave RAM 13
    db $3E, $32 ; wave RAM 14
    db $3F, $10 ; wave RAM 15
    db $1A, $80 ; NR30
    db $1C, $20 ; NR32
    db $1D, $63 ; NR33
    db $1E, $85 ; NR34
    db $21, $F3 ; NR42
    db $22, $7C ; NR43
    db $23, $80 ; NR44
    db 0 ; row 9
    db 8 ; row 10
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $39 ; NR13
    db $14, $87 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 11
    db 12 ; row 12
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $59 ; NR13
    db $14, $87 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $B2 ; NR23
    db $19, $86 ; NR24
    db $21, $F2 ; NR42
    db $22, $54 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 13
    db 8 ; row 14
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $39 ; NR13
    db $14, $87 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 15

song_pattern1:
    db 16 ; rows
    db 33 ; row 0
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $D6 ; NR13
    db $14, $86 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $AC ; NR23
    db $19, $85 ; NR24
    db $1A, $00 ; NR30
    db $30, $01 ; wave RAM 0
    db $31, $23 ; wave RAM 1
    db $32, $45 ; wave RAM 2
    db $33, $67 ; wave RAM 3
    db $34, $89 ; wave RAM 4
    db $35, $AB ; wave RAM 5
    db $36, $CD ; wave RAM 6
    db $37, $EF ; wave RAM 7
    db $38, $FE ; wave RAM 8
    db $39, $DC ; wave RAM 9
    db $3A, $BA ; wave RAM 10
    db $3B, $98 ; wave RAM 11
    db $3C, $76 ; wave RAM 12
    db $3D, $54 ; wave RAM 13
    db $3E, $32 ; wave RAM 14
    db $3F, $10 ; wave RAM 15
    db $1A, $80 ; NR30
    db $1C, $20 ; NR32
    db $1D, $AC ; NR33
    db $1E, $85 ; NR34
    db $21, $F3 ; NR42
    db $22, $7C ; NR43
    db $23, $80 ; NR44
    db 0 ; row 1
    db 8 ; row 2
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $06 ; NR13
    db $14, $87 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 3
    db 12 ; row 4
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $39 ; NR13
    db $14, $87 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $72 ; NR23
    db $19, $86 ; NR24
    db $21, $F2 ; NR42
    db $22, $54 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 5
    db 8 ; row 6
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $06 ; NR13
    db $14, $87 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 7
    db 33 ; row 8
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $89 ; NR13
    db $14, $86 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $11 ; NR23
    db $19, $85 ; NR24
    db $1A, $00 ; NR30
    db $30, $01 ; wave RAM 0
    db $31, $23 ; wave RAM 1
    db $32, $45 ; wave RAM 2
    db $33, $67 ; wave RAM 3
    db $34, $89 ; wave RAM 4
    db $35, $AB ; wave RAM 5
    db $36, $CD ; wave RAM 6
    db $37, $EF ; wave RAM 7
    db $38, $FE ; wave RAM 8
    db $39, $DC ; wave RAM 9
    db $3A, $BA ; wave RAM 10
    db $3B, $98 ; wave RAM 11
    db $3C, $76 ; wave RAM 12
    db $3D, $54 ; wave RAM 13
    db $3E, $32 ; wave RAM 14
    db $3F, $10 ; wave RAM 15
    db $1A, $80 ; NR30
    db $1C, $20 ; NR32
    db $1D, $11 ; NR33
    db $1E, $85 ; NR34
    db $21, $F3 ; NR42
    db $22, $7C ; NR43
    db $23, $80 ; NR44
    db 0 ; row 9
    db 8 ; row 10
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $D6 ; NR13
    db $14, $86 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 11
    db 12 ; row 12
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $06 ; NR13
    db $14, $87 ; NR14
    db $16, $80 ; NR21
    db $17, $F2 ; NR22
    db $18, $0B ; NR23
    db $19, $86 ; NR24
    db $21, $F2 ; NR42
    db $22, $54 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 13
    db 8 ; row 14
    db $10, $08 ; NR10
    db $11, $80 ; NR11
    db $12, $F0 ; NR12
    db $13, $D6 ; NR13
    db $14, $86 ; NR14
    db $21, $91 ; NR42
    db $22, $34 ; NR43
    db $23, $80 ; NR44
    db 0 ; row 15
