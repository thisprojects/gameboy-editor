/** What each tool does, shown as a hover tooltip next to the tool's name. */
export const TOOL_HINTS: Record<string, string> = {
  Pencil: 'draw single pixels in the selected shade; drag to draw freely',
  Line: 'drag to draw a straight line in the selected shade',
  Rubber: 'erase back to shade 0 (transparent in sprites); drag to erase',
  'Bucket (flood fill)': 'fill the connected area of one shade with the selected shade',
  Pan: 'drag to move the view (right or middle mouse button pans with any tool)',
  Stamp: 'paint the selected item; drag to paint continuously',
  Rectangle: 'drag out a rectangle and fill it with the selected item',
  Fill: 'flood-fill the connected area with the selected item',
  'Pick tile': 'click a cell to select the tile it holds',
  'Pick metatile': 'click a cell to select the metatile it holds',
};

/** Tooltip text for a tool: its name plus what it does. */
export function toolTitle(label: string): string {
  const hint = TOOL_HINTS[label];
  return hint ? `${label} – ${hint}` : label;
}
