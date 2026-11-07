import { RegWrite } from '@/types/music';
import { silenceWrites, initWrites } from '@/utils/gbMusic';

// Thin wrapper around the Game Boy APU AudioWorklet (public/gb-apu-worklet.js).
// It takes the same register writes that the exported SM83 player performs on real hardware.

export class GbApuEmulator {
  private context: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private ready: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.ready) return this.ready;
    const attempt = (async () => {
      const ctx = new AudioContext();
      try {
        await ctx.audioWorklet.addModule('/gb-apu-worklet.js');
        const node = new AudioWorkletNode(ctx, 'gb-apu-processor', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        node.connect(ctx.destination);
        this.context = ctx;
        this.node = node;
        this.writes(initWrites());
      } catch (error) {
        ctx.close(); // do not leak the audio context of a failed attempt
        throw error;
      }
    })();
    this.ready = attempt;
    // a failed start must not be remembered: the next call (the next press of Play) tries again
    attempt.catch(() => {
      if (this.ready === attempt) this.ready = null;
    });
    return attempt;
  }

  /** Initialise (if needed) and resume the audio context; call from a user gesture. */
  async resume(): Promise<void> {
    await this.init();
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  writeRegister(addr: number, value: number): void {
    this.node?.port.postMessage({ type: 'write', addr, value: value & 0xff });
  }

  writes(list: RegWrite[]): void {
    for (const { addr, value } of list) this.writeRegister(addr, value);
  }

  silence(): void {
    this.writes(silenceWrites());
  }

  close(): void {
    this.node?.disconnect();
    this.context?.close();
    this.context = null;
    this.node = null;
    this.ready = null;
  }
}
