# Build and run the Game Boy editor examples with RGBDS.
#   make tiles/tile_viewer.gb       build one example
#   make run-tiles/tile_viewer      build it and open it in mGBA
#   make                            build them all
EMU   ?= mgba
ASM   ?= rgbasm
LINK  ?= rgblink
FIX   ?= rgbfix

PROGRAMS := tiles/tile_viewer sprite/sprite_demo map/map_viewer font/font_demo level/level_demo music/music_demo

all: $(addsuffix .gb,$(PROGRAMS))

# Each program INCLUDEs the editor export that sits next to it, plus the shared files in common/
%.o: %.asm common/hardware.inc common/util.inc $(wildcard */*.asm)
	$(ASM) -I common/ -I $(dir $<) -o $@ $<

%.gb: %.o
	$(LINK) -n $*.sym -o $@ $<
	$(FIX) -v -p 0xFF -t $(shell basename $* | tr a-z A-Z | cut -c1-11) $@

run-%: %.gb
	$(EMU) $<

clean:
	rm -f */*.o */*.gb */*.sym

.PHONY: all clean
.PRECIOUS: %.o
