// Game Boy (DMG) APU software emulator, run inside an AudioWorklet.
// Implements the four channels (2 pulse with sweep on channel 1, wave, noise), the hardware
// volume envelopes, the frame sequencer and the master mixer, driven by register writes posted
// from the main thread - the same writes the exported SM83 player performs on real hardware.
//
// Simplifications: the length counters are not emulated (instruments do not use them) and the
// output is mono with simple (non band-limited) waveforms.

const DUTY_PATTERNS = [
  [0, 0, 0, 0, 0, 0, 0, 1], // 12.5%
  [1, 0, 0, 0, 0, 0, 0, 1], // 25%
  [1, 0, 0, 0, 0, 1, 1, 1], // 50%
  [0, 1, 1, 1, 1, 1, 1, 0], // 75%
];

const NR = {
  NR10: 0xff10, NR11: 0xff11, NR12: 0xff12, NR13: 0xff13, NR14: 0xff14,
  NR21: 0xff16, NR22: 0xff17, NR23: 0xff18, NR24: 0xff19,
  NR30: 0xff1a, NR32: 0xff1c, NR33: 0xff1d, NR34: 0xff1e,
  NR42: 0xff21, NR43: 0xff22, NR44: 0xff23,
  NR50: 0xff24, NR51: 0xff25, NR52: 0xff26,
};

class PulseChannel {
  constructor(hasSweep) {
    this.hasSweep = hasSweep;
    this.enabled = false;
    this.dac = false;
    this.duty = 0;
    this.x = 0; // 11-bit period value
    this.phase = 0;
    this.volume = 0;
    this.envInitial = 0;
    this.envUp = false;
    this.envPeriod = 0;
    this.envTimer = 0;
    // sweep (channel 1)
    this.sweepPeriod = 0;
    this.sweepNegate = false;
    this.sweepShift = 0;
    this.sweepTimer = 0;
    this.sweepEnabled = false;
    this.shadow = 0;
  }

  setEnvelope(v) {
    this.envInitial = v >> 4;
    this.envUp = (v & 8) !== 0;
    this.envPeriod = v & 7;
    this.dac = (v & 0xf8) !== 0;
    if (!this.dac) this.enabled = false;
  }

  setSweep(v) {
    this.sweepPeriod = (v >> 4) & 7;
    this.sweepNegate = (v & 8) !== 0;
    this.sweepShift = v & 7;
  }

  sweepTarget() {
    const delta = this.shadow >> this.sweepShift;
    return this.sweepNegate ? this.shadow - delta : this.shadow + delta;
  }

  trigger() {
    this.enabled = this.dac;
    this.volume = this.envInitial;
    this.envTimer = this.envPeriod || 8;
    this.phase = 0;
    if (this.hasSweep) {
      this.shadow = this.x;
      this.sweepTimer = this.sweepPeriod || 8;
      this.sweepEnabled = this.sweepPeriod !== 0 || this.sweepShift !== 0;
      if (this.sweepShift !== 0 && this.sweepTarget() > 2047) this.enabled = false;
    }
  }

  clockEnvelope() {
    if (this.envPeriod === 0 || !this.enabled) return;
    if (--this.envTimer <= 0) {
      this.envTimer = this.envPeriod;
      if (this.envUp && this.volume < 15) this.volume++;
      else if (!this.envUp && this.volume > 0) this.volume--;
    }
  }

  clockSweep() {
    if (!this.hasSweep || !this.enabled || !this.sweepEnabled) return;
    if (--this.sweepTimer > 0) return;
    this.sweepTimer = this.sweepPeriod || 8;
    if (this.sweepPeriod === 0) return;
    const target = this.sweepTarget();
    if (target > 2047) {
      this.enabled = false;
    } else if (this.sweepShift > 0) {
      this.shadow = target;
      this.x = target;
      if (this.sweepTarget() > 2047) this.enabled = false;
    }
  }

  sample(sampleRate) {
    if (!this.enabled || !this.dac) return 0;
    this.phase += 131072 / (2048 - this.x) / sampleRate;
    this.phase -= Math.floor(this.phase);
    return DUTY_PATTERNS[this.duty][Math.floor(this.phase * 8)] * this.volume;
  }
}

class WaveChannel {
  constructor() {
    this.enabled = false;
    this.dac = false;
    this.level = 0; // NR32 bits 5-6: 0 mute, 1 100%, 2 50%, 3 25%
    this.x = 0;
    this.phase = 0;
    this.ram = new Uint8Array(16);
  }

  trigger() {
    this.enabled = this.dac;
    this.phase = 0;
  }

  sample(sampleRate) {
    if (!this.enabled || !this.dac) return 0;
    this.phase += 65536 / (2048 - this.x) / sampleRate;
    this.phase -= Math.floor(this.phase);
    const i = Math.floor(this.phase * 32);
    const byte = this.ram[i >> 1];
    const nibble = i & 1 ? byte & 15 : byte >> 4;
    return this.level === 0 ? 0 : nibble >> (this.level - 1);
  }
}

class NoiseChannel {
  constructor() {
    this.enabled = false;
    this.dac = false;
    this.volume = 0;
    this.envInitial = 0;
    this.envUp = false;
    this.envPeriod = 0;
    this.envTimer = 0;
    this.shift = 0;
    this.narrow = false; // 7-bit LFSR
    this.divisor = 0;
    this.lfsr = 0x7fff;
    this.acc = 0;
    this.last = 0;
  }

  setEnvelope(v) {
    this.envInitial = v >> 4;
    this.envUp = (v & 8) !== 0;
    this.envPeriod = v & 7;
    this.dac = (v & 0xf8) !== 0;
    if (!this.dac) this.enabled = false;
  }

  setNoise(v) {
    this.shift = v >> 4;
    this.narrow = (v & 8) !== 0;
    this.divisor = v & 7;
  }

  trigger() {
    this.enabled = this.dac;
    this.volume = this.envInitial;
    this.envTimer = this.envPeriod || 8;
    this.lfsr = 0x7fff;
    this.acc = 0;
  }

  clockEnvelope() {
    if (this.envPeriod === 0 || !this.enabled) return;
    if (--this.envTimer <= 0) {
      this.envTimer = this.envPeriod;
      if (this.envUp && this.volume < 15) this.volume++;
      else if (!this.envUp && this.volume > 0) this.volume--;
    }
  }

  stepLfsr() {
    const bit = (this.lfsr ^ (this.lfsr >> 1)) & 1;
    this.lfsr = (this.lfsr >> 1) | (bit << 14);
    if (this.narrow) this.lfsr = (this.lfsr & ~0x40) | (bit << 6);
    return (~this.lfsr & 1) * this.volume;
  }

  sample(sampleRate) {
    if (!this.enabled || !this.dac) return 0;
    if (this.shift >= 14) return this.last; // LFSR is not clocked
    this.acc += 262144 / ((this.divisor || 0.5) * Math.pow(2, this.shift)) / sampleRate;
    let sum = 0;
    let steps = 0;
    while (this.acc >= 1) {
      this.acc -= 1;
      sum += this.stepLfsr();
      steps++;
    }
    if (steps > 0) this.last = sum / steps;
    return this.last;
  }
}

class GbApu {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.ch1 = new PulseChannel(true);
    this.ch2 = new PulseChannel(false);
    this.ch3 = new WaveChannel();
    this.ch4 = new NoiseChannel();
    this.power = false;
    this.nr50 = 0;
    this.nr51 = 0;
    this.frameAcc = 0;
    this.frameStep = 0;
    this.hpf = 0; // high-pass filter state (removes the DC offset of the DACs)
    this.prevIn = 0;
  }

  write(addr, value) {
    value &= 0xff;
    if (addr >= 0xff30 && addr <= 0xff3f) {
      this.ch3.ram[addr - 0xff30] = value;
      return;
    }
    if (addr === NR.NR52) {
      const on = (value & 0x80) !== 0;
      if (!on && this.power) this.reset();
      this.power = on;
      return;
    }
    if (!this.power) return;
    const { ch1, ch2, ch3, ch4 } = this;
    switch (addr) {
      case NR.NR10: ch1.setSweep(value); break;
      case NR.NR11: ch1.duty = value >> 6; break;
      case NR.NR12: ch1.setEnvelope(value); break;
      case NR.NR13: ch1.x = (ch1.x & 0x700) | value; break;
      case NR.NR14:
        ch1.x = ((value & 7) << 8) | (ch1.x & 0xff);
        if (value & 0x80) ch1.trigger();
        break;
      case NR.NR21: ch2.duty = value >> 6; break;
      case NR.NR22: ch2.setEnvelope(value); break;
      case NR.NR23: ch2.x = (ch2.x & 0x700) | value; break;
      case NR.NR24:
        ch2.x = ((value & 7) << 8) | (ch2.x & 0xff);
        if (value & 0x80) ch2.trigger();
        break;
      case NR.NR30:
        ch3.dac = (value & 0x80) !== 0;
        if (!ch3.dac) ch3.enabled = false;
        break;
      case NR.NR32: ch3.level = (value >> 5) & 3; break;
      case NR.NR33: ch3.x = (ch3.x & 0x700) | value; break;
      case NR.NR34:
        ch3.x = ((value & 7) << 8) | (ch3.x & 0xff);
        if (value & 0x80) ch3.trigger();
        break;
      case NR.NR42: ch4.setEnvelope(value); break;
      case NR.NR43: ch4.setNoise(value); break;
      case NR.NR44:
        if (value & 0x80) ch4.trigger();
        break;
      case NR.NR50: this.nr50 = value; break;
      case NR.NR51: this.nr51 = value; break;
      default: break;
    }
  }

  reset() {
    const ram = this.ch3.ram;
    this.ch1 = new PulseChannel(true);
    this.ch2 = new PulseChannel(false);
    this.ch3 = new WaveChannel();
    this.ch3.ram = ram; // wave RAM survives power off
    this.ch4 = new NoiseChannel();
    this.nr50 = 0;
    this.nr51 = 0;
  }

  // 512 Hz frame sequencer: envelope at 64 Hz (step 7), sweep at 128 Hz (steps 2 and 6).
  clockFrameSequencer() {
    const step = this.frameStep;
    if (step === 2 || step === 6) this.ch1.clockSweep();
    if (step === 7) {
      this.ch1.clockEnvelope();
      this.ch2.clockEnvelope();
      this.ch4.clockEnvelope();
    }
    this.frameStep = (step + 1) & 7;
  }

  // One mono output sample in roughly [-1, 1].
  sample() {
    this.frameAcc += 512 / this.sampleRate;
    while (this.frameAcc >= 1) {
      this.frameAcc -= 1;
      this.clockFrameSequencer();
    }
    if (!this.power) return 0;

    const sr = this.sampleRate;
    const outs = [this.ch1.sample(sr), this.ch2.sample(sr), this.ch3.sample(sr), this.ch4.sample(sr)];
    let mix = 0;
    for (let i = 0; i < 4; i++) {
      // NR51: bit i = channel i to the right output, bit i+4 = to the left
      if (this.nr51 & ((1 << i) | (1 << (i + 4)))) mix += outs[i] / 15;
    }
    const left = ((this.nr50 >> 4) & 7) + 1;
    const right = (this.nr50 & 7) + 1;
    const raw = (mix * 0.25 * (left + right)) / 16;

    this.hpf = raw - this.prevIn + 0.995 * this.hpf;
    this.prevIn = raw;
    return this.hpf;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor(
    'gb-apu-processor',
    class extends AudioWorkletProcessor {
      constructor() {
        super();
        this.apu = new GbApu(sampleRate);
        this.port.onmessage = (e) => {
          const msg = e.data;
          if (msg.type === 'write') this.apu.write(msg.addr, msg.value);
        };
      }

      process(_inputs, outputs) {
        const out = outputs[0][0];
        for (let i = 0; i < out.length; i++) out[i] = this.apu.sample();
        return true;
      }
    }
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GbApu, PulseChannel, WaveChannel, NoiseChannel };
}
