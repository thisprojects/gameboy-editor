; hero - 2 frame(s), 8 tile(s)
; Each frame: db entry_count, then per entry: db y_offset, x_offset, tile, attr
; Add 16 to Y and 8 to X (plus your position) when writing to OAM. Tile indices are relative to
; the first tile you load. Flip flags can be OR-ed into attr at runtime. Durations are in 1/60 s ticks.

DEF HERO_FRAME_COUNT EQU 2
DEF HERO_TILE_COUNT EQU 8

SECTION "hero_sprite", ROM0

hero_tiles::
    db $07, $07, $0F, $0F, $08, $0F, $0A, $0F, $08, $0F, $07, $07, $18, $1F, $28, $3F ; tile 0
    db $28, $3F, $38, $3F, $08, $0F, $0D, $0F, $0A, $0E, $1A, $1E, $1C, $1C, $00, $00 ; tile 1
    db $E0, $E0, $F0, $F0, $10, $F0, $50, $F0, $10, $F0, $E0, $E0, $18, $F8, $14, $FC ; tile 2
    db $14, $FC, $1C, $FC, $10, $F0, $B0, $F0, $50, $70, $58, $78, $38, $38, $00, $00 ; tile 3
    db $07, $07, $0F, $0F, $08, $0F, $0A, $0F, $08, $0F, $07, $07, $18, $1F, $28, $3F ; tile 4
    db $28, $3F, $38, $3F, $08, $0F, $0D, $0F, $05, $07, $05, $07, $07, $07, $00, $00 ; tile 5
    db $E0, $E0, $F0, $F0, $10, $F0, $50, $F0, $10, $F0, $E0, $E0, $18, $F8, $14, $FC ; tile 6
    db $14, $FC, $1C, $FC, $10, $F0, $B0, $F0, $A0, $E0, $A0, $E0, $70, $70, $00, $00 ; tile 7
hero_tiles_end::

hero_frames::
    dw hero_frame0
    dw hero_frame1

hero_durations::
    db 12, 12

hero_frame0:
    db 2
    db 0, 0, 0, $00
    db 0, 8, 2, $00
hero_frame1:
    db 2
    db 0, 0, 4, $00
    db 0, 8, 6, $00
