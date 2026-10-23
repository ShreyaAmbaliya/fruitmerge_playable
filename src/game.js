import { Body } from './physics.js';
import { PhysicsWorld } from './physics.js';
import {
  FRUITS,
  FRUIT_COUNT,
  MERGE_POINTS,
  FINAL_POP_POINTS,
  drawFruit,
  randomSpawnLevel,
  getFruit,
} from './fruit.js';
import { Effects, startMergeAnim, startDropAnim, updateFruitAnim } from './effects.js';
import { AudioManager } from './audio.js';
import { UI } from './ui.js';

const STATES = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

/** Layout constants in logical design space (portrait). */
const DESIGN_W = 390;
const DESIGN_H = 700;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._alive = true;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.physics = new PhysicsWorld();
    this.effects = new Effects();
    this.audio = new AudioManager();
    this.ui = new UI();

    this.state = STATES.START;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;

    this.currentLevel = randomSpawnLevel();
    this.nextLevel = randomSpawnLevel();
    this.dropX = DESIGN_W / 2;
    this.dropping = null; // visual preview only — not a physics body
    this.dropReadyAt = 0;
    this.dangerTimer = 0;
    this.dangerGraceMs = 1100;

    this.layout = this._computeLayout(DESIGN_W, DESIGN_H);
    this.pointerActive = false;
    this.lastTs = 0;
    this.raf = 0;

    this._bindUI();
    this._bindInput();
    this._resize();

    this.physics.bindCollisions();
    this.ui.drawNext(this.nextLevel);
    this.ui.setMuted(this.audio.muted);
    this.ui.showStart();

    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 100));

    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  _computeLayout(w, h) {
    const marginX = 32;
    const jarTop = 118;
    const jarBottom = h - 86;
    const jarLeft = marginX;
    const jarRight = w - marginX;
    // Danger line sits below the largest fruit that can be dropped.
    const dangerY = jarTop + 78;
    const dropY = jarTop + 16;

    return {
      w,
      h,
      jarLeft,
      jarRight,
      jarTop,
      jarBottom,
      dangerY,
      dropY,
      wall: 16,
    };
  }

  destroy() {
    this._alive = false;
    this.state = 'destroyed';
    cancelAnimationFrame(this.raf);
    this.physics.destroy();
  }

  _resize() {
    if (!this._alive) return;
    const shell = document.getElementById('game-shell');
    const wrap = document.getElementById('canvas-wrap');
    const rect = wrap.getBoundingClientRect();

    // Fit 9:16-ish canvas into available space
    let cssW = rect.width;
    let cssH = rect.height;
    const targetRatio = DESIGN_W / DESIGN_H;
    const boxRatio = cssW / Math.max(1, cssH);

    if (boxRatio > targetRatio) {
      cssW = cssH * targetRatio;
    } else {
      cssH = cssW / targetRatio;
    }

    this.cssW = cssW;
    this.cssH = cssH;
    this.scale = cssW / DESIGN_W;

    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(DESIGN_W * this.dpr);
    this.canvas.height = Math.round(DESIGN_H * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.layout = this._computeLayout(DESIGN_W, DESIGN_H);
    this.physics.setJarBounds({
      left: this.layout.jarLeft,
      right: this.layout.jarRight,
      top: this.layout.jarTop - 40,
      bottom: this.layout.jarBottom,
      wallThickness: this.layout.wall,
    });

    // Keep drop X in bounds
    this.dropX = this._clampDropX(this.dropX);

    if (shell) {
      shell.style.setProperty('--canvas-w', `${cssW}px`);
    }
  }

  _bindUI() {
    document.getElementById('btn-play').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playClick();
      this.startGame();
    });
    document.getElementById('btn-again').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playClick();
      this.startGame();
    });
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.audio.unlock();
      this.resume();
    });
    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      this.audio.unlock();
      this.startGame();
    });
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.audio.unlock();
      if (this.state === STATES.PLAYING) this.pause();
      else if (this.state === STATES.PAUSED) this.resume();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playClick();
      if (this.state === STATES.START) {
        this.startGame();
      } else {
        this.startGame();
      }
    });
    document.getElementById('btn-mute').addEventListener('click', () => {
      this.audio.unlock();
      const muted = this.audio.toggleMute();
      this.ui.setMuted(muted);
    });
    document.getElementById('btn-drop').addEventListener('click', (e) => {
      e.preventDefault();
      this.audio.unlock();
      this.tryDrop();
    });
  }

  _bindInput() {
    const canvas = this.canvas;

    const toWorldX = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * DESIGN_W;
      return this._clampDropX(x);
    };

    const onPointerMove = (clientX) => {
      if (this.state !== STATES.PLAYING) return;
      this.dropX = toWorldX(clientX);
      this._syncPreviewX();
    };

    canvas.addEventListener('mousemove', (e) => {
      onPointerMove(e.clientX);
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.audio.unlock();
      if (this.state !== STATES.PLAYING) return;
      this.dropX = toWorldX(e.clientX);
      this.tryDrop();
    });

    // Touch
    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (!e.touches.length) return;
        e.preventDefault();
        this.audio.unlock();
        this.pointerActive = true;
        this.dropX = toWorldX(e.touches[0].clientX);
        this._syncPreviewX();
      },
      { passive: false }
    );

    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!e.touches.length) return;
        e.preventDefault();
        onPointerMove(e.touches[0].clientX);
      },
      { passive: false }
    );

    canvas.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        if (this.state === STATES.PLAYING && this.pointerActive) {
          // Tap to drop (if little movement — always drop on release for simplicity)
          this.tryDrop();
        }
        this.pointerActive = false;
      },
      { passive: false }
    );

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.audio.unlock();
        if (this.state === STATES.PLAYING) this.tryDrop();
        else if (this.state === STATES.START || this.state === STATES.GAMEOVER) this.startGame();
      } else if (e.code === 'Escape') {
        if (this.state === STATES.PLAYING) this.pause();
        else if (this.state === STATES.PAUSED) this.resume();
      }
    });

    // Prevent pull-to-refresh / scroll while interacting with shell
    document.getElementById('game-shell').addEventListener(
      'touchmove',
      (e) => {
        if (this.state === STATES.PLAYING || this.state === STATES.PAUSED) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  _clampDropX(x) {
    const r = getFruit(this.currentLevel).radius;
    const pad = 4;
    return Math.max(
      this.layout.jarLeft + r + pad,
      Math.min(this.layout.jarRight - r - pad, x)
    );
  }

  startGame() {
    if (!this._alive) return;
    this.physics.clearFruits();
    this.effects.clear();
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.dangerTimer = 0;
    this.dropping = null;
    this.dropReadyAt = 0;
    this.currentLevel = randomSpawnLevel();
    this.nextLevel = randomSpawnLevel();
    this.dropX = (this.layout.jarLeft + this.layout.jarRight) / 2;
    this.ui.setScore(0);
    this.ui.drawNext(this.nextLevel);
    this.ui.hideOverlays();
    this.ui.setPaused(false);
    this.state = STATES.PLAYING;
    this._spawnPreview();
  }

  pause() {
    if (this.state !== STATES.PLAYING) return;
    this.state = STATES.PAUSED;
    this.ui.setPaused(true);
    this.ui.showPause();
  }

  resume() {
    if (this.state !== STATES.PAUSED) return;
    this.state = STATES.PLAYING;
    this.ui.setPaused(false);
    this.ui.hideOverlays();
    this.lastTs = performance.now();
    if (!this.dropping) this._spawnPreview();
  }

  _spawnPreview() {
    if (this.dropping) return;
    // Visual-only preview (no Matter body). Creating as static then un-static
    // leaves mass invalid in Matter.js and fruits never fall.
    this.dropping = {
      level: this.currentLevel,
      x: this._clampDropX(this.dropX),
      y: this.layout.dropY,
      scaleX: 1.12,
      scaleY: 0.88,
      anim: { t: 0, duration: 180, type: 'drop' },
      isPreview: true,
    };
  }

  _syncPreviewX() {
    if (this.dropping?.isPreview) {
      this.dropping.x = this._clampDropX(this.dropX);
    }
  }

  tryDrop() {
    if (this.state !== STATES.PLAYING) return;
    if (performance.now() < this.dropReadyAt) return;
    if (!this.dropping?.isPreview) return;

    const x = this._clampDropX(this.dropX);
    const y = this.layout.dropY;
    const level = this.dropping.level;

    const meta = this.physics.createFruit(level, x, y, {
      canMerge: false,
      mergeDelay: 180,
    });
    Body.setVelocity(meta.body, { x: 0, y: 0.4 });
    Body.setAngularVelocity(meta.body, (Math.random() - 0.5) * 0.04);
    startDropAnim(meta);

    this.audio.playDrop();
    this.dropping = null;
    this.dropReadyAt = performance.now() + 450;

    this.currentLevel = this.nextLevel;
    this.nextLevel = randomSpawnLevel();
    this.ui.drawNext(this.nextLevel);
  }

  _processMerges() {
    let any = false;

    for (let wave = 0; wave < 6; wave++) {
      this.physics.queueContactMerges();
      const merges = this.physics.consumeMerges();
      if (!merges.length) break;
      any = true;

      for (const merge of merges) {
        const { a, b, x, y, level } = merge;

        this.physics.removeFruit(a);
        this.physics.removeFruit(b);

        const color = FRUITS[level].color;

        if (level >= FRUIT_COUNT - 1) {
          // Two Mega Melons pop. There is no fruit beyond the final level.
          const points = FINAL_POP_POINTS + this.combo * 100;
          this._addScore(points, x, y);
          this.effects.celebrate(x, y);
          this.effects.spawnPopup(x, y - 28, 'Mega Pop!', '#fdcb6e');
          this.effects.spawnPopup(x, y + 4, `+${points}`, '#e17055');
          this.audio.playFinal();
          this.combo += 1;
          this.comboTimer = 900;
          continue;
        }

        const nextLevel = level + 1;
        const newborn = this.physics.createFruit(nextLevel, x, y, {
          canMerge: true,
        });
        startMergeAnim(newborn);
        Body.setVelocity(newborn.body, { x: 0, y: -1.2 });

        const base = MERGE_POINTS[nextLevel] || 10;
        const points = base + this.combo * Math.floor(base * 0.25);
        this._addScore(points, x, y);
        this.effects.spawnParticles(x, y, color, 8 + nextLevel * 2);
        this.effects.spawnPopup(x, y - FRUITS[nextLevel].radius * 0.6, `+${points}`);

        if (nextLevel === FRUIT_COUNT - 1) {
          this.effects.celebrate(x, y);
          this.effects.spawnPopup(x, y - FRUITS[nextLevel].radius - 8, 'Mega Melon!', '#00b894');
          this.effects.addShake(7);
          this.audio.playFinal();
        } else if (this.combo > 0) {
          this.effects.addShake(2 + Math.min(this.combo, 5));
          this.audio.playChain(this.combo);
        } else {
          this.audio.playMerge(nextLevel);
        }

        this.combo += 1;
        this.comboTimer = 900;
      }
    }

    if (!any && this.comboTimer > 0) {
      this.comboTimer -= 16;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  _addScore(points, x, y) {
    this.score += points;
    this.ui.setScore(this.score);
  }

  _checkGameOver(dt) {
    if (this.state !== STATES.PLAYING) return;

    const overflowing = this.physics.anyFruitAboveLine(
      this.layout.dangerY,
      this.dangerGraceMs
    );

    if (overflowing) {
      this.dangerTimer += dt;
      // Require sustained overflow (~0.9s) so bounces/merges can resolve
      if (this.dangerTimer >= 900) {
        this._gameOver();
      }
    } else {
      this.dangerTimer = Math.max(0, this.dangerTimer - dt * 2);
    }
  }

  _gameOver() {
    this.state = STATES.GAMEOVER;
    this.dropping = null;
    const isNew = this.ui.saveBest(this.score);
    this.audio.playGameOver();
    this.ui.showGameOver(this.score, isNew);
    this.ui.setPaused(false);
  }

  _loop(ts) {
    if (!this._alive) return;
    const dt = this.lastTs ? Math.min(ts - this.lastTs, 50) : 16;
    this.lastTs = ts;

    if (this.state === STATES.PLAYING) {
      this.physics.unlockMerges(ts);
      this.physics.update(dt);
      this._processMerges();
      if (ts >= this.dropReadyAt && !this.dropping) this._spawnPreview();
      this._checkGameOver(dt);

      for (const meta of this.physics.getFruitList()) {
        updateFruitAnim(meta, dt);
      }
      if (this.dropping?.isPreview) {
        updateFruitAnim(this.dropping, dt);
        this.dropping.y = this.layout.dropY;
      }
    } else {
      for (const meta of this.physics.getFruitList()) {
        updateFruitAnim(meta, dt);
      }
    }

    this.effects.update(dt);
    this._render();
    this.raf = requestAnimationFrame(this._loop);
  }

  _render() {
    const ctx = this.ctx;
    const L = this.layout;
    const shake = this.state === STATES.PLAYING ? this.effects.getShakeOffset() : { x: 0, y: 0 };

    ctx.save();
    ctx.clearRect(0, 0, DESIGN_W, DESIGN_H);
    ctx.translate(shake.x, shake.y);

    this._drawBackground(ctx, L);
    this._drawJar(ctx, L);
    this._drawDangerLine(ctx, L);

    // Settled / falling fruits
    const fruits = this.physics.getFruitList();
    fruits.sort((a, b) => a.body.position.y - b.body.position.y);
    for (const meta of fruits) {
      const { body, level, scaleX, scaleY } = meta;
      drawFruit(ctx, level, body.position.x, body.position.y, FRUITS[level].radius, {
        scaleX,
        scaleY,
      });
    }

    // Aim preview + guide
    if (this.state === STATES.PLAYING && this.dropping?.isPreview) {
      this._drawAimGuide(ctx, L);
      const p = this.dropping;
      drawFruit(ctx, p.level, p.x, p.y, FRUITS[p.level].radius, {
        scaleX: p.scaleX,
        scaleY: p.scaleY,
      });
    }

    this.effects.draw(ctx);
    ctx.restore();
  }

  _drawBackground(ctx, L) {
    const g = ctx.createLinearGradient(0, 0, 0, L.h);
    g.addColorStop(0, '#fff6eb');
    g.addColorStop(0.45, '#ffe8d6');
    g.addColorStop(1, '#ffd6ba');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.w, L.h);

    // Soft decorative blobs
    ctx.fillStyle = 'rgba(255, 200, 160, 0.25)';
    ctx.beginPath();
    ctx.ellipse(L.w * 0.15, L.h * 0.2, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(L.w * 0.85, L.h * 0.7, 70, 50, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawJar(ctx, L) {
    const x = L.jarLeft;
    const y = L.jarTop;
    const w = L.jarRight - L.jarLeft;
    const h = L.jarBottom - L.jarTop;
    const r = 28;

    // Outer glass shadow
    ctx.save();
    ctx.shadowColor = 'rgba(180, 120, 80, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRectPath(ctx, x - 4, y - 8, w + 8, h + 16, r + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.restore();

    // Glass fill
    const glass = ctx.createLinearGradient(x, y, x + w, y);
    glass.addColorStop(0, 'rgba(255,255,255,0.45)');
    glass.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    glass.addColorStop(0.65, 'rgba(255,255,255,0.08)');
    glass.addColorStop(1, 'rgba(255,255,255,0.35)');
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = glass;
    ctx.fill();

    // Rim
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();

    // Side highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 30);
    ctx.lineTo(x + 10, y + h - 40);
    ctx.stroke();

    // Bottom lip
    ctx.strokeStyle = 'rgba(210, 150, 100, 0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 16, L.jarBottom - 4);
    ctx.lineTo(L.jarRight - 16, L.jarBottom - 4);
    ctx.stroke();

    // Jar mouth (open top)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRectPath(ctx, x + 8, y - 10, w - 16, 16, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 180, 140, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  _drawDangerLine(ctx, L) {
    const y = L.dangerY;
    const pulse = this.dangerTimer > 0 ? 0.5 + Math.sin(performance.now() / 120) * 0.35 : 0.55;

    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = `rgba(231, 76, 60, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.jarLeft + 12, y);
    ctx.lineTo(L.jarRight - 12, y);
    ctx.stroke();
    ctx.restore();

    ctx.font = '700 11px Nunito, system-ui, sans-serif';
    ctx.fillStyle = `rgba(192, 57, 43, ${0.45 + pulse * 0.3})`;
    ctx.textAlign = 'right';
    ctx.fillText('DANGER', L.jarRight - 14, y - 6);
  }

  _drawAimGuide(ctx, L) {
    const x = this.dropX;
    ctx.save();
    ctx.strokeStyle = 'rgba(225, 112, 85, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(x, L.dropY + getFruit(this.currentLevel).radius + 4);
    ctx.lineTo(x, L.jarBottom - 8);
    ctx.stroke();
    ctx.restore();
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
