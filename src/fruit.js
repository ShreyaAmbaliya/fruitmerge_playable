/**
 * Fruit definitions and Canvas drawing for Fruit Pop Fusion.
 * 8-level evolution chain with original character artwork.
 */

export const FRUIT_COUNT = 8;
export const MAX_SPAWN_LEVEL = 3; // Only cherries → oranges can spawn randomly

/** Points awarded when creating this fruit via merge (index = level). */
export const MERGE_POINTS = [0, 10, 20, 40, 80, 160, 320, 640, 1280];

/** Bonus when two final (melon) fruits collide and pop. */
export const FINAL_POP_POINTS = 2000;

export const FRUITS = [
  {
    id: 'cherry',
    name: 'Cherry',
    radius: 16,
    color: '#e74c3c',
    accent: '#c0392b',
    leaf: '#27ae60',
    face: 'happy',
  },
  {
    id: 'strawberry',
    name: 'Berry',
    radius: 22,
    color: '#ff6b81',
    accent: '#ee5a6f',
    leaf: '#2ecc71',
    face: 'cute',
  },
  {
    id: 'blueberry',
    name: 'Blue Pop',
    radius: 28,
    color: '#5f7cff',
    accent: '#3d5afe',
    leaf: '#7bed9f',
    face: 'wink',
  },
  {
    id: 'orange',
    name: 'Citrus',
    radius: 35,
    color: '#ff9f43',
    accent: '#ee8230',
    leaf: '#26de81',
    face: 'happy',
  },
  {
    id: 'apple',
    name: 'Crisp',
    radius: 43,
    color: '#ff4757',
    accent: '#c44569',
    leaf: '#2ed573',
    face: 'smile',
  },
  {
    id: 'peach',
    name: 'Peachy',
    radius: 52,
    color: '#ffa502',
    accent: '#ff7f50',
    blush: '#ff9ff3',
    leaf: '#7bed9f',
    face: 'blush',
  },
  {
    id: 'pineapple',
    name: 'Spike',
    radius: 62,
    color: '#feca57',
    accent: '#f39c12',
    leaf: '#20bf6b',
    face: 'cool',
  },
  {
    id: 'melon',
    name: 'Mega Melon',
    radius: 74,
    color: '#7bed9f',
    accent: '#2ed573',
    stripe: '#26de81',
    leaf: '#009432',
    face: 'star',
  },
];

export function getFruit(level) {
  return FRUITS[Math.max(0, Math.min(level, FRUITS.length - 1))];
}

export function randomSpawnLevel() {
  // Weighted toward smaller fruits
  const weights = [40, 30, 20, 10]; // levels 0–3
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

/**
 * Draw a fruit character centered at (cx, cy) with given radius and squash scale.
 */
export function drawFruit(ctx, level, cx, cy, radius, options = {}) {
  const fruit = getFruit(level);
  const sx = options.scaleX ?? 1;
  const sy = options.scaleY ?? 1;
  const alpha = options.alpha ?? 1;
  const r = radius ?? fruit.radius;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  ctx.globalAlpha = alpha;

  // Soft ground shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fill();

  switch (fruit.id) {
    case 'cherry':
      drawCherry(ctx, fruit, r);
      break;
    case 'strawberry':
      drawStrawberry(ctx, fruit, r);
      break;
    case 'blueberry':
      drawBlueberry(ctx, fruit, r);
      break;
    case 'orange':
      drawOrange(ctx, fruit, r);
      break;
    case 'apple':
      drawApple(ctx, fruit, r);
      break;
    case 'peach':
      drawPeach(ctx, fruit, r);
      break;
    case 'pineapple':
      drawPineapple(ctx, fruit, r);
      break;
    case 'melon':
      drawMelon(ctx, fruit, r);
      break;
    default:
      drawRoundFruit(ctx, fruit, r);
  }

  ctx.restore();
}

function drawRoundBody(ctx, fruit, r, opts = {}) {
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(fruit.color, 0.35));
  grad.addColorStop(0.55, fruit.color);
  grad.addColorStop(1, fruit.accent || darken(fruit.color, 0.15));

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Specular highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.35, r * 0.28, r * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();

  if (opts.ring) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1.5, r * 0.04);
    ctx.stroke();
  }
}

function drawFace(ctx, fruit, r) {
  const eyeY = -r * 0.08;
  const eyeSpread = r * 0.28;
  const eyeR = Math.max(2, r * 0.09);
  const style = fruit.face || 'happy';

  // Eyes
  if (style === 'wink') {
    // Left wink
    ctx.beginPath();
    ctx.moveTo(-eyeSpread - eyeR, eyeY);
    ctx.quadraticCurveTo(-eyeSpread, eyeY - eyeR * 0.8, -eyeSpread + eyeR, eyeY);
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.lineCap = 'round';
    ctx.stroke();
    // Right eye
    drawEye(ctx, eyeSpread, eyeY, eyeR);
  } else if (style === 'cool') {
    // Sunglasses
    ctx.fillStyle = '#2d3436';
    roundRect(ctx, -eyeSpread - eyeR * 1.4, eyeY - eyeR * 1.1, eyeR * 2.6, eyeR * 2, eyeR * 0.5);
    ctx.fill();
    roundRect(ctx, eyeSpread - eyeR * 1.2, eyeY - eyeR * 1.1, eyeR * 2.6, eyeR * 2, eyeR * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-eyeSpread + eyeR * 1.2, eyeY);
    ctx.lineTo(eyeSpread - eyeR * 1.2, eyeY);
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.stroke();
  } else if (style === 'star') {
    drawEye(ctx, -eyeSpread, eyeY, eyeR * 1.1);
    drawEye(ctx, eyeSpread, eyeY, eyeR * 1.1);
    // Sparkle cheeks
    ctx.fillStyle = '#ffeaa7';
    drawStar(ctx, -r * 0.55, r * 0.15, r * 0.1, 5);
    drawStar(ctx, r * 0.55, r * 0.15, r * 0.1, 5);
  } else {
    drawEye(ctx, -eyeSpread, eyeY, eyeR);
    drawEye(ctx, eyeSpread, eyeY, eyeR);
  }

  // Blush
  if (style === 'blush' || style === 'cute' || fruit.blush) {
    ctx.fillStyle = fruit.blush || 'rgba(255,182,193,0.55)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.48, r * 0.12, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.48, r * 0.12, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  const mouthY = r * 0.28;
  ctx.strokeStyle = '#2d3436';
  ctx.fillStyle = '#2d3436';
  ctx.lineWidth = Math.max(1.5, r * 0.055);
  ctx.lineCap = 'round';

  if (style === 'smile' || style === 'happy' || style === 'star' || style === 'cool') {
    ctx.beginPath();
    ctx.arc(0, mouthY - r * 0.05, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (style === 'cute' || style === 'blush' || style === 'wink') {
    ctx.beginPath();
    ctx.ellipse(0, mouthY, r * 0.12, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEye(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#2d3436';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawLeaf(ctx, fruit, r, ox, oy, rot = -0.4) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.35, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = fruit.leaf || '#2ecc71';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, 0);
  ctx.lineTo(r * 0.25, 0);
  ctx.strokeStyle = darken(fruit.leaf || '#2ecc71', 0.2);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawStem(ctx, fruit, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.quadraticCurveTo(r * 0.15, -r * 1.15, r * 0.05, -r * 1.25);
  ctx.strokeStyle = '#6d4c41';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawCherry(ctx, fruit, r) {
  // Twin cherries look — single body for physics, drawn as one cute cherry
  drawRoundBody(ctx, fruit, r);
  drawStem(ctx, fruit, r);
  drawLeaf(ctx, fruit, r, r * 0.25, -r * 1.05, 0.5);
  drawFace(ctx, fruit, r);
}

function drawStrawberry(ctx, fruit, r) {
  // Heart-ish strawberry silhouette
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.bezierCurveTo(r * 1.05, r * 0.25, r * 0.95, -r * 0.55, 0, -r * 0.7);
  ctx.bezierCurveTo(-r * 0.95, -r * 0.55, -r * 1.05, r * 0.25, 0, r * 0.95);
  ctx.closePath();

  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(fruit.color, 0.25));
  grad.addColorStop(1, fruit.accent);
  ctx.fillStyle = grad;
  ctx.fill();

  // Seeds
  ctx.fillStyle = '#ffeaa7';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const rr = r * (0.35 + (i % 3) * 0.12);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * rr * 0.7, Math.sin(a) * rr * 0.55 - r * 0.05, r * 0.05, r * 0.08, a, 0, Math.PI * 2);
    ctx.fill();
  }

  // Leaf crown
  for (let i = -2; i <= 2; i++) {
    drawLeaf(ctx, fruit, r * 0.7, i * r * 0.18, -r * 0.75, i * 0.35);
  }
  drawFace(ctx, fruit, r * 0.9);
}

function drawBlueberry(ctx, fruit, r) {
  drawRoundBody(ctx, fruit, r, { ring: true });
  // Crown dimple
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = fruit.accent;
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.18, -r * 0.55 + Math.sin(a) * r * 0.18, r * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = darken(fruit.accent, 0.1);
    ctx.fill();
  }
  drawFace(ctx, fruit, r);
}

function drawOrange(ctx, fruit, r) {
  drawRoundBody(ctx, fruit, r);
  // Segment lines
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15);
    ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  drawStem(ctx, fruit, r * 0.7);
  drawLeaf(ctx, fruit, r, r * 0.2, -r * 0.95, 0.6);
  drawFace(ctx, fruit, r);
}

function drawApple(ctx, fruit, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.75);
  ctx.bezierCurveTo(r * 1.05, -r * 0.9, r * 1.1, r * 0.6, 0, r * 0.95);
  ctx.bezierCurveTo(-r * 1.1, r * 0.6, -r * 1.05, -r * 0.9, 0, -r * 0.75);
  ctx.closePath();

  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(fruit.color, 0.3));
  grad.addColorStop(0.6, fruit.color);
  grad.addColorStop(1, fruit.accent);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.25, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  drawStem(ctx, fruit, r);
  drawLeaf(ctx, fruit, r, r * 0.3, -r * 1.0, 0.8);
  drawFace(ctx, fruit, r);
}

function drawPeach(ctx, fruit, r) {
  drawRoundBody(ctx, fruit, r);
  // Crease
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.7);
  ctx.quadraticCurveTo(r * 0.08, 0, 0, r * 0.75);
  ctx.strokeStyle = 'rgba(200,80,60,0.35)';
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.stroke();
  drawStem(ctx, fruit, r * 0.85);
  drawLeaf(ctx, fruit, r, r * 0.25, -r * 0.95, 0.5);
  drawFace(ctx, fruit, r);
}

function drawPineapple(ctx, fruit, r) {
  // Oval body
  ctx.beginPath();
  ctx.ellipse(0, r * 0.08, r * 0.78, r * 0.92, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(fruit.color, 0.25));
  grad.addColorStop(1, fruit.accent);
  ctx.fillStyle = grad;
  ctx.fill();

  // Diamond pattern
  ctx.strokeStyle = 'rgba(180,100,20,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  const rows = 4;
  const cols = 3;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * r * 0.45 + (row % 2) * r * 0.22;
      const y = (row - rows / 2) * r * 0.35 + r * 0.1;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.12);
      ctx.lineTo(x + r * 0.18, y);
      ctx.lineTo(x, y + r * 0.12);
      ctx.lineTo(x - r * 0.18, y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Leaf crown
  for (let i = -3; i <= 3; i++) {
    ctx.save();
    ctx.translate(i * r * 0.12, -r * 0.85);
    ctx.rotate(i * 0.22);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.12, -r * 0.35, 0, -r * 0.55);
    ctx.quadraticCurveTo(-r * 0.12, -r * 0.35, 0, 0);
    ctx.fillStyle = i % 2 === 0 ? fruit.leaf : lighten(fruit.leaf, 0.15);
    ctx.fill();
    ctx.restore();
  }
  drawFace(ctx, fruit, r * 0.85);
}

function drawMelon(ctx, fruit, r) {
  drawRoundBody(ctx, fruit, r);
  // Stripes
  ctx.strokeStyle = fruit.stripe || darken(fruit.color, 0.15);
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.22, -r * 0.85);
    ctx.quadraticCurveTo(i * r * 0.28, 0, i * r * 0.18, r * 0.85);
    ctx.stroke();
  }
  // Stem nub
  ctx.beginPath();
  ctx.arc(0, -r * 0.9, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = fruit.leaf;
  ctx.fill();
  drawFace(ctx, fruit, r);
}

function drawRoundFruit(ctx, fruit, r) {
  drawRoundBody(ctx, fruit, r);
  drawFace(ctx, fruit, r);
}

function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - amount))},${Math.round(g * (1 - amount))},${Math.round(b * (1 - amount))})`;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function roundRect(ctx, x, y, w, h, rad) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawStar(ctx, x, y, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
