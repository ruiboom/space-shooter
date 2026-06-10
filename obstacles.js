import { GAME_W, GAME_H, PALETTE, rng, spawnExplosion, spawnParticles } from './util.js';

// Big drifting obstacles: asteroids and burnt-out wrecks are destroyable
// (HP scales with wave), armored hulks are not. All of them block bullets
// from both sides and hurt the player on contact.

// --- procedural sprite baking (variety beats hand-drawn here) ---

function bakeAsteroid(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 1;
  // irregular rocky blob: overlapping circles
  g.fillStyle = PALETTE[5];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rr = r * (0.55 + rng() * 0.35);
    g.beginPath();
    g.arc(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3, rr * 0.7, 0, Math.PI * 2);
    g.fill();
  }
  // lit face
  g.fillStyle = PALETTE[6];
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(cx - r * 0.25 + (rng() - 0.5) * r * 0.5, cy - r * 0.3 + (rng() - 0.5) * r * 0.4, r * (0.12 + rng() * 0.2), 0, Math.PI * 2);
    g.fill();
  }
  // brown mineral veins
  g.fillStyle = PALETTE[4];
  for (let i = 0; i < 4; i++) {
    g.fillRect(cx + (rng() - 0.5) * r, cy + (rng() - 0.5) * r, 2 + rng() * 3, 2);
  }
  // craters
  g.fillStyle = PALETTE[0];
  g.globalAlpha = 0.55;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(cx + (rng() - 0.5) * r * 1.1, cy + (rng() - 0.5) * r * 1.1, r * (0.1 + rng() * 0.14), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  return c;
}

function bakeWreck(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  // broken hull: main slab + snapped-off prow
  g.fillStyle = PALETTE[5];
  g.fillRect(2, h * 0.25, w - 4, h * 0.55);
  g.fillRect(w * 0.3, 2, w * 0.4, h - 4);
  g.fillStyle = PALETTE[13];
  g.fillRect(4, h * 0.3, w - 8, 3);
  g.fillRect(w * 0.35, 4, 3, h - 8);
  // hull plating lines
  g.fillStyle = PALETTE[1];
  for (let i = 1; i < 4; i++) {
    g.fillRect(2, h * 0.25 + i * (h * 0.55 / 4), w - 4, 1);
  }
  // burnt holes
  g.fillStyle = PALETTE[0];
  for (let i = 0; i < 5; i++) {
    const hw = 3 + rng() * 6;
    g.fillRect(4 + rng() * (w - 12), h * 0.28 + rng() * (h * 0.45), hw, 2 + rng() * 4);
  }
  // glowing embers inside the holes
  g.fillStyle = PALETTE[9];
  for (let i = 0; i < 4; i++) {
    g.fillRect(6 + rng() * (w - 14), h * 0.32 + rng() * (h * 0.4), 2, 2);
  }
  g.fillStyle = PALETTE[8];
  g.fillRect(w * 0.5, h * 0.5, 2, 2);
  return c;
}

function bakeHulk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  // solid armored slab — visually distinct so players learn it can't die
  g.fillStyle = PALETTE[1];
  g.fillRect(0, 3, w, h - 6);
  g.fillRect(3, 0, w - 6, h);
  g.fillStyle = PALETTE[13];
  g.fillRect(3, 5, w - 6, h - 10);
  g.fillStyle = PALETTE[1];
  g.fillRect(6, 8, w - 12, h - 16);
  // warning stripes
  g.fillStyle = PALETTE[10];
  for (let x = 4; x < w - 6; x += 8) {
    g.fillRect(x, h / 2 - 2, 4, 4);
  }
  g.fillStyle = PALETTE[8];
  for (let x = 8; x < w - 6; x += 8) {
    g.fillRect(x, h / 2 - 2, 4, 4);
  }
  // rivets
  g.fillStyle = PALETTE[6];
  for (const [rx, ry] of [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]]) {
    g.fillRect(rx, ry, 2, 2);
  }
  return c;
}

// --- spawning / simulation ---

export function spawnObstacle(obstacles, waveIndex, kind) {
  let canvas, w, h, hp, points, indestructible = false;
  if (kind === 'asteroid') {
    const size = 26 + Math.floor(rng() * 18);
    canvas = bakeAsteroid(size);
    w = size; h = size;
    hp = 4 + Math.floor(waveIndex * 0.8);
    points = 150 + waveIndex * 10;
  } else if (kind === 'wreck') {
    w = 36 + Math.floor(rng() * 14); h = 26 + Math.floor(rng() * 8);
    canvas = bakeWreck(w, h);
    hp = 8 + Math.floor(waveIndex * 1.2);
    points = 300 + waveIndex * 15;
  } else { // hulk
    w = 38 + Math.floor(rng() * 12); h = 24 + Math.floor(rng() * 8);
    canvas = bakeHulk(w, h);
    hp = Infinity; points = 0; indestructible = true;
  }
  obstacles.push({
    kind, canvas, indestructible,
    x: 14 + rng() * (GAME_W - w - 28),
    y: -h - 6,
    vx: (rng() - 0.5) * 12,
    vy: 26 + rng() * 18,
    w, h, hp, maxHp: hp, points,
    spin: kind === 'asteroid' ? (rng() - 0.5) * 0.9 : 0,
    angle: rng() * Math.PI * 2,
    flashTimer: 0,
    alive: true,
  });
}

export function updateObstacles(obstacles, dt) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (!o.alive) { obstacles.splice(i, 1); continue; }
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.angle += o.spin * dt;
    if (o.flashTimer > 0) o.flashTimer -= dt;
    if (o.y > GAME_H + 40 || o.x < -80 || o.x > GAME_W + 80) {
      obstacles.splice(i, 1);
    }
  }
}

export function drawObstacles(ctx, obstacles) {
  for (const o of obstacles) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    ctx.save();
    ctx.translate(Math.floor(cx), Math.floor(cy));
    if (o.spin) ctx.rotate(o.angle);
    ctx.drawImage(o.canvas, -o.w / 2, -o.h / 2);
    if (o.flashTimer > 0) {
      ctx.globalAlpha = 0.7;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = PALETTE[7];
      ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // damage smolder on heavily hit destroyables
    if (!o.indestructible && o.hp < o.maxHp * 0.5) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = PALETTE[9];
      ctx.globalAlpha = 0.5 + Math.sin(o.angle * 7 + o.y * 0.2) * 0.2;
      ctx.fillRect(Math.floor(cx) - 1, Math.floor(cy) - 1, 2, 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

// Returns points awarded (0 unless destroyed). Indestructible hulks just spark.
export function damageObstacle(o, damage, particles) {
  if (!o.alive) return 0;
  if (o.indestructible) {
    o.flashTimer = 0.05;
    spawnParticles(particles, o.x + o.w / 2, o.y, 3, {
      speed: 60, life: 0.2, size: 1, kind: 'spark',
    });
    return 0;
  }
  o.hp -= damage;
  o.flashTimer = 0.07;
  // epsilon: fractional bullet damage (0.2/shot) must not leave FP residue
  if (o.hp <= 1e-6) {
    o.alive = false;
    spawnExplosion(particles, o.x + o.w / 2, o.y + o.h / 2, {
      size: o.kind === 'wreck' ? 1.8 : 1.4,
    });
    return o.points;
  }
  return 0;
}
