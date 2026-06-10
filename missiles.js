import { GAME_W, GAME_H, aabb, spawnParticles } from './util.js';
import { getSprite } from './sprites.js';

// Homing missiles: launch slow, accelerate, steer toward the nearest enemy
// and detonate with splash damage. Ammo is bought in the shop (missile bays).

const TURN_RATE = 5.5;     // rad/s
const ACCEL = 380;
const MAX_SPEED = 290;
const LAUNCH_SPEED = 90;

export function createMissilePool() {
  return { items: [] };
}

export function fireMissile(pool, x, y) {
  pool.items.push({
    x, y,
    angle: -Math.PI / 2, // up
    speed: LAUNCH_SPEED,
    t: 0,
    trailT: 0,
    alive: true,
  });
}

function nearestTarget(m, enemies) {
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x + e.w / 2 - m.x, e.y + e.h / 2 - m.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// onDetonate(missile, directHit|null) — main applies AoE damage + visuals.
export function updateMissiles(pool, dt, enemies, obstacles, particles, onDetonate) {
  const items = pool.items;
  for (let i = items.length - 1; i >= 0; i--) {
    const m = items[i];
    m.t += dt;

    // steer toward nearest enemy after a short launch arc
    if (m.t > 0.12) {
      const target = nearestTarget(m, enemies);
      if (target) {
        const want = Math.atan2((target.y + target.h / 2) - m.y, (target.x + target.w / 2) - m.x);
        let diff = want - m.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = TURN_RATE * dt;
        m.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
      }
    }
    m.speed = Math.min(MAX_SPEED, m.speed + ACCEL * dt);
    m.x += Math.cos(m.angle) * m.speed * dt;
    m.y += Math.sin(m.angle) * m.speed * dt;

    // exhaust trail
    m.trailT -= dt;
    if (m.trailT <= 0) {
      m.trailT = 0.02;
      spawnParticles(particles, m.x - Math.cos(m.angle) * 5, m.y - Math.sin(m.angle) * 5, 1, {
        speed: 14, life: 0.3, size: 2, kind: 'spark',
        baseAngle: m.angle + Math.PI, spread: 0.5,
      });
    }

    // out of bounds
    if (m.x < -20 || m.x > GAME_W + 20 || m.y < -30 || m.y > GAME_H + 20) {
      items.splice(i, 1);
      continue;
    }

    // contact: enemies, then destroyable obstacles
    const box = { x: m.x - 4, y: m.y - 4, w: 8, h: 8 };
    let hit = null;
    for (const e of enemies) {
      if (e.alive && aabb(box, e)) { hit = e; break; }
    }
    if (!hit && obstacles) {
      for (const o of obstacles) {
        if (o.alive && aabb(box, o)) { hit = o; break; }
      }
    }
    if (hit) {
      items.splice(i, 1);
      onDetonate(m, hit);
    }
  }
}

export function drawMissiles(ctx, pool) {
  const sprite = getSprite('missile');
  for (const m of pool.items) {
    // glow
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 8);
    g.addColorStop(0, 'rgba(255,163,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(m.x - 8, m.y - 8, 16, 16);
    ctx.globalCompositeOperation = 'source-over';
    // rotated sprite (sprite points up = -PI/2)
    if (sprite) {
      ctx.save();
      ctx.translate(Math.floor(m.x), Math.floor(m.y));
      ctx.rotate(m.angle + Math.PI / 2);
      ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2);
      ctx.restore();
    }
  }
}

export function clearMissiles(pool) { pool.items.length = 0; }
