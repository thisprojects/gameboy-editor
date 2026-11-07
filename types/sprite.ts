export interface SpriteFrame {
  /** pixels[y][x] = colour index 0-3 (0 = transparent in-game) */
  pixels: number[][];
  /** Duration in 1/60 s ticks */
  duration: number;
}

export interface SpriteProject {
  version: 1;
  type: 'sprite';
  tilesWidth: number;
  tilesHeight: number;
  objSize: '8x8' | '8x16';
  palette: 0 | 1;
  priority: boolean;
  frames: SpriteFrame[];
}
