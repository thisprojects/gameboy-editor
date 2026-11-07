/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const { GbApu } = require('../../public/gb-apu-worklet.js') as { GbApu: new (rate: number) => any };

const RATE = 44100;
const NR = {
  NR10: 0xff10, NR11: 0xff11, NR12: 0xff12, NR13: 0xff13, NR14: 0xff14, NR21: 0xff16, NR22: 0xff17, NR23: 0xff18, NR24: 0xff19,
  NR30: 0xff1a, NR32: 0xff1c, NR33: 0xff1d, NR34: 0xff1e, NR42: 0xff21, NR43: 0xff22, NR44: 0xff23, NR50: 0xff24, NR51: 0xff25, NR52: 0xff26,
};

function powered() {
  const apu = new GbApu(RATE);
  apu.write(NR.NR52, 0x80);
  apu.write(NR.NR50, 0x77);
  apu.write(NR.NR51, 0xff);
  return apu;
}

/** Count rising edges of a channel's output over `seconds`. */
function risingEdges(sample: () => number, seconds: number): number {
  let prev = 0;
  let edges = 0;
  for (let i = 0; i < RATE * seconds; i++) {
    const s = sample();
    if (s > 0 && prev === 0) edges++;
    prev = s;
  }
  return edges;
}

function trigger1(apu: any, x: number, env = 0xf0, duty = 2) {
  apu.write(NR.NR11, duty << 6);
  apu.write(NR.NR12, env);
  apu.write(NR.NR13, x & 0xff);
  apu.write(NR.NR14, 0x80 | (x >> 8));
}

describe('GbApu', () => {
  it('is silent until powered on, and writes are ignored while off', () => {
    const apu = new GbApu(RATE);
    trigger1(apu, 1750);
    for (let i = 0; i < 100; i++) expect(apu.sample()).toBe(0);
    expect(apu.ch1.enabled).toBe(false);
  });

  it('plays a pulse wave at the frequency set by the period (A4 = 440 Hz)', () => {
    const apu = powered();
    trigger1(apu, 1750, 0xf0, 2);
    const edges = risingEdges(() => apu.ch1.sample(RATE), 1);
    expect(Math.abs(edges - 440)).toBeLessThanOrEqual(3);
  });

  it('has the right duty cycles', () => {
    for (const [duty, fraction] of [[0, 1 / 8], [1, 2 / 8], [2, 4 / 8], [3, 6 / 8]] as const) {
      const apu = powered();
      trigger1(apu, 1750, 0xf0, duty);
      let high = 0;
      const n = RATE;
      for (let i = 0; i < n; i++) if (apu.ch1.sample(RATE) > 0) high++;
      expect(high / n).toBeCloseTo(fraction, 1);
    }
  });

  it('scales output with the envelope volume', () => {
    const apu = powered();
    trigger1(apu, 1750, 0x80); // volume 8, no envelope
    let max = 0;
    for (let i = 0; i < 1000; i++) max = Math.max(max, apu.ch1.sample(RATE));
    expect(max).toBe(8);
  });

  it('decays the envelope at 64 Hz / period', () => {
    const apu = powered();
    trigger1(apu, 1750, 0xf1); // 15, down, period 1 -> one step every 1/64 s
    for (let i = 0; i < RATE * 0.5; i++) apu.sample();
    expect(apu.ch1.volume).toBe(0);
    const slow = powered();
    trigger1(slow, 1750, 0xf7); // period 7 -> 15 steps take ~1.64 s
    for (let i = 0; i < RATE * 0.5; i++) slow.sample();
    expect(slow.ch1.volume).toBeGreaterThan(5);
    expect(slow.ch1.volume).toBeLessThan(15);
  });

  it('raises the volume with an upward envelope', () => {
    const apu = powered();
    trigger1(apu, 1750, 0x09); // 0, up, period 1 -> DAC on (bit 3 set)
    for (let i = 0; i < RATE * 0.5; i++) apu.sample();
    expect(apu.ch1.volume).toBe(15);
  });

  it('turns the channel off when the DAC is disabled', () => {
    const apu = powered();
    trigger1(apu, 1750, 0xf0);
    expect(apu.ch1.enabled).toBe(true);
    apu.write(NR.NR12, 0x00);
    expect(apu.ch1.enabled).toBe(false);
    expect(apu.ch1.sample(RATE)).toBe(0);
    trigger1(apu, 1750, 0x00); // triggering with the DAC off does not enable it
    expect(apu.ch1.enabled).toBe(false);
  });

  it('sweeps the period and disables the channel on overflow', () => {
    const down = powered();
    down.write(NR.NR10, 0x19); // period 1, subtract, shift 1 -> frequency falls
    trigger1(down, 1000, 0xf0);
    const x0 = down.ch1.x;
    for (let i = 0; i < RATE * 0.05; i++) down.sample();
    expect(down.ch1.x).toBeLessThan(x0);

    const up = powered();
    up.write(NR.NR10, 0x11); // period 1, add, shift 1 -> frequency rises until overflow
    trigger1(up, 1500, 0xf0);
    for (let i = 0; i < RATE * 0.2; i++) up.sample();
    expect(up.ch1.enabled).toBe(false);
  });

  it('does not sweep when the sweep register is zero, and channel 2 has no sweep', () => {
    const apu = powered();
    apu.write(NR.NR10, 0x00);
    trigger1(apu, 1000, 0xf0);
    for (let i = 0; i < RATE * 0.1; i++) apu.sample();
    expect(apu.ch1.x).toBe(1000);
    apu.write(NR.NR21, 2 << 6);
    apu.write(NR.NR22, 0xf0);
    apu.write(NR.NR23, 0xd6);
    apu.write(NR.NR24, 0x86);
    expect(apu.ch2.x).toBe((6 << 8) | 0xd6);
    expect(risingEdges(() => apu.ch2.sample(RATE), 1)).toBeGreaterThan(100);
  });

  it('immediately disables on a triggering overflow with shift', () => {
    const apu = powered();
    apu.write(NR.NR10, 0x01); // add, shift 1, period 0
    trigger1(apu, 2000, 0xf0); // 2000 + 1000 > 2047
    expect(apu.ch1.enabled).toBe(false);
  });

  it('plays wave RAM at 65536/(2048-x) Hz per 32-sample cycle, honouring output level', () => {
    const apu = powered();
    // square wave: 16 samples of 15 then 16 of 0
    for (let i = 0; i < 16; i++) apu.write(0xff30 + i, i < 8 ? 0xff : 0x00);
    apu.write(NR.NR30, 0x80);
    apu.write(NR.NR32, 1 << 5);
    apu.write(NR.NR33, 1899 & 0xff);
    apu.write(NR.NR34, 0x80 | (1899 >> 8));
    let max = 0;
    const edges = risingEdges(() => {
      const s = apu.ch3.sample(RATE);
      max = Math.max(max, s);
      return s;
    }, 1);
    expect(max).toBe(15);
    expect(Math.abs(edges - 440)).toBeLessThanOrEqual(3);

    for (const [level, expected] of [[2, 7], [3, 3], [0, 0]] as const) {
      apu.write(NR.NR32, level << 5);
      let m = 0;
      for (let i = 0; i < 2000; i++) m = Math.max(m, apu.ch3.sample(RATE));
      expect(m).toBe(expected);
    }
  });

  it('reads wave RAM high nibble first', () => {
    const apu = powered();
    apu.write(0xff30, 0xa5);
    apu.write(NR.NR30, 0x80);
    apu.write(NR.NR32, 1 << 5);
    apu.write(NR.NR33, 0);
    apu.write(NR.NR34, 0x80); // x=0 -> very slow: stays on sample 0 for a long time
    expect(apu.ch3.sample(RATE)).toBe(0xa);
    apu.ch3.phase = 1 / 32 + 1e-9;
    apu.ch3.x = 0;
    expect(apu.ch3.sample(RATE)).toBe(0x5);
  });

  it('silences the wave channel when its DAC is switched off', () => {
    const apu = powered();
    apu.write(NR.NR30, 0x80);
    apu.write(NR.NR32, 1 << 5);
    apu.write(NR.NR34, 0x80);
    expect(apu.ch3.enabled).toBe(true);
    apu.write(NR.NR30, 0x00);
    expect(apu.ch3.enabled).toBe(false);
    expect(apu.ch3.sample(RATE)).toBe(0);
  });

  it('noise: 15-bit LFSR is long, 7-bit LFSR repeats after 127 steps', () => {
    const wide = powered();
    wide.write(NR.NR42, 0xf0);
    wide.write(NR.NR43, 0x00);
    wide.write(NR.NR44, 0x80);
    const seqWide = Array.from({ length: 254 }, () => wide.ch4.stepLfsr());
    expect(seqWide.slice(0, 127)).not.toEqual(seqWide.slice(127));

    const narrow = powered();
    narrow.write(NR.NR42, 0xf0);
    narrow.write(NR.NR43, 0x08);
    narrow.write(NR.NR44, 0x80);
    const seq = Array.from({ length: 254 }, () => narrow.ch4.stepLfsr());
    expect(seq.slice(0, 127)).toEqual(seq.slice(127));
    expect(seq.some((s) => s > 0)).toBe(true);
    expect(seq.some((s) => s === 0)).toBe(true);
  });

  it('noise produces output scaled by volume, holds when the shift is 14+, and decays', () => {
    const apu = powered();
    apu.write(NR.NR42, 0xf1);
    apu.write(NR.NR43, 0x30);
    apu.write(NR.NR44, 0x80);
    let max = 0;
    for (let i = 0; i < 2000; i++) max = Math.max(max, apu.ch4.sample(RATE));
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(15);
    for (let i = 0; i < RATE * 0.5; i++) apu.sample();
    expect(apu.ch4.volume).toBe(0);

    const held = powered();
    held.write(NR.NR42, 0xf0);
    held.write(NR.NR43, 0xe0);
    held.write(NR.NR44, 0x80);
    expect(held.ch4.sample(RATE)).toBe(0);
  });

  it('noise: DAC off disables the channel', () => {
    const apu = powered();
    apu.write(NR.NR42, 0xf0);
    apu.write(NR.NR44, 0x80);
    expect(apu.ch4.enabled).toBe(true);
    apu.write(NR.NR42, 0);
    expect(apu.ch4.enabled).toBe(false);
    expect(apu.ch4.sample(RATE)).toBe(0);
  });

  it('mixes only the channels routed by NR51 and scales with NR50', () => {
    const loud = powered();
    trigger1(loud, 1750, 0xf0);
    let loudMax = 0;
    for (let i = 0; i < 4000; i++) loudMax = Math.max(loudMax, Math.abs(loud.sample()));
    expect(loudMax).toBeGreaterThan(0.05);

    const muted = powered();
    muted.write(NR.NR51, 0x00);
    trigger1(muted, 1750, 0xf0);
    for (let i = 0; i < 4000; i++) expect(muted.sample()).toBe(0);

    const quiet = powered();
    quiet.write(NR.NR50, 0x00);
    trigger1(quiet, 1750, 0xf0);
    let quietMax = 0;
    for (let i = 0; i < 4000; i++) quietMax = Math.max(quietMax, Math.abs(quiet.sample()));
    expect(quietMax).toBeLessThan(loudMax);
    expect(quietMax).toBeGreaterThan(0);
  });

  it('removes DC offset (output of a held channel settles near zero)', () => {
    const apu = powered();
    apu.write(NR.NR30, 0x80);
    for (let i = 0; i < 16; i++) apu.write(0xff30 + i, 0xff); // constant 15
    apu.write(NR.NR32, 1 << 5);
    apu.write(NR.NR34, 0x80);
    let last = 1;
    for (let i = 0; i < RATE * 2; i++) last = apu.sample();
    expect(Math.abs(last)).toBeLessThan(0.01);
  });

  it('powering off clears registers but keeps wave RAM; unknown registers are ignored', () => {
    const apu = powered();
    apu.write(0xff30, 0x12);
    trigger1(apu, 1750);
    apu.write(NR.NR52, 0x00);
    expect(apu.power).toBe(false);
    expect(apu.ch1.enabled).toBe(false);
    expect(apu.ch3.ram[0]).toBe(0x12);
    apu.write(NR.NR52, 0x80);
    apu.write(0xff00, 0xff);
    expect(apu.power).toBe(true);
  });
});
