// Tiny synth engine. All music is generated procedurally with oscillators —
// no audio files needed, and notes can be scheduled with sample-accurate timing.
class Synth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.28;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  playTone({ freq, startTime, duration, wave = 'square', gain = 0.6 }) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    const peak = gain * 0.5;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peak, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gainNode).connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  playHitSound(judgement) {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const freqs = { perfect: 1318.5, good: 880, ok: 587.3, miss: 174.6 };
    this.playTone({ freq: freqs[judgement] || 440, startTime: now, duration: 0.12, wave: 'sine', gain: 0.7 });
  }

  // Closes the current context so the next ensureCtx() starts a fresh one.
  reset() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

export const synth = new Synth();

export function scheduleSong(song, startTime) {
  const secPerBeat = 60 / song.bpm;
  song.melody.forEach((n) => {
    synth.playTone({
      freq: n.freq,
      startTime: startTime + n.beat * secPerBeat,
      duration: n.durationBeats * secPerBeat,
      wave: song.waveform || 'square',
      gain: 0.5,
    });
  });
}
