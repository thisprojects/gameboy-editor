/** What each tool does, shown as a hover tooltip next to the tool's name. */
export const TOOL_HINTS: Record<string, string> = {
  Pencil: 'draw single pixels in the selected shade; drag to draw freely',
  Line: 'drag to draw a straight line in the selected shade',
  Rubber: 'erase back to shade 0 (transparent in sprites); drag to erase',
  'Bucket (flood fill)': 'fill the connected area of one shade with the selected shade',
  Pan: 'drag to move the view (right or middle mouse button pans with any tool)',
  Stamp: 'paint the selected item; drag to paint continuously',
  Rectangle: 'drag out a rectangle and fill it with the selected item',
  'Select area': 'click a cell or drag an area, then Clear selection (or Delete) resets it to the empty background',
  Fill: 'flood-fill the connected area with the selected item',
  'Pick tile': 'click a cell to select the tile it holds',
  'Pick metatile': 'click a cell to select the metatile it holds',
};

/** Tooltip text for a tool: its name plus what it does. */
export function toolTitle(label: string): string {
  const hint = TOOL_HINTS[label];
  return hint ? `${label} – ${hint}` : label;
}

/**
 * Hover text for toolbar controls, looked up by the control's accessible name
 * (`data-tip`, `aria-label`, its <label> text or its button text) and matched as a prefix.
 * Controls whose name is ambiguous between editors (Add, Delete, Palette ...) carry an explicit `data-tip` instead.
 */
const CONTROL_HINTS: Record<string, string> = {
  'Load project': 'Open a project file (.json) saved earlier with Save project',
  'Save project': 'Download the whole project as a .json file you can load again later',
  'Import .2bpp': 'Replace the tiles with a raw Game Boy 2bpp tile file',
  'Import tileset': 'Use the tiles from a Tile Editor project (.json) or a raw .2bpp file',
  'Import metatiles': 'Use the metatile library from a Metatile Editor project (.json)',
  'Export RGBDS': 'Download assembly source for RGBDS (db lines, ready to INCLUDE)',
  'Export C': 'Download a C header with const arrays for GBDK-2020',
  'Export .2bpp': 'Download the raw tile bytes, 16 bytes per 8x8 tile',
  'Export .1bpp': 'Download the glyphs as 1 bit per pixel (shades 2-3 count as set)',
  'Export tiles': 'Download the raw tile bytes (.2bpp), 16 bytes per tile',
  'Export tile map': 'Download one tile index per tile as a raw .tilemap file',
  'Export map': 'Download the map as raw tile indices, one byte per cell',
  'Export area': 'Which part of the map to export: all of it, one screen, or only the used area',
  'Clear metatile': 'Fill the selected metatile with tile 0',
  'Clear frame': 'Erase every pixel of the current frame',
  'Clear map': 'Reset every map cell to tile 0',
  'Clear level': 'Reset every level cell to the first metatile',
  'Clear glyph': 'Erase the selected glyph',
  'Clear all': 'Erase every glyph',
  Clear: 'Erase every pixel of the canvas',
  'Reset to starter': 'Put the starter font version of this glyph back',
  'Load starter font': 'Replace all glyphs with the built-in starter font',
  Copy: 'Copy the selected glyph',
  Paste: 'Paste the copied glyph over the selected one',
  'Remove image': 'Stop using the tracing image',
  'Load tracing image': 'Pick a picture to show behind the canvas so you can trace it',
  'Instruments': 'Edit the pulse, wave and noise instruments the notes use',
  Play: 'Play from the start (Space also plays or stops)',
  Stop: 'Stop playback',
  'Add current pattern to order': 'Append the selected pattern to the end of the order list',
  'Remove order position': 'Remove this entry from the order list',
  'Order position': 'Which pattern plays at this point of the song',
  Pattern: 'Choose the pattern to edit',
  Rows: 'How many rows the selected pattern has',
  Speed: 'Game frames (1/60 s) per row: lower is faster',
  Zoom: 'How large the canvas is drawn',
  Palette: 'Which 4-shade colours the editor uses (the Game Boy shows whatever the palette register says)',
  Shade: 'Pick the shade to draw with: 0 is lightest, 3 darkest',
  'Screen tint': 'Preview colours for the LCD; it does not change the exported data',
  'Background palette': 'BGP register value used for the preview ($E4 is the usual 0-1-2-3 ramp)',
  'Metatile width': 'Width of every metatile in tiles (1-16)',
  'Metatile height': 'Height of every metatile in tiles (1-16)',
  'OBJ size': 'Sprite size mode (LCDC bit 2): 8x8 or 8x16 pixels per hardware sprite',
  'Width in tiles': 'Canvas width in 8x8 tiles',
  'Height in tiles': 'Canvas height in 8x8 tiles',
  'Width in metatiles': 'Level width in metatiles',
  'Height in metatiles': 'Level height in metatiles',
  Duration: 'How long this frame shows, in 1/60 s ticks',
  'Behind background': 'Set the OAM priority bit: the sprite hides behind background shades 1-3',
  'Show grid': 'Draw lines between cells',
  'Show tile numbers': 'Print each tile\'s index on the canvas',
  'Show collision': 'Tint metatiles flagged solid',
  'Show screen': 'Outline the 20x18-tile area the LCD shows at the chosen scroll position',
  'Show viewport': 'Outline the 20x18-tile area the LCD shows at the chosen scroll position',
  SCX: 'Horizontal scroll (pixels) for the screen outline',
  SCY: 'Vertical scroll (pixels) for the screen outline',
  'Onion skin': 'Show the previous frame faintly behind the current one',
  Loop: 'Restart the animation when it reaches the last frame',
  Opacity: 'How see-through the tracing image is',
  Scale: 'Size of the tracing image',
  Adjust: 'Drag on the canvas to move the tracing image',
  Show: 'Show or hide the tracing image',
  'Solid': 'Mark the metatile as solid for collision',
  Undo: 'Undo the last change (Ctrl/Cmd+Z)',
  Redo: 'Redo the change you undid (Ctrl+Y or Ctrl/Cmd+Shift+Z)',
  'Open toolbar': 'Show the toolbar',
  'Close toolbar': 'Hide the toolbar',
};

/** Hover text for a control name, or undefined. Longest matching prefix wins. */
export function controlHint(name: string): string | undefined {
  const n = name.trim();
  let best: string | undefined;
  for (const key of Object.keys(CONTROL_HINTS)) {
    if (n.startsWith(key) && (best === undefined || key.length > best.length)) best = key;
  }
  return best === undefined ? undefined : CONTROL_HINTS[best];
}
