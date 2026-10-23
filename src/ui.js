import { drawFruit, getFruit } from './fruit.js';

const BEST_KEY = 'fpf_best_score';

export class UI {
  constructor() {
    this.scoreEl = document.getElementById('score-value');
    this.bestEl = document.getElementById('best-value');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalBestEl = document.getElementById('final-best');
    this.newRecordEl = document.getElementById('new-record');
    this.nextCanvas = document.getElementById('next-preview');
    this.nextCtx = this.nextCanvas.getContext('2d');
    this.logoCanvas = document.getElementById('logo-fruit');
    this.muteBtn = document.getElementById('btn-mute');
    this.pauseBtn = document.getElementById('btn-pause');

    this.overlays = {
      start: document.getElementById('overlay-start'),
      pause: document.getElementById('overlay-pause'),
      gameover: document.getElementById('overlay-gameover'),
    };

    this.best = loadBest();
    this.setBest(this.best);
    this.drawLogo();
  }

  setScore(n) {
    this.scoreEl.textContent = String(n);
  }

  setBest(n) {
    this.best = n;
    this.bestEl.textContent = String(n);
  }

  saveBest(score) {
    if (score > this.best) {
      this.best = score;
      this.setBest(score);
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        /* storage blocked */
      }
      return true;
    }
    return false;
  }

  drawNext(level) {
    const ctx = this.nextCtx;
    const w = this.nextCanvas.width;
    const h = this.nextCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const fruit = getFruit(level);
    const r = Math.min(w, h) * 0.38;
    drawFruit(ctx, level, w / 2, h / 2 + 2, r);
  }

  drawLogo() {
    if (!this.logoCanvas) return;
    const ctx = this.logoCanvas.getContext('2d');
    const w = this.logoCanvas.width;
    const h = this.logoCanvas.height;
    ctx.clearRect(0, 0, w, h);
    drawFruit(ctx, 4, w / 2, h / 2 + 4, 36);
  }

  showOverlay(name) {
    for (const [key, el] of Object.entries(this.overlays)) {
      if (!el) continue;
      el.classList.toggle('hidden', key !== name);
    }
  }

  hideOverlays() {
    for (const el of Object.values(this.overlays)) {
      if (el) el.classList.add('hidden');
    }
  }

  showStart() {
    this.showOverlay('start');
  }

  showPause() {
    this.showOverlay('pause');
  }

  showGameOver(score, isNewRecord) {
    this.finalScoreEl.textContent = String(score);
    this.finalBestEl.textContent = String(this.best);
    this.newRecordEl.classList.toggle('hidden', !isNewRecord);
    this.showOverlay('gameover');
  }

  setMuted(muted) {
    this.muteBtn.textContent = muted ? '🔇' : '🔊';
    this.muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    this.muteBtn.title = muted ? 'Unmute' : 'Mute';
  }

  setPaused(paused) {
    this.pauseBtn.textContent = paused ? '▶' : '⏸';
    this.pauseBtn.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
    this.pauseBtn.title = paused ? 'Resume' : 'Pause';
  }
}

function loadBest() {
  try {
    const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}
