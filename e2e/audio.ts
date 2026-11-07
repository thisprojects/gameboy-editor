import { Page } from '@playwright/test';

/**
 * Lets a test hear what the app plays. Call before the page loads: it puts an AnalyserNode behind the app's
 * AudioWorkletNode (the Game Boy sound chip emulation), so the real sound can be measured in the browser.
 */
export async function installAudioProbe(page: Page) {
  await page.addInitScript(() => {
    const probe = { analyser: null as AnalyserNode | null, workletNodes: 0 };
    (window as unknown as { __audio: typeof probe }).__audio = probe;

    const OriginalWorkletNode = window.AudioWorkletNode;
    window.AudioWorkletNode = class extends OriginalWorkletNode {
      constructor(...args: ConstructorParameters<typeof OriginalWorkletNode>) {
        super(...args);
        probe.workletNodes++;
      }
    };

    const originalConnect = AudioNode.prototype.connect as (...a: unknown[]) => unknown;
    AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
      if (this instanceof OriginalWorkletNode && !probe.analyser) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0;
        originalConnect.call(this, analyser);
        probe.analyser = analyser;
      }
      return originalConnect.apply(this, args);
    } as typeof AudioNode.prototype.connect;
  });
}

/** The loudest sample of the last ~0.18 s of sound (0 = silence). */
export async function peakLevel(page: Page): Promise<number> {
  return page.evaluate(() => {
    const analyser = (window as unknown as { __audio: { analyser: AnalyserNode | null } }).__audio.analyser;
    if (!analyser) return 0;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return samples.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0);
  });
}

/**
 * How much stronger the sound is near `hz` than the typical level between 80 Hz and 2 kHz
 * (the same measure the emulator tests use). Above ~8 means the pitch is clearly there.
 */
export async function pitchStrength(page: Page, hz: number): Promise<number> {
  return page.evaluate((target) => {
    const analyser = (window as unknown as { __audio: { analyser: AnalyserNode | null } }).__audio.analyser;
    if (!analyser) return 0;
    const bins = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(bins); // decibels
    const magnitude = Array.from(bins, (db) => Math.pow(10, db / 20));
    const binHz = analyser.context.sampleRate / analyser.fftSize;
    const inBand = magnitude.filter((_, i) => i * binHz > 80 && i * binHz < 2000).sort((a, b) => a - b);
    const median = inBand[Math.floor(inBand.length / 2)] || 1e-12;
    let near = 0;
    for (let i = 0; i < magnitude.length; i++) if (i * binHz > target * 0.97 && i * binHz < target * 1.03) near = Math.max(near, magnitude[i]);
    return near / median;
  }, hz);
}

export const workletNodeCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { __audio: { workletNodes: number } }).__audio.workletNodes);
