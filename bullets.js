import { GAME_H, GAME_W } from './util.js';
import { drawSprite } from './sprites.js';

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
  for (const b of pool.items) drawSprite(ctx, b.spriteId, b.x, b.y);
}

export function clearBullets(pool) { pool.items.length = 0; }
