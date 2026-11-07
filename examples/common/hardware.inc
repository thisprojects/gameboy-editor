; =============================================================
; hardware.inc - Game Boy hardware register names
; (the register names from the Game Boy assembly book, plus the extras these examples need)
; =============================================================
; The Game Boy has no ROM routines and no IN/OUT instructions.
; Everything - screen, sound, buttons - is controlled by writing
; to memory addresses in the range $FF00-$FFFF.  These names just
; make the numbers readable.  Use them with LDH (see Chapter 8).

DEF rP1    EQU $FF00      ; Joypad
DEF rIF    EQU $FF0F      ; Interrupt flags (which interrupts are waiting)
DEF rNR10  EQU $FF10      ; Sound channel 1: sweep
DEF rNR11  EQU $FF11      ; Sound channel 1: duty and length
DEF rNR12  EQU $FF12      ; Sound channel 1: volume envelope
DEF rNR13  EQU $FF13      ; Sound channel 1: pitch, low 8 bits
DEF rNR14  EQU $FF14      ; Sound channel 1: trigger and pitch, high 3 bits
DEF rNR50  EQU $FF24      ; Sound master volume
DEF rNR51  EQU $FF25      ; Sound panning
DEF rNR52  EQU $FF26      ; Sound on/off
DEF rLCDC  EQU $FF40      ; LCD control
DEF rSTAT  EQU $FF41      ; LCD status
DEF rSCY   EQU $FF42      ; Background scroll Y
DEF rSCX   EQU $FF43      ; Background scroll X
DEF rLY    EQU $FF44      ; Current scanline (0-153)
DEF rBGP   EQU $FF47      ; Background palette
DEF rOBP0  EQU $FF48      ; Sprite palette 0
DEF rIE    EQU $FFFF      ; Interrupt enable

; --- rLCDC bits ---
DEF LCDCF_ON      EQU %10000000   ; LCD on
DEF LCDCF_BG8000  EQU %00010000   ; Background tiles come from $8000
DEF LCDCF_OBJON   EQU %00000010   ; Sprites on
DEF LCDCF_BGON    EQU %00000001   ; Background on

; --- rSTAT bits ---
DEF STATF_BUSY    EQU %00000010   ; Set in modes 2 and 3: VRAM may be unavailable

; --- rIE / rIF bits ---
DEF IEF_VBLANK    EQU %00000001

; --- Screen size in character cells ---
DEF SCREEN_W      EQU 20
DEF SCREEN_H      EQU 18

; --- Memory areas ---
DEF VRAM_TILES    EQU $8000
DEF VRAM_MAP      EQU $9800
DEF OAM_RAM           EQU $FE00

; =============================================================
; Extras used by the editor examples
; =============================================================

; --- more registers ---
DEF rDIV   EQU $FF04      ; Divider (free-running counter)
DEF rNR21  EQU $FF16      ; Sound channel 2: duty and length
DEF rNR22  EQU $FF17      ; Sound channel 2: volume envelope
DEF rNR23  EQU $FF18      ; Sound channel 2: pitch, low 8 bits
DEF rNR24  EQU $FF19      ; Sound channel 2: trigger and pitch, high 3 bits
DEF rNR30  EQU $FF1A      ; Sound channel 3 (wave): DAC on/off
DEF rNR32  EQU $FF1C      ; Sound channel 3 (wave): output level
DEF rNR33  EQU $FF1D      ; Sound channel 3 (wave): pitch, low 8 bits
DEF rNR34  EQU $FF1E      ; Sound channel 3 (wave): trigger and pitch, high 3 bits
DEF rNR42  EQU $FF21      ; Sound channel 4 (noise): volume envelope
DEF rNR43  EQU $FF22      ; Sound channel 4 (noise): clock shift, width, divisor
DEF rNR44  EQU $FF23      ; Sound channel 4 (noise): trigger
DEF rWAVE  EQU $FF30      ; Wave RAM (16 bytes)
DEF rOBP1  EQU $FF49      ; Sprite palette 1
DEF rWY    EQU $FF4A      ; Window Y
DEF rWX    EQU $FF4B      ; Window X

; --- more rLCDC bits ---
DEF LCDCF_OBJ16   EQU %00000100   ; Sprites are 8x16 instead of 8x8
DEF LCDCF_BG9C00  EQU %00001000   ; Background map is at $9C00 instead of $9800

; --- rP1 (joypad) select bits: write 0 to the bit of the group you want to read ---
DEF P1F_GET_DPAD  EQU %00100000   ; Select the direction keys
DEF P1F_GET_BTN   EQU %00010000   ; Select the buttons
DEF P1F_GET_NONE  EQU %00110000   ; Select nothing

; --- joypad bits as returned by ReadJoypad (util.inc): 1 = pressed ---
DEF PADB_RIGHT    EQU 0
DEF PADB_LEFT     EQU 1
DEF PADB_UP       EQU 2
DEF PADB_DOWN     EQU 3
DEF PADB_A        EQU 4
DEF PADB_B        EQU 5
DEF PADB_SELECT   EQU 6
DEF PADB_START    EQU 7

; --- Sprites (OAM): 40 entries of 4 bytes: Y+16, X+8, tile, attributes ---
DEF OAM_COUNT     EQU 40
DEF OAM_SIZE      EQU OAM_COUNT * 4
DEF VRAM_MAP_W    EQU 32          ; the background map is 32x32 tiles

