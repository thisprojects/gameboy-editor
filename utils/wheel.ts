/** Wheel handling shared by the canvases: scroll / two-finger swipe pans, pinch or Ctrl/Cmd + scroll zooms. */

/** A trackpad pinch arrives as a wheel event with ctrlKey set, so it is covered by the same check. */
export function isZoomWheel(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.ctrlKey || e.metaKey;
}

const STEP_DELTA = 40;

/**
 * Turns zoom-wheel deltas into zoom steps (+1 in, -1 out, 0 not yet). A pinch sends many tiny deltas, so they add up
 * in `acc` until one step is due; a mouse-wheel notch (about 100) is one step at once.
 */
export function zoomStep(acc: { current: number }, deltaY: number): 1 | -1 | 0 {
  acc.current += -deltaY;
  if (acc.current >= STEP_DELTA) { acc.current = 0; return 1; }
  if (acc.current <= -STEP_DELTA) { acc.current = 0; return -1; }
  return 0;
}
