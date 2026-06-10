import { GAME_W, GAME_H, PALETTE, clamp, lerp, spawnParticles, spawnExplosion, rng } from './util.js';
import { drawSprite, getSprite } from './sprites.js';
import { spawnBullet } from './bullets.js';

const BASE_SPEED = 115;
const BASE_COOLDOWN = 0.22;
// Global bullet damage scale: each shot is worth 20% of its old value, so
// everything takes ~5x more hits to kill. Missiles/bombs are unaffected.
const BULLET_DAMAGE_SCALE = 0.4;
// Hitbox is smaller than the 26x26 sprite — classic shmup grace.
const PLAYER_W = 18;
const PLAYER_H = 20;
const BULLET_W = 6;
const BULLET_H = 8;

export function createPlayer() {
  return {
    x: GAME_W / 2 - PLAYER_W / 2,
    y: GAME_H - 44,
    vx: 0, vy: 0,
    w: PLAYER_W, h: PLAYER_H,
    lives: 3,
    shield: 0,         // absorb hits granted by shield upgrade + pickups
    rapidTimer: 0,
    invulnTimer: 1.5,  // brief invuln on spawn
    fireTimer: 0,
    fireCooldown: BASE_COOLDOWN,
    speed: BASE_SPEED,
    upgrades: { fireRate: 0, spread: 0, shield: 0, speed: 0, damage: 0, autofire: 0, missileBay: 0, radar: 0 },
    autofire: false,
    missileSlots: 0,   // carriers bought in the shop
    missiles: 0,       // loaded missiles (≤ missileSlots)
    missileCooldown: 0,
    shuttleTimer: 0,   // wingman active while > 0
    shuttleQueued: false, // bought in shop; deploys at next wave start
    shuttleX: 0,       // wingman x, eased toward formation slot
    thrustPulse: 0,
    trailTimer: 0,
    bank: 0,           // -1..1 smoothed horizontal lean for banking sprites
    alive: true,
    deathTimer: 0,     // >0 while death animation playing (no input)
  };
}

export function resetPlayerPosition(p) {
  p.x = GAME_W / 2 - p.w / 2;
  p.y = GAME_H - 44;
  p.vx = 0; p.vy = 0;
  p.invulnTimer = 2.0;
  p.alive = true;
  p.deathTimer = 0;
  p.bank = 0;
  p.shuttleX = p.x - 34;
}

function shuttleSlotX(player) {
  // wingman flies off the port wing unless the player hugs the left wall
  return player.x < 56 ? player.x + player.w + 16 : player.x - 34;
}

export function updatePlayer(player, dt, input, bullets, particles) {
  if (!player.alive) {
    if (player.deathTimer > 0) {
      player.deathTimer -= dt;
      if (player.deathTimer <= 0 && player.lives > 0) {
        resetPlayerPosition(player);
      }
    }
    return;
  }
  const axis = input.getAxis();
  const spd = player.speed;
  player.vx = axis.x * spd;
  player.vy = axis.y * spd;
  player.x = clamp(player.x + player.vx * dt, 2, GAME_W - player.w - 2);
  player.y = clamp(player.y + player.vy * dt, 2, GAME_H - player.h - 2);

  // smoothed banking lean for the tilt sprites
  player.bank = lerp(player.bank, axis.x, Math.min(1, dt * 10));

  player.thrustPulse += dt * 30;

  if (player.rapidTimer > 0) player.rapidTimer -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (player.missileCooldown > 0) player.missileCooldown -= dt;
  if (player.shuttleTimer > 0) {
    player.shuttleTimer -= dt;
    player.shuttleX = lerp(player.shuttleX, shuttleSlotX(player), Math.min(1, dt * 6));
  }

  // engine ember trail
  if (particles) {
    player.trailTimer -= dt;
    if (player.trailTimer <= 0) {
      player.trailTimer = 0.045;
      const cx = player.x + player.w / 2;
      const ey = player.y + player.h + 4;
      spawnParticles(particles, cx + (rng() - 0.5) * 4, ey, 1, {
        speed: 30, life: 0.28, size: 2, kind: 'spark',
        baseAngle: Math.PI / 2, spread: 0.6,
      });
    }
  }

  player.fireTimer -= dt;
  if ((input.isFiring() || player.autofire) && player.fireTimer <= 0) {
    fire(player, bullets, particles);
    const cd = effectiveCooldown(player);
    player.fireTimer = cd;
  }
}

function effectiveCooldown(p) {
  let cd = p.fireCooldown;
  if (p.rapidTimer > 0) cd *= 0.55;
  return cd;
}

function firePattern(player, bullets, originX, originY) {
  const bulletSpeed = -340;
  const cx = originX - BULLET_W / 2;
  const cy = originY - BULLET_H / 2;
  const dmg = (1 + player.upgrades.damage) * BULLET_DAMAGE_SCALE;
  const base = { owner: 'player', damage: dmg, spriteId: 'player_bullet', w: BULLET_W, h: BULLET_H };
  spawnBullet(bullets, { ...base, x: cx, y: cy, vx: 0, vy: bulletSpeed });
  const spread = player.upgrades.spread;
  if (spread >= 1) {
    spawnBullet(bullets, { ...base, x: cx - 6, y: cy + 4, vx: -70, vy: bulletSpeed });
    spawnBullet(bullets, { ...base, x: cx + 6, y: cy + 4, vx: 70, vy: bulletSpeed });
  }
  if (spread >= 2) {
    spawnBullet(bullets, { ...base, x: cx - 10, y: cy + 8, vx: -140, vy: bulletSpeed * 0.9 });
    spawnBullet(bullets, { ...base, x: cx + 10, y: cy + 8, vx: 140, vy: bulletSpeed * 0.9 });
  }
}

function fire(player, bullets, particles) {
  firePattern(player, bullets, player.x + player.w / 2, player.y);
  // wingman doubles the entire pattern
  if (player.shuttleTimer > 0) {
    firePattern(player, bullets, player.shuttleX + 9, player.y + 8);
  }
  if (particles) {
    spawnParticles(particles, player.x + player.w / 2, player.y - 2, 2, {
      speed: 40, life: 0.12, size: 2, kind: 'spark',
      baseAngle: -Math.PI / 2, spread: 1.2,
    });
  }
}

// Procedural animated engine flame with additive glow.
function drawFlame(ctx, cx, topY, t, scale = 1) {
  const len = (7 + Math.floor((Math.sin(t * 1.7) + 1) * 2.5) + (Math.floor(t) % 2)) * scale;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, topY + 3, 0, cx, topY + 3, len + 4);
  g.addColorStop(0, 'rgba(255,236,39,0.55)');
  g.addColorStop(0.6, 'rgba(255,163,0,0.30)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 8, topY - 2, 16, len + 8);
  ctx.globalCompositeOperation = 'source-over';
  // layered flame body
  ctx.fillStyle = PALETTE[9];
  ctx.fillRect(Math.floor(cx - 3 * scale), topY, Math.floor(6 * scale), Math.floor(len * 0.6));
  ctx.fillStyle = PALETTE[10];
  ctx.fillRect(Math.floor(cx - 2 * scale), topY, Math.floor(4 * scale), Math.floor(len * 0.8));
  ctx.fillStyle = PALETTE[7];
  ctx.fillRect(Math.floor(cx - 1), topY, 2, Math.floor(len * 0.45));
  // tail tip
  ctx.fillStyle = PALETTE[9];
  ctx.fillRect(Math.floor(cx - 1), topY + Math.floor(len * 0.8), 2, Math.floor(len * 0.3));
}

function shipSpriteId(player) {
  if (player.bank < -0.45) return 'player_bank_l';
  if (player.bank > 0.45) return 'player_bank_r';
  return 'player';
}

export function drawPlayer(ctx, player) {
  if (!player.alive) return;
  // invuln blink
  const blink = player.invulnTimer > 0 && Math.floor(player.invulnTimer * 20) % 2 === 0;

  // wingman shuttle (drawn even while the main ship blinks)
  if (player.shuttleTimer > 0) {
    const expiring = player.shuttleTimer < 2 && Math.floor(player.shuttleTimer * 10) % 2 === 0;
    if (!expiring) {
      const ss = getSprite('shuttle');
      const sx = Math.floor(player.shuttleX);
      const sy = Math.floor(player.y + 8);
      drawFlame(ctx, sx + (ss ? ss.w / 2 : 9), sy + (ss ? ss.h : 16) - 1, player.thrustPulse * 1.3, 0.6);
      drawSprite(ctx, 'shuttle', sx, sy);
    }
  }

  if (blink) return;

  const id = shipSpriteId(player);
  const sprite = getSprite(id);
  const dx = sprite ? Math.floor((sprite.w - player.w) / 2) : 0;
  const dy = sprite ? Math.floor((sprite.h - player.h) / 2) : 0;
  const sx = player.x - dx;
  const sy = player.y - dy;
  const cx = player.x + player.w / 2;

  // engine flame behind hull
  drawFlame(ctx, cx, sy + (sprite ? sprite.h : player.h) - 2, player.thrustPulse);

  drawSprite(ctx, id, sx, sy);

  // shield bubble
  if (player.shield > 0) {
    const t = player.thrustPulse * 0.2;
    const r = Math.max(player.w, player.h) / 2 + 6 + Math.sin(t) * 1.5;
    const bx = player.x + player.w / 2;
    const by = player.y + player.h / 2;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(bx, by, r * 0.5, bx, by, r);
    g.addColorStop(0, 'rgba(41,173,255,0)');
    g.addColorStop(0.8, 'rgba(41,173,255,0.18)');
    g.addColorStop(1, 'rgba(41,173,255,0.45)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(41,173,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
}

// Returns true if player fully dies (no lives left)
export function damagePlayer(player, particles) {
  player.alive = false;
  player.deathTimer = 1.2;
  player.lives--;
  spawnExplosion(particles, player.x + player.w / 2, player.y + player.h / 2, {
    size: 1.8, ringColor: 12,
  });
  return player.lives <= 0;
}

// Called by shop when an upgrade is purchased
export function applyUpgrade(player, upgrade) {
  upgrade.apply(player);
  player.upgrades[upgrade.id] = (player.upgrades[upgrade.id] || 0) + 1;
}
