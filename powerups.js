import { GAME_H, rng, aabb } from './util.js';
import { drawSprite } from './sprites.js';

export const POWERUP_TYPES = {
  shield: { spriteId: 'powerup_shield', w: 12, h: 12, color: 12 },
  rapid:  { spriteId: 'powerup_rapid',  w: 12, h: 12, color: 9 },
  life:   { spriteId: 'powerup_life',   w: 12, h: 10, color: 14 },
};

const DROP_CHANCE = 0.14;

export function maybeSpawnPowerup(powerups, enemy) {
  if (rng() > DROP_CHANCE) return;
  const roll = rng();
  let type;
  if (roll < 0.5)       type = 'shield';
  else if (roll < 0.92) type = 'rapid';
  else                  type = 'life';
  spawnPowerup(powerups, enemy.x + enemy.w / 2 - 3, enemy.y + enemy.h / 2 - 3, type);
}

export function spawnPowerup(powerups, x, y, type) {
  const def = POWERUP_TYPES[type];
  powerups.push({
    type, x, y,
    vx: 0, vy: 55,
    w: def.w, h: def.h,
    spriteId: def.spriteId,
    t: 0,
  });
}

export function updatePowerups(powerups, dt, player, onPickup) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.t += dt;
    if (p.y > GAME_H + 10) {
      powerups.splice(i, 1);
      continue;
    }
    if (player.alive && aabb(p, player)) {
      onPickup(p);
      powerups.splice(i, 1);
    }
  }
}

export function drawPowerups(ctx, powerups) {
  for (const p of powerups) {
    const bob = Math.floor(Math.sin(p.t * 6) * 1);
    drawSprite(ctx, p.spriteId, p.x, p.y + bob);
  }
}

export function applyPowerup(type, player) {
  switch (type) {
    case 'shield': player.shield++; break;
    case 'rapid':  player.rapidTimer = Math.max(player.rapidTimer, 8.0); break;
    case 'life':   player.lives = Math.min(player.lives + 1, 5); break;
  }
}

export function powerupLabel(type) {
  switch (type) {
    case 'shield': return 'SHIELD +1';
    case 'rapid':  return 'RAPID FIRE!';
    case 'life':   return 'EXTRA LIFE';
  }
  return '';
}
