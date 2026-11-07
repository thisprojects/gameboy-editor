; =============================================================
; util.inc - small helper routines shared by the editor examples
; =============================================================
; INCLUDE this file after your own code. It needs hardware.inc.
;
;   WaitFrame    - wait for the start of the next VBlank (one call per frame)
;   LcdOff       - turn the LCD off (VRAM can then be written freely)
;   CopyBytes    - copy BC bytes from HL to DE
;   FillBytes    - fill BC bytes at HL with A
;   ReadJoypad   - read the buttons into wJoypad (1 = pressed, see PADB_* in hardware.inc)

SECTION "UtilVars", WRAM0
wJoypad: DS 1

SECTION "Util", ROM0

; Wait until the start of the next VBlank. Calling this once per loop gives you exactly one pass per frame.
WaitFrame:
.leaveVBlank:
    ldh a, [rLY]
    cp 144
    jr nc, .leaveVBlank      ; still in VBlank from last time: wait for it to end
.waitVBlank:
    ldh a, [rLY]
    cp 144
    jr c, .waitVBlank        ; draw time: wait for line 144, the start of VBlank
    ret

; The LCD may only be switched off during VBlank, or the screen hardware can be damaged.
LcdOff:
.waitVBlank:
    ldh a, [rLY]
    cp 144
    jr c, .waitVBlank
    xor a
    ldh [rLCDC], a
    ret

; HL = source, DE = destination, BC = number of bytes (not zero)
CopyBytes:
    ld a, [hl+]
    ld [de], a
    inc de
    dec bc
    ld a, b
    or c
    jr nz, CopyBytes
    ret

; A = value, HL = destination, BC = number of bytes (not zero)
FillBytes:
    ld d, a
.loop:
    ld a, d
    ld [hl+], a
    dec bc
    ld a, b
    or c
    jr nz, .loop
    ret

; Reads the direction keys and buttons into wJoypad. The hardware reports 0 for a pressed key, so the
; value is inverted to make 1 mean pressed. Bits 0-3: right, left, up, down. Bits 4-7: A, B, select, start.
ReadJoypad:
    ld a, P1F_GET_DPAD
    ldh [rP1], a
    ldh a, [rP1]             ; read a few times: the lines need a moment to settle
    ldh a, [rP1]
    ldh a, [rP1]
    cpl
    and $0F
    ld b, a                  ; B = direction keys
    ld a, P1F_GET_BTN
    ldh [rP1], a
    ldh a, [rP1]
    ldh a, [rP1]
    ldh a, [rP1]
    cpl
    and $0F
    swap a                   ; buttons go in the upper nibble
    or b
    ld [wJoypad], a
    ld a, P1F_GET_NONE
    ldh [rP1], a
    ret
