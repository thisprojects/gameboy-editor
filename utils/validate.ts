/** True for an integer from `min` to `max`. (Plain `v >= 0 && v <= 3` would also accept null, "2" and 1.5.) */
export const isIntIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** A pixel shade: an integer 0-3. */
export const isShade = (v: unknown): v is number => isIntIn(v, 0, 3);
