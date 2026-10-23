/**
 * Visual feedback: particles, score popups, screen shake, merge squash.
 */

export class Effects {
  constructor() {
    this.particles = [];
    this.popups = [];
    this.shake = 0;
    this.shakeDecay = 0.88;
    this.celebrations = [];
  }

  spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        size: 3 + Math.random() * 5,
        color,
      });
    }
  }

  spawnPopup(x, y, text, color = '#e17055') {
    this.popups.push({
      x,
      y,
      text: String(text),
      color,
      life: 1,
      vy: -1.2,
    });
  }

  addShake(amount = 4) {
    this.shake = Math.min(14, this.shake + amount);
  }

  celebrate(x, y) {
    this.celebrations.push({
      x,
      y,
      life: 1,
      rings: 0,
    });
    this.spawnParticles(x, y, '#ffeaa7', 24);
    this.spawnParticles(x, y, '#55efc4', 16);
    this.addShake(8);
  }

  update(dt) {
    const step = dt / 16.67;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += 0.08 * step;
      p.life -= p.decay * step;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy * step * 2;
      p.life -= 0.016 * step;
      if (p.life <= 0) this.popups.splice(i, 1);
    }

    for (let i = this.celebrations.length - 1; i >= 0; i--) {
      const c = this.celebrations[i];
      c.life -= 0.012 * step;
      c.rings += 0.04 * step;
      if (c.life <= 0) this.celebrations.splice(i, 1);
    }

    this.shake *= Math.pow(this.shakeDecay, step);
    if (this.shake < 0.1) this.shake = 0;
  }

  getShakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shake * 2,
      y: (Math.random() - 0.5) * this.shake * 2,
    };
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of this.popups) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = `800 ${Math.round(18 + (1 - p.life) * 6)}px Nunito, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    for (const c of this.celebrations) {
      ctx.globalAlpha = c.life * 0.7;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 20 + (c.rings + i * 0.35) * 80, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? '#ffeaa7' : '#55efc4';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles = [];
    this.popups = [];
    this.celebrations = [];
    this.shake = 0;
  }
}

/**
 * Apply a brief squash-and-stretch animation to a fruit meta object.
 */
export function startMergeAnim(meta) {
  meta.anim = {
    t: 0,
    duration: 280,
    type: 'birth',
  };
  meta.scaleX = 0.3;
  meta.scaleY = 0.3;
}

export function startDropAnim(meta) {
  meta.anim = {
    t: 0,
    duration: 180,
    type: 'drop',
  };
  meta.scaleX = 1.15;
  meta.scaleY = 0.85;
}

export function updateFruitAnim(meta, dt) {
  if (!meta.anim) {
    meta.scaleX = 1;
    meta.scaleY = 1;
    return;
  }
  meta.anim.t += dt;
  const p = Math.min(1, meta.anim.t / meta.anim.duration);
  const ease = 1 - Math.pow(1 - p, 3);

  if (meta.anim.type === 'birth') {
    // Pop in with overshoot
    const over = ease < 0.7 ? ease / 0.7 : 1 + Math.sin(((ease - 0.7) / 0.3) * Math.PI) * 0.12;
    const s = 0.3 + over * 0.7;
    meta.scaleX = s * (1 + Math.sin(ease * Math.PI) * 0.15);
    meta.scaleY = s * (1 - Math.sin(ease * Math.PI) * 0.1);
  } else if (meta.anim.type === 'drop') {
    meta.scaleX = 1.15 - 0.15 * ease;
    meta.scaleY = 0.85 + 0.15 * ease;
  }

  if (p >= 1) {
    meta.anim = null;
    meta.scaleX = 1;
    meta.scaleY = 1;
  }
}
