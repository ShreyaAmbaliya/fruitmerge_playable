import Matter from 'matter-js';
import { FRUITS } from './fruit.js';

const { Engine, World, Bodies, Body, Events, Composite, Query } = Matter;

/**
 * Matter.js world wrapper for the fruit jar.
 */
export class PhysicsWorld {
  constructor() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 0.95 },
      enableSleeping: true,
    });
    this.engine.timing.timeScale = 1;
    this.world = this.engine.world;

    // Higher iterations for stable stacking / less tunneling
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 8;

    this.walls = [];
    this.fruits = new Map(); // body.id -> { body, level, mergeLocked, settled }
    this.pendingMerges = [];
    this.mergePairs = new Set();
    this.onMerge = null;
    this._collisionBound = false;

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

        // Stable pair key (order-independent)
        const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        if (this.mergePairs.has(key)) continue;
        this.mergePairs.add(key);

        this.pendingMerges.push({
          a: fa,
          b: fb,
          x: (a.position.x + b.position.x) / 2,
          y: (a.position.y + b.position.y) / 2,
          level: fa.level,
        });
      }
    });
  }

  createFruit(level, x, y, { isStatic = false, canMerge = true } = {}) {
    const def = FRUITS[level];
    const radius = def.radius;
    const body = Bodies.circle(x, y, radius, {
      isStatic: false,
      restitution: 0.1,
      friction: 0.4,
      frictionAir: 0.02,
      density: 0.002 + level * 0.0003,
      label: 'fruit',
      sleepThreshold: 60,
      slop: 0.04,
    });

    // Cap max speed to reduce tunneling through jar walls
    body.plugin = body.plugin || {};

    if (isStatic) {
      Body.setStatic(body, true);
    }

    const meta = {
      body,
      level,
      mergeLocked: false,
      canMerge,
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
    // Prune mergePairs for removed bodies later; clear stale keys periodically
    if (this.mergePairs.size > 200) this.mergePairs.clear();

    return results;
  }

  clearMergeLocks() {
    // no-op placeholder; locks are permanent until body removal
  }

  update(deltaMs) {
    // Cap delta to avoid spiral of death / tunneling on tab blur
    const capped = Math.min(deltaMs, 1000 / 45);
    Engine.update(this.engine, capped);

    // Soft speed clamp
    for (const meta of this.fruits.values()) {
      const v = meta.body.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > 18) {
        Body.setVelocity(meta.body, {
          x: (v.x / speed) * 18,
          y: (v.y / speed) * 18,
        });
      }
    }
  }

  clearFruits() {
    for (const meta of [...this.fruits.values()]) {
      this.removeFruit(meta);
    }
    this.fruits.clear();
    this.pendingMerges = [];
    this.mergePairs.clear();
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

export { Matter, Body, Query, Composite };
