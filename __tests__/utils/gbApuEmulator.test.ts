import { GbApuEmulator } from '@/utils/gbApuEmulator';
import { REG } from '@/constants/music';

class FakeNode {
  port = { postMessage: jest.fn() };
  connect = jest.fn();
  disconnect = jest.fn();
  constructor(public ctx: unknown, public name: string, public options: unknown) {
    nodes.push(this);
  }
}
class FakeContext {
  state = 'suspended';
  audioWorklet = { addModule: jest.fn().mockResolvedValue(undefined) };
  destination = {};
  resume = jest.fn(async () => {
    this.state = 'running';
  });
  close = jest.fn();
  constructor() {
    contexts.push(this);
  }
}

let nodes: FakeNode[] = [];
let contexts: FakeContext[] = [];

beforeEach(() => {
  nodes = [];
  contexts = [];
  Object.assign(globalThis, { AudioContext: FakeContext, AudioWorkletNode: FakeNode });
});

describe('GbApuEmulator', () => {
  it('loads the worklet once, connects the node and powers the chip on', async () => {
    const chip = new GbApuEmulator();
    await Promise.all([chip.init(), chip.init()]);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].audioWorklet.addModule).toHaveBeenCalledWith('/gb-apu-worklet.js');
    expect(nodes[0].name).toBe('gb-apu-processor');
    expect(nodes[0].connect).toHaveBeenCalledWith(contexts[0].destination);
    expect(nodes[0].port.postMessage.mock.calls.map((c) => c[0])).toEqual([
      { type: 'write', addr: REG.NR52, value: 0x80 },
      { type: 'write', addr: REG.NR50, value: 0x77 },
      { type: 'write', addr: REG.NR51, value: 0xff },
    ]);
  });

  it('resumes a suspended context', async () => {
    const chip = new GbApuEmulator();
    await chip.resume();
    expect(contexts[0].resume).toHaveBeenCalled();
    await chip.resume(); // already running
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
  });

  it('posts register writes masked to a byte, and lists of writes', async () => {
    const chip = new GbApuEmulator();
    await chip.init();
    nodes[0].port.postMessage.mockClear();
    chip.writeRegister(REG.NR12, 0x1f0);
    chip.writes([{ addr: REG.NR22, value: 1 }, { addr: REG.NR42, value: 2 }]);
    expect(nodes[0].port.postMessage.mock.calls.map((c) => c[0])).toEqual([
      { type: 'write', addr: REG.NR12, value: 0xf0 },
      { type: 'write', addr: REG.NR22, value: 1 },
      { type: 'write', addr: REG.NR42, value: 2 },
    ]);
  });

  it('silences all four channels', async () => {
    const chip = new GbApuEmulator();
    await chip.init();
    nodes[0].port.postMessage.mockClear();
    chip.silence();
    expect(nodes[0].port.postMessage.mock.calls.map((c) => c[0].addr)).toEqual([REG.NR12, REG.NR22, REG.NR30, REG.NR42]);
  });

  it('ignores writes before init and can be closed and re-initialised', async () => {
    const chip = new GbApuEmulator();
    expect(() => chip.writeRegister(REG.NR12, 1)).not.toThrow();
    await chip.init();
    chip.close();
    expect(nodes[0].disconnect).toHaveBeenCalled();
    expect(contexts[0].close).toHaveBeenCalled();
    chip.writeRegister(REG.NR12, 1); // no node any more
    await chip.init();
    expect(contexts).toHaveLength(2);
    expect(() => new GbApuEmulator().close()).not.toThrow();
  });
});

describe('GbApuEmulator - a failed start', () => {
  it('is not remembered: the next call tries again, and the failed audio context is closed', async () => {
    const chip = new GbApuEmulator();
    let attempts = 0;
    const original = FakeContext.prototype;
    const failOnce = jest.fn(async () => {
      attempts++;
      if (attempts === 1) throw new Error('network error');
    });
    Object.assign(globalThis, {
      AudioContext: class extends FakeContext {
        constructor() {
          super();
          this.audioWorklet = { addModule: failOnce };
        }
      },
    });
    await expect(chip.init()).rejects.toThrow('network error');
    expect(contexts).toHaveLength(1);
    expect(contexts[0].close).toHaveBeenCalled(); // no leaked context

    await chip.init(); // a second try works
    expect(contexts).toHaveLength(2);
    expect(nodes).toHaveLength(1);
    expect(contexts[1].close).not.toHaveBeenCalled();
    await chip.init(); // and is remembered from then on
    expect(contexts).toHaveLength(2);
    expect(original).toBe(FakeContext.prototype);
  });

  it('writes after a failed start are ignored without error', async () => {
    Object.assign(globalThis, {
      AudioContext: class extends FakeContext {
        constructor() {
          super();
          this.audioWorklet = { addModule: jest.fn().mockRejectedValue(new Error('no')) };
        }
      },
    });
    const chip = new GbApuEmulator();
    await expect(chip.resume()).rejects.toThrow('no');
    expect(() => chip.writeRegister(0xff12, 1)).not.toThrow();
  });
});
