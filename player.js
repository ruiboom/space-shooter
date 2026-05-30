import { GAME_W, GAME_H, clamp, spawnParticles } from './util.js';
import { drawSprite, getSprite } from './sprites.js';
import { spawnBullet } from './bullets.js';

const BASE_SPEED = 110;
const BASE_COOLDOWN = 0.22;
const PLAYER_SPRITE = 'player';
const PLAYER_W = 18;
const PLAYER_H = 22;
const BULLET_W = 6;
const BULLET_H = 8;

export function createPlayer() {
  return {
    x: GAME_W / 2 - PLAYER_W / 2,
    y: GAME_H - 40,
    vx: 0, vy: 0,
    w: PLAYER_W, h: PLAYER_H,
    lives: 3,
    shield: 0,         // absorb hits granted by shield upgrade + pickups
    rapidTimer: 0,
    invulnTimer: 1.5,  // brief invuln on spawn
    fireTimer: 0,
    fireCooldown: BASE_COOLDOWN,
    speed: BASE_SPEED,
    upgrades: { fireRate: 0, spread: 0, shield: 0, speed: 0, damage: 0 },
    thrustPulse: 0,
    alive: true,
    deathTimer: 0,     // >0 while death animation playing (no input)
  };
}

export function resetPlayerPosition(p) {
  p.x = GAME_W / 2 - p.w / 2;
  p.y = GAME_H - 40;
  p.vx = 0; p.vy = 0;
  p.invulnTimer = 1.5;
  p.alive = true;
  p.deathTimer = 0;
}

export function updatePlayer(player, dt, input, bullets) {
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

  player.thrustPulse += dt * 30;

  if (player.rapidTimer > 0) player.rapidTimer -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;

  player.fireTimer -= dt;
  if (input.isFiring() && player.fireTimer <= 0) {
    fire(player, bullets);
    const cd = effectiveCooldown(player);
    player.fireTimer = cd;
  }
}

function effectiveCooldown(p) {
  let cd = p.fireCooldown;
  if (p.rapidTimer > 0) cd *= 0.55;
  return cd;
}

function fire(player, bullets) {
  const bulletSpeed = -340;
  const cx = player.x + player.w / 2 - BULLET_W / 2;
  const cy = player.y - BULLET_H / 2;
  const dmg = 1 + player.upgrades.damage;
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

export function drawPlayer(ctx, player) {
  if (!player.alive) return;
  // invuln blink
  const blink = player.invulnTimer > 0 && Math.floor(player.invulnTimer * 20) % 2 === 0;
  if (blink) return;
  // thrust flicker
  const thrust = getSprite('player_thrust');
  if (thrust && Math.floor(player.thrustPulse) % 2 === 0) {
    drawSprite(ctx, 'player_thrust', player.x + (player.w - thrust.w) / 2, player.y + player.h - 2);
  }
  drawSprite(ctx, PLAYER_SPRITE, player.x, player.y);
  // shield ring
  if (player.shield > 0) {
    ctx.strokeStyle = '#29ADFF';
    ctx.lineWidth = 1;
    const pad = 2;
    ctx.strokeRect(
      Math.floor(player.x) - pad,
      Math.floor(player.y) - pad,
      player.w + pad * 2,
      player.h + pad * 2
    );
  }
}

// Returns true if player fully dies (no lives left)
export function damagePlayer(player, particles) {
  player.alive = false;
  player.deathTimer = 1.2;
  player.lives--;
  spawnParticles(particles, player.x + player.w / 2, player.y + player.h / 2, 24, {
    speed: 140, life: 0.7, colorIdx: 9, size: 2,
  });
  spawnParticles(particles, player.x + player.w / 2, player.y + player.h / 2, 10, {
    speed: 70, life: 0.9, colorIdx: 8, size: 2,
  });
  return player.lives <= 0;
}

// Called by shop when an upgrade is purchased
export function applyUpgrade(player, upgrade) {
  upgrade.apply(player);
  player.upgrades[upgrade.id] = (player.upgrades[upgrade.id] || 0) + 1;
}
