import { GAME_H, PALETTE, rng, aabb } from './util.js';
import { drawSprite } from './sprites.js';

export const POWERUP_TYPES = {
  shield:  { spriteId: 'powerup_shield',  w: 14, h: 14, color: 12, glow: 'rgba(41,173,255,' },
  rapid:   { spriteId: 'powerup_rapid',   w: 14, h: 14, color: 9,  glow: 'rgba(255,163,0,' },
  bomb:    { spriteId: 'powerup_bomb',    w: 14, h: 14, color: 8,  glow: 'rgba(255,0,77,' },
  shuttle: { spriteId: 'powerup_shuttle', w: 14, h: 14, color: 11, glow: 'rgba(0,228,54,' },
  life:    { spriteId: 'powerup_life',    w: 14, h: 12, color: 14, glow: 'rgba(255,119,168,' },
};

const DROP_CHANCE = 0.12;

export function maybeSpawnPowerup(powerups, enemy) {
  if (rng() > DROP_CHANCE) return;
  const roll = rng();
  let type;
  if (roll < 0.36)      type = 'shield';
  else if (roll < 0.68) type = 'rapid';
  else if (roll < 0.84) type = 'bomb';
  else if (roll < 0.93) type = 'shuttle';
  else                  type = 'life';
  spawnPowerup(powerups, enemy.x + enemy.w / 2 - 7, enemy.y + enemy.h / 2 - 7, type);
}

export function spawnPowerup(powerups, x, y, type) {
  const def = POWERUP_TYPES[type];
  powerups.push({
    type, x, y,
    vx: 0, vy: 50,
    w: def.w, h: def.h,
    spriteId: def.spriteId,
    t: rng() * 6,
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
    const def = POWERUP_TYPES[p.type];
    const bob = Math.sin(p.t * 6) * 1.5;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2 + bob;
    const pulse = (Math.sin(p.t * 5) + 1) / 2;

    // pulsing aura
    ctx.globalCompositeOperation = 'lighter';
    const r = 9 + pulse * 3;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, def.glow + (0.35 + pulse * 0.2) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // orbiting sparks
    ctx.fillStyle = PALETTE[def.color];
    for (let i = 0; i < 3; i++) {
      const a = p.t * 3 + (i * Math.PI * 2) / 3;
      const ox = Math.cos(a) * 10;
      const oy = Math.sin(a) * 10 * 0.7;
      ctx.fillRect(Math.floor(cx + ox) - 1, Math.floor(cy + oy) - 1, 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    drawSprite(ctx, p.spriteId, p.x, p.y + bob);
  }
}

export function applyPowerup(type, player) {
  switch (type) {
    case 'shield':  player.shield++; break;
    case 'rapid':   player.rapidTimer = Math.max(player.rapidTimer, 8.0); break;
    case 'life':    player.lives = Math.min(player.lives + 1, 5); break;
    case 'bomb':    break; // detonation handled by main.js (needs game state)
    case 'shuttle':
      if (player.shuttleTimer <= 0) player.shuttleX = player.x - 34;
      player.shuttleTimer = Math.max(player.shuttleTimer, 10.0);
      break;
  }
}

export function powerupLabel(type) {
  switch (type) {
    case 'shield':  return 'SHIELD +1';
    case 'rapid':   return 'RAPID FIRE!';
    case 'life':    return 'EXTRA LIFE';
    case 'bomb':    return 'MEGA BOMB!';
    case 'shuttle': return 'WINGMAN DEPLOYED';
  }
  return '';
}

export function powerupToastColor(type) {
  switch (type) {
    case 'shield':  return 12;
    case 'rapid':   return 9;
    case 'life':    return 14;
    case 'bomb':    return 8;
    case 'shuttle': return 11;
  }
  return 10;
}
