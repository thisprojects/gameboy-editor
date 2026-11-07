; forest - 8 tile(s), Game Boy 2bpp
; Copy to VRAM with e.g. a memcpy to $8000 (sprites/BG) or $9000 (BG signed)

DEF FOREST_TILE_COUNT EQU 8

SECTION "forest_tiles", ROM0

forest_tiles::
    db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00 ; tile 0
    db $FF, $FF, $84, $FF, $84, $FF, $FF, $FF, $21, $FF, $21, $FF, $FF, $FF, $21, $FF ; tile 1
    db $00, $00, $22, $00, $54, $00, $00, $00, $88, $00, $52, $00, $00, $00, $22, $00 ; tile 2
    db $00, $00, $00, $CC, $00, $33, $00, $00, $00, $CC, $00, $33, $00, $00, $00, $00 ; tile 3
    db $FF, $FF, $81, $FF, $BD, $FF, $BD, $FF, $BD, $FF, $BD, $FF, $81, $FF, $FF, $FF ; tile 4
    db $18, $18, $3C, $3C, $7E, $7E, $FF, $FF, $7E, $7E, $00, $18, $00, $18, $00, $18 ; tile 5
    db $00, $00, $10, $00, $38, $10, $12, $00, $4E, $04, $E4, $40, $40, $0C, $00, $0C ; tile 6
    db $55, $00, $AA, $00, $55, $00, $AA, $00, $55, $00, $AA, $00, $55, $00, $AA, $00 ; tile 7
forest_tiles_end::
