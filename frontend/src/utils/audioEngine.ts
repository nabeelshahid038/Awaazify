// Real-time Studio Web Audio Synthesizer & WAV Master Exporter for Awaazify

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private activeInterval: number | null = null;
  private activeNodes: AudioNode[] = [];
  private currentId: string | null = null;
  private onStopCallback: (() => void) | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public stopAll() {
    if (this.activeInterval) {
      window.clearInterval(this.activeInterval);
      this.activeInterval = null;
    }
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.activeNodes = [];
    if (this.onStopCallback) {
      const cb = this.onStopCallback;
      this.onStopCallback = null;
      cb();
    }
    this.currentId = null;
  }

  public isPlaying(id: string): boolean {
    return this.currentId === id;
  }

  /**
   * Plays a studio vocal/instrumental phrase with real-time harmonic formant shaping
   */
  public playStudioPreview(options: {
    id: string;
    baseFreqHz: number;
    mode: 'original' | 'converted' | 'instrumental-only' | 'vocal-only';
    pitchShiftSemitones?: number;
    clarityBoost?: boolean;
    durationMs?: number;
    onEnded?: () => void;
  }) {
    if (this.currentId === options.id) {
      this.stopAll();
      return false;
    }

    this.stopAll();
    const ctx = this.ensureContext();
    this.currentId = options.id;
    this.onStopCallback = options.onEnded || null;

    const pitchRatio = Math.pow(2, (options.pitchShiftSemitones || 0) / 12);
    const rootFreq = options.baseFreqHz * pitchRatio;

    // Melodic scale ratios (expressive minor/major studio vocal phrase)
    const melodySteps = [1, 1.122, 1.26, 1.335, 1.498, 1.335, 1.26, 1.122];
    let stepIndex = 0;

    const triggerNote = () => {
      if (!this.ctx || this.currentId !== options.id) return;
      const now = ctx.currentTime;
      const ratio = melodySteps[stepIndex % melodySteps.length];
      const noteFreq = rootFreq * ratio;

      // 1. Vocal Formant Carrier (unless instrumental-only)
      if (options.mode !== 'instrumental-only') {
        const vocalOsc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const formantFilter = ctx.createBiquadFilter();
        const vocalGain = ctx.createGain();

        vocalOsc.type = options.mode === 'original' ? 'triangle' : 'sawtooth';
        subOsc.type = 'sine';

        // Vibrato LFO for realistic human vocal warmth
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.value = 5.5;
        vibratoGain.gain.value = options.mode === 'converted' ? 3.5 : 2.0;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(vocalOsc.frequency);

        vocalOsc.frequency.setValueAtTime(noteFreq, now);
        subOsc.frequency.setValueAtTime(noteFreq * 0.5, now);

        formantFilter.type = 'bandpass';
        formantFilter.frequency.setValueAtTime(
          options.clarityBoost ? 1450 : options.mode === 'converted' ? 1150 : 880,
          now
        );
        formantFilter.Q.value = options.clarityBoost ? 2.2 : 3.2;

        vocalGain.gain.setValueAtTime(0.001, now);
        vocalGain.gain.exponentialRampToValueAtTime(0.16, now + 0.06);
        vocalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

        vocalOsc.connect(formantFilter);
        subOsc.connect(formantFilter);
        formantFilter.connect(vocalGain);
        vocalGain.connect(ctx.destination);

        vocalOsc.start(now);
        subOsc.start(now);
        vibrato.start(now);
        vocalOsc.stop(now + 0.5);
        subOsc.stop(now + 0.5);
        vibrato.stop(now + 0.5);

        this.activeNodes.push(vocalOsc, subOsc, vibrato, formantFilter, vocalGain);
      }

      // 2. Studio Backing Instrumental Pad & Pulse (unless vocal-only)
      if (options.mode !== 'vocal-only') {
        const padOsc = ctx.createOscillator();
        const padGain = ctx.createGain();
        const padFilter = ctx.createBiquadFilter();

        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(110 * (stepIndex % 4 === 0 ? 1 : 1.5), now);

        padFilter.type = 'lowpass';
        padFilter.frequency.value = 420;

        padGain.gain.setValueAtTime(0.001, now);
        padGain.gain.linearRampToValueAtTime(0.11, now + 0.05);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

        padOsc.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(ctx.destination);

        padOsc.start(now);
        padOsc.stop(now + 0.5);

        this.activeNodes.push(padOsc, padFilter, padGain);
      }

      stepIndex++;
    };

    triggerNote();
    this.activeInterval = window.setInterval(triggerNote, 480);

    if (options.durationMs) {
      window.setTimeout(() => {
        if (this.currentId === options.id) {
          this.stopAll();
        }
      }, options.durationMs);
    }

    return true;
  }

  /**
   * Generates a real, playable studio audio WAV file blob & triggers browser download
   */
  public downloadMasterAudioFile(filename: string, baseFreqHz = 220, durationSeconds = 6, pitchShift = 0) {
    const sampleRate = 44100;
    const numSamples = sampleRate * durationSeconds;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF WAV Header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const pitchRatio = Math.pow(2, pitchShift / 12);
    const root = baseFreqHz * pitchRatio;
    const notes = [1, 1.122, 1.26, 1.498, 1.335, 1.26, 1.122, 1];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const noteIdx = Math.floor(t * 2) % notes.length;
      const freq = root * notes[noteIdx];
      const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * 2.5;
      const noteLocalTime = (t * 2) % 1;
      const env = Math.sin(Math.PI * noteLocalTime);

      // Rich harmonic vocal + bass stem mix
      const vocal =
        (Math.sin(2 * Math.PI * (freq + vibrato) * t) * 0.55 +
          Math.sin(2 * Math.PI * (freq * 2) * t) * 0.22 +
          Math.sin(2 * Math.PI * 110 * t) * 0.2) *
        env;

      const clamped = Math.max(-1, Math.min(1, vocal * 0.6));
      view.setInt16(44 + i * 2, clamped * 32767, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const studioAudio = new StudioAudioEngine();
