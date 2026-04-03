export class AudioManager {
  private context: AudioContext | null = null;
  get isStarted(): boolean { return this.context !== null; }
  private masterGain: GainNode | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientGains: GainNode[] = [];

  async start(): Promise<void> {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.setValueAtTime(0.15, this.context.currentTime);
    this.masterGain.connect(this.context.destination);
  }

  startAmbient(biomeHue: number): void {
    if (!this.context || !this.masterGain) return;

    this.stopAmbient();

    const base = 60 + (biomeHue / 360) * 40;
    const multipliers = [1, 1.5, 2.01, 3.01];

    for (const mult of multipliers) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * mult, this.context.currentTime);

      gain.gain.setValueAtTime(0.03 / mult, this.context.currentTime);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();

      this.ambientOscillators.push(osc);
      this.ambientGains.push(gain);
    }
  }

  playScanCharge(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 2;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(800, now + duration);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playDiscovery(isNew: boolean): void {
    if (!this.context || !this.masterGain) return;

    const notes = isNew
      ? [523, 659, 784, 1047]
      : [523, 659];

    const noteDuration = 0.4;
    const noteSpacing = 0.15;
    const attackTime = 0.02;
    const now = this.context.currentTime;

    notes.forEach((freq, i) => {
      const startTime = now + i * noteSpacing;

      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + attackTime);
      gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  playFanfare(): void {
    if (!this.context || !this.masterGain) return;

    const notes = [523, 659, 784, 1047, 1319, 1568];
    const noteSpacing = 0.12;
    const noteDuration = 0.6;
    const attackTime = 0.02;
    const gainLevel = 0.2;
    const now = this.context.currentTime;

    notes.forEach((freq, i) => {
      const startTime = now + i * noteSpacing;

      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainLevel, startTime + attackTime);
      gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  stopAmbient(): void {
    for (const osc of this.ambientOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    }
    for (const gain of this.ambientGains) {
      gain.disconnect();
    }
    this.ambientOscillators = [];
    this.ambientGains = [];
  }

  dispose(): void {
    this.stopAmbient();
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}
