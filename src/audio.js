/**
 * Lightweight Web Audio API sound manager.
 * Audio context is created lazily after the first user gesture.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this._unlocked = false;

    try {
      const saved = localStorage.getItem('fpf_muted');
      if (saved === '1') this.muted = true;
    } catch {
      /* ignore */
    }
  }

  unlock() {
    if (this._unlocked) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
      this._unlocked = true;
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      /* audio unavailable */
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
    try {
      localStorage.setItem('fpf_muted', muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _tone(freq, duration, type = 'sine', gain = 0.2, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + duration);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  playDrop() {
    this._tone(220, 0.08, 'triangle', 0.15, 140);
    this._tone(180, 0.06, 'sine', 0.08);
  }

  playMerge(level = 0) {
    const base = 320 + level * 40;
    this._tone(base, 0.12, 'sine', 0.18, base * 1.5);
    this._tone(base * 1.25, 0.1, 'triangle', 0.1, base * 1.8);
  }

  playChain(combo = 2) {
    const base = 400 + combo * 50;
    this._tone(base, 0.14, 'square', 0.08, base * 1.6);
    this._tone(base * 1.5, 0.16, 'sine', 0.12, base * 2);
  }

  playFinal() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => {
      setTimeout(() => this._tone(n, 0.2, 'sine', 0.16), i * 90);
    });
  }

  playGameOver() {
    this._tone(320, 0.2, 'sawtooth', 0.1, 120);
    setTimeout(() => this._tone(180, 0.35, 'triangle', 0.12, 80), 120);
  }

  playClick() {
    this._tone(660, 0.05, 'sine', 0.1);
  }
}
