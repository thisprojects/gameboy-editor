; level_demo.asm - draw a level exported from the Level Editor, walk around it and scroll the camera
;
; Export "cave" from the Level Editor (Export RGBDS) and put cave.asm next to this file.
; It provides cave_tiles (the tiles used), cave_metatiles (4 tile numbers per 2x2 metatile),
; cave_collision (one byte per metatile: 1 = solid), cave_map (one metatile number per level cell),
; and the sizes CAVE_WIDTH, CAVE_HEIGHT and CAVE_METATILE_SIZE.
; Use the direction keys to move the flower; solid metatiles block it and the camera follows.

INCLUDE "hardware.inc"
INCLUDE "cave.asm"

; This example is written for 2x2-tile metatiles (16x16 pixels) in a level 16 metatiles wide and high.
; That is exactly 32x32 tiles, the size of the hardware background map, so the whole level fits in it.
ASSERT CAVE_METATILE_SIZE == 2
ASSERT CAVE_WIDTH == 16
ASSERT CAVE_HEIGHT == 16

DEF PLAYER_TILE  EQU 6       ; the flower tile of the tileset is the player sprite
DEF START_X      EQU 24
DEF START_Y      EQU 192
DEF MAX_SCROLL_X EQU 256 - 160
DEF MAX_SCROLL_Y EQU 256 - 144

SECTION "Header", ROM0[$100]
    nop
    jp Start
    ds $150 - @, 0

SECTION "LevelVars", WRAM0
wRow:     DS 1
wCol:     DS 1
wPlayerX: DS 1               ; player position in the level, in pixels (0-255)
wPlayerY: DS 1
wScrollX: DS 1               ; camera position, in pixels
wScrollY: DS 1

SECTION "Main", ROM0[$150]
Start:
    call LcdOff

    ld hl, cave_tiles
    ld de, VRAM_TILES
    ld bc, cave_tiles_end - cave_tiles
    call CopyBytes

    call DrawLevel

    ld hl, OAM_RAM
    ld bc, OAM_SIZE
    xor a
    call FillBytes           ; no sprites except the player

    ld a, START_X
    ld [wPlayerX], a
    ld a, START_Y
    ld [wPlayerY], a
    call UpdateCamera

    ld a, %11100100
    ldh [rBGP], a
    ldh [rOBP0], a
    ld a, LCDCF_ON | LCDCF_BG8000 | LCDCF_BGON | LCDCF_OBJON
    ldh [rLCDC], a

.loop:
    call WaitFrame
    call ShowScreen          ; scroll registers and the player sprite, during VBlank
    call ReadJoypad
    call MovePlayer
    call UpdateCamera
    jr .loop

; Expand the level map into the background map: every metatile becomes 2x2 tiles.
DrawLevel:
    xor a
    ld [wRow], a
.row:
    xor a
    ld [wCol], a
.col:
    ld a, [wRow]             ; metatile number = cave_map[row * 16 + col]
    swap a
    ld b, a
    ld a, [wCol]
    add a, b
    ld e, a
    ld d, 0
    ld hl, cave_map
    add hl, de
    ld a, [hl]
    ld l, a                  ; HL = cave_metatiles + number * 4: its four tile numbers
    ld h, 0
    add hl, hl
    add hl, hl
    ld de, cave_metatiles
    add hl, de
    push hl

    ld a, [wRow]             ; destination = VRAM_MAP + row * 64 + col * 2
    ld l, a
    ld h, 0
    add hl, hl
    add hl, hl
    add hl, hl
    add hl, hl
    add hl, hl
    add hl, hl
    ld a, [wCol]
    add a, a
    ld e, a
    ld d, 0
    add hl, de
    ld de, VRAM_MAP
    add hl, de
    ld d, h
    ld e, l
    pop hl                   ; HL = source tiles, DE = destination

    ld a, [hl+]              ; top row of the metatile
    ld [de], a
    inc de
    ld a, [hl+]
    ld [de], a
    ld a, e                  ; down one row of the background map (32 tiles) ...
    add a, VRAM_MAP_W - 1    ; ... we already moved one tile to the right
    ld e, a
    jr nc, .sameHigh
    inc d
.sameHigh:
    ld a, [hl+]              ; bottom row of the metatile
    ld [de], a
    inc de
    ld a, [hl+]
    ld [de], a

    ld a, [wCol]
    inc a
    ld [wCol], a
    cp CAVE_WIDTH
    jr c, .col
    ld a, [wRow]
    inc a
    ld [wRow], a
    cp CAVE_HEIGHT
    jr c, .row
    ret

; B = x, C = y: pixel position in the level. Returns A = 1 if that spot is inside a solid metatile.
; Only A and HL are changed.
IsSolidAt:
    push de
    ld a, c
    and $F0                  ; (y / 16) * 16 = the start of that row of the level map
    ld l, a
    ld a, b
    swap a
    and $0F                  ; x / 16 = the column
    add a, l
    ld e, a
    ld d, 0
    ld hl, cave_map
    add hl, de
    ld a, [hl]               ; the metatile there
    ld e, a
    ld hl, cave_collision
    add hl, de
    ld a, [hl]               ; 1 = solid
    pop de
    ret

; B = x, C = y: top-left of the 8x8 player. Returns Z (zero flag set) if no corner is inside a solid metatile.
; BC is kept.
Blocked:
    push bc
    call IsSolidAt           ; top-left corner
    ld d, a
    ld a, b
    add a, 7
    ld b, a
    call IsSolidAt           ; top-right
    or d
    ld d, a
    ld a, c
    add a, 7
    ld c, a
    call IsSolidAt           ; bottom-right
    or d
    ld d, a
    pop bc
    push bc
    ld a, c
    add a, 7
    ld c, a
    call IsSolidAt           ; bottom-left
    or d
    pop bc
    ret

; Try to move one pixel in each pressed direction; the move is only made if the new spot is free
MovePlayer:
    ld a, [wJoypad]
    bit PADB_RIGHT, a
    jr z, .notRight
    ld a, [wPlayerX]
    inc a
    ld b, a
    ld a, [wPlayerY]
    ld c, a
    call Blocked
    jr nz, .notRight
    ld a, b
    ld [wPlayerX], a
.notRight:
    ld a, [wJoypad]
    bit PADB_LEFT, a
    jr z, .notLeft
    ld a, [wPlayerX]
    dec a
    ld b, a
    ld a, [wPlayerY]
    ld c, a
    call Blocked
    jr nz, .notLeft
    ld a, b
    ld [wPlayerX], a
.notLeft:
    ld a, [wJoypad]
    bit PADB_DOWN, a
    jr z, .notDown
    ld a, [wPlayerX]
    ld b, a
    ld a, [wPlayerY]
    inc a
    ld c, a
    call Blocked
    jr nz, .notDown
    ld a, c
    ld [wPlayerY], a
.notDown:
    ld a, [wJoypad]
    bit PADB_UP, a
    ret z
    ld a, [wPlayerX]
    ld b, a
    ld a, [wPlayerY]
    dec a
    ld c, a
    call Blocked
    ret nz
    ld a, c
    ld [wPlayerY], a
    ret

; Centre the camera on the player, but never scroll past the edges of the 32x32-tile map
UpdateCamera:
    ld a, [wPlayerX]
    sub 76                   ; (160 - 8) / 2
    jr nc, .xPositive
    xor a
.xPositive:
    cp MAX_SCROLL_X + 1
    jr c, .xInRange
    ld a, MAX_SCROLL_X
.xInRange:
    ld [wScrollX], a
    ld a, [wPlayerY]
    sub 68                   ; (144 - 8) / 2
    jr nc, .yPositive
    xor a
.yPositive:
    cp MAX_SCROLL_Y + 1
    jr c, .yInRange
    ld a, MAX_SCROLL_Y
.yInRange:
    ld [wScrollY], a
    ret

; Called at the start of VBlank: set the scroll registers and place the player sprite on the screen
ShowScreen:
    ld a, [wScrollX]
    ldh [rSCX], a
    ld b, a
    ld a, [wScrollY]
    ldh [rSCY], a
    ld c, a
    ld hl, OAM_RAM
    ld a, [wPlayerY]
    sub c
    add a, 16
    ld [hl+], a              ; screen Y + 16
    ld a, [wPlayerX]
    sub b
    add a, 8
    ld [hl+], a              ; screen X + 8
    ld a, PLAYER_TILE
    ld [hl+], a
    xor a
    ld [hl], a               ; attributes
    ret

    INCLUDE "util.inc"
