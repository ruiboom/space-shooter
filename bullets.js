import { GAME_H, GAME_W } from './util.js';
import { drawSprite } from './sprites.js';

const GLOW_COLORS = {
  player_bullet: 'rgba(255,236,39,0.45)',
  enemy_bullet: 'rgba(255,0,77,0.45)',
  enemy_bolt: 'rgba(255,119,168,0.5)',
};

export function createBulletPool() {
  return { items: [] };
}

export function spawnBullet(pool, opts) {
  pool.items.push({
    owner: opts.owner || 'player',
    x: opts.x, y: opts.y,
    vx: opts.vx || 0, vy: opts.vy || 0,
    w: opts.w || 6, h: opts.h || 8,
    damage: opts.damage ?? 1,
    spriteId: opts.spriteId || 'player_bullet',
    alive: true,
  });
}

// onHit(bullet) — consumer collides bullet vs targets, sets bullet.alive = false on hit
export function updateBullets(pool, dt, onHit) {
  const items = pool.items;
  for (let i = items.length - 1; i >= 0; i--) {
    const b = items[i];
    if (!b.alive) { items.splice(i, 1); continue; }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -10 || b.y > GAME_H + 10 || b.x < -10 || b.x > GAME_W + 10) {
      items.splice(i, 1);
      continue;
    }
    if (onHit) onHit(b);
    if (!b.alive) items.splice(i, 1);
  }
}

export function drawBullets(ctx, pool) {
  // additive glow halos first
  ctx.globalCompositeOperation = 'lighter';
  for (const b of pool.items) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 7);
    g.addColorStop(0, GLOW_COLORS[b.spriteId] || GLOW_COLORS.player_bullet);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 7, cy - 7, 14, 14);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const b of pool.items) drawSprite(ctx, b.spriteId, b.x, b.y);
}

export function clearBullets(pool) { pool.items.length = 0; }
