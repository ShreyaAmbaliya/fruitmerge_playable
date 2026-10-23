import Matter from 'matter-js';
import { FRUITS } from './fruit.js';

const { Engine, World, Bodies, Body, Events } = Matter;

/**
 * Matter.js world wrapper for the fruit jar.
 * Fruits are always dynamic. Static bodies then toggled back to dynamic
 * keep an invalid mass in Matter.js and never fall.
 */
export class PhysicsWorld {
  constructor() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1 },
      enableSleeping: false,
    });
    this.engine.enableSleeping = false;
    this.world = this.engine.world;

    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 8;

    this.walls = [];
    this.fruits = new Map(); // body.id -> meta
    this.pendingMerges = [];
    this._pendingKeys = new Set();
    this._collisionBound = false;
    this._acc = 0;

    this.bounds = { left: 0, right: 0, top: 0, bottom: 0, wall: 14 };
  }

  /**
   * Build or rebuild the jar walls for the given canvas layout (in world pixels).
   */
  setJarBounds({ left, right, top, bottom, wallThickness = 18 }) {
    if (this.walls.length) {
      World.remove(this.world, this.walls);
      this.walls = [];
    }

    this.bounds = { left, right, top, bottom, wall: wallThickness };
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    const width = right - left;
    const height = bottom - top;
    const t = wallThickness;
    const floorT = Math.max(40, wallThickness * 2.5);

    const floor = Bodies.rectangle(midX, bottom + floorT / 2 - 2, width + t * 4, floorT, {
      isStatic: true,
      friction: 1,
      restitution: 0.02,
      label: 'wall',
    });
    const leftWall = Bodies.rectangle(left - t / 2, midY, t, height + floorT * 2, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.02,
      label: 'wall',
    });
    const rightWall = Bodies.rectangle(right + t / 2, midY, t, height + floorT * 2, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.02,
      label: 'wall',
    });

    this.walls = [floor, leftWall, rightWall];
    World.add(this.world, this.walls);
  }

  bindCollisions() {
    if (this._collisionBound) return;
    this._collisionBound = true;

    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        if (a.label !== 'fruit' || b.label !== 'fruit') continue;

        const fa = this.fruits.get(a.id);
        const fb = this.fruits.get(b.id);
        if (!fa || !fb) continue;
        if (fa.level !== fb.level) continue;
        if (fa.mergeLocked || fb.mergeLocked) continue;
        if (!fa.canMerge || !fb.canMerge) continue;
        this._queueMerge(fa, fb);
      }
    });
  }

  _pairKey(a, b) {
    const ia = a.body.id;
    const ib = b.body.id;
    return ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`;
  }

  _queueMerge(a, b) {
    if (!a || !b || a === b) return;
    if (a.mergeLocked || b.mergeLocked) return;
    if (a.level !== b.level) return;
    const key = this._pairKey(a, b);
    if (this._pendingKeys.has(key)) return;
    this._pendingKeys.add(key);
    this.pendingMerges.push({
      a,
      b,
      x: (a.body.position.x + b.body.position.x) / 2,
      y: (a.body.position.y + b.body.position.y) / 2,
      level: a.level,
    });
  }

  /**
   * Same-level fruits that are already touching (including ones spawned
   * overlapping) are queued even if collisionStart already fired.
   */
  queueContactMerges() {
    const list = this.getFruitList();
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.canMerge || a.mergeLocked) continue;
      const ra = FRUITS[a.level].radius;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.canMerge || b.mergeLocked) continue;
        if (a.level !== b.level) continue;
        const dx = a.body.position.x - b.body.position.x;
        const dy = a.body.position.y - b.body.position.y;
        const reach = (ra + FRUITS[b.level].radius) * 1.02;
        if (dx * dx + dy * dy <= reach * reach) this._queueMerge(a, b);
      }
    }
  }

  createFruit(level, x, y, { canMerge = true, mergeDelay = 0 } = {}) {
    const def = FRUITS[level];
    const radius = def.radius;
    const density = 0.002 + level * 0.00035;
    const body = Bodies.circle(x, y, radius, {
      restitution: 0.08,
      friction: 0.45,
      frictionAir: 0.012,
      density,
      label: 'fruit',
      slop: 0.02,
    });

    if (!Number.isFinite(body.mass)) {
      Body.setMass(body, Math.PI * radius * radius * density);
    }

    const meta = {
      body,
      level,
      mergeLocked: false,
      canMerge: mergeDelay > 0 ? false : canMerge,
      mergeAt: mergeDelay > 0 ? performance.now() + mergeDelay : 0,
      bornAt: performance.now(),
      scaleX: 1,
      scaleY: 1,
      anim: null,
    };

    this.fruits.set(body.id, meta);
    World.add(this.world, body);
    return meta;
  }

  removeFruit(meta) {
    if (!meta || !meta.body) return;
    this.fruits.delete(meta.body.id);
    World.remove(this.world, meta.body);
  }

  /**
   * Process queued merges once per frame. Returns merge results for game logic.
   */
  consumeMerges() {
    if (!this.pendingMerges.length) return [];

    const results = [];
    const seen = new Set();

    for (const merge of this.pendingMerges) {
      const { a, b, x, y, level } = merge;
      if (!a || !b) continue;
      if (seen.has(a.body.id) || seen.has(b.body.id)) continue;
      if (!this.fruits.has(a.body.id) || !this.fruits.has(b.body.id)) continue;
      if (a.mergeLocked || b.mergeLocked) continue;

      a.mergeLocked = true;
      b.mergeLocked = true;
      seen.add(a.body.id);
      seen.add(b.body.id);

      results.push({ a, b, x, y, level });
    }

    this.pendingMerges = [];
    this._pendingKeys.clear();

    return results;
  }

  /** Enable merging once each fruit's spawn delay has elapsed. */
  unlockMerges(now = performance.now()) {
    for (const meta of this.fruits.values()) {
      if (!meta.canMerge && meta.mergeAt && now >= meta.mergeAt) {
        meta.canMerge = true;
      }
    }
  }

  update(deltaMs) {
    const step = 1000 / 60;
    this._acc += Math.min(Math.max(deltaMs, 0), 48);
    let steps = 0;
    while (this._acc >= step && steps < 3) {
      Engine.update(this.engine, step);
      this._acc -= step;
      steps += 1;
    }

    const { left, right, bottom } = this.bounds;
    for (const meta of this.fruits.values()) {
      const body = meta.body;
      const radius = FRUITS[meta.level].radius;
      const v = body.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > 16) {
        Body.setVelocity(body, { x: (v.x / speed) * 16, y: (v.y / speed) * 16 });
      }

      // Keep fruit inside the jar if a fast step ever tunnels past a wall.
      const minX = left + radius;
      const maxX = right - radius;
      const maxY = bottom - radius;
      let x = body.position.x;
      let y = body.position.y;
      let vx = body.velocity.x;
      let vy = body.velocity.y;
      let corrected = false;
      if (x < minX) {
        x = minX;
        vx = Math.abs(vx) * 0.2;
        corrected = true;
      } else if (x > maxX) {
        x = maxX;
        vx = -Math.abs(vx) * 0.2;
        corrected = true;
      }
      if (y > maxY) {
        y = maxY;
        vy = -Math.abs(vy) * 0.15;
        corrected = true;
      }
      if (corrected) {
        Body.setPosition(body, { x, y });
        Body.setVelocity(body, { x: vx, y: vy });
      }
    }
  }

  clearFruits() {
    for (const meta of [...this.fruits.values()]) {
      this.removeFruit(meta);
    }
    this.fruits.clear();
    this.pendingMerges = [];
    this._pendingKeys.clear();
    this._acc = 0;
  }

  getFruitList() {
    return [...this.fruits.values()];
  }

  /**
   * Returns true if any settled fruit center is above the danger line (with radius).
   */
  anyFruitAboveLine(dangerY, graceMs = 800) {
    const now = performance.now();
    for (const meta of this.fruits.values()) {
      if (!meta.canMerge) continue; // dropping fruit ignored
      if (now - meta.bornAt < graceMs) continue;
      const body = meta.body;
      // Use top of fruit circle
      if (body.position.y - FRUITS[meta.level].radius < dangerY) {
        // Only count if relatively settled (low velocity)
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed < 0.85) return true;
      }
    }
    return false;
  }

  destroy() {
    Events.off(this.engine, 'collisionStart');
    World.clear(this.world, false);
    Engine.clear(this.engine);
    this.fruits.clear();
    this.walls = [];
    this._collisionBound = false;
  }
}

export { Matter, Body };
