export interface FontProject {
  version: 1;
  type: 'font';
  /** glyphs[index][y][x] = shade 0-3, index 0 = ASCII 32 */
  glyphs: number[][][];
}
