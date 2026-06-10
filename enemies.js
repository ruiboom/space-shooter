import { GAME_W, GAME_H, PALETTE, spawnExplosion, spawnParticles, clamp, rng } from './util.js';
import { drawSprite, drawSpriteFlash, hasSprite } from './sprites.js';

export const ENEMY_TYPES = {
  grunt:  { hp: 1,   w: 24, h: 20, points: 100,  spriteId: 'enemy_grunt' },
  sine:   { hp: 1,   w: 24, h: 24, points: 150,  spriteId: 'enemy_sine' },
  spiral: { hp: 2,   w: 24, h: 24, points: 200,  spriteId: 'enemy_spiral' },
  turret: { hp: 3,   w: 24, h: 18, points: 300,  spriteId: 'turret' },
  diver:  { hp: 1,   w: 16, h: 22, points: 150,  spriteId: 'enemy_diver' },
  weaver: { hp: 2,   w: 24, h: 20, points: 200,  spriteId: 'enemy_weaver' },
  hunter: { hp: 3,   w: 24, h: 24, points: 350,  spriteId: 'enemy_hunter' },
  warden: { hp: 35,  w: 64, h: 44, points: 2000, spriteId: 'enemy_grunt' },
  boss:   { hp: 110, w: 96, h: 60, points: 5000, spriteId: 'enemy_grunt' },
};

export function createEnemy(type, x, y, pattern, overrides = {}) {
  const def = ENEMY_TYPES[type];
  const e = {
    type, x, y, vx: 0, vy: 0,
    w: def.w, h: def.h,
    hp: def.hp, maxHp: def.hp,
    spriteId: def.spriteId,
    points: def.points,
    pattern,
    patternState: null,
    fireTimer: 0,
    fireCooldown: 0,
    onTerrain: false,
    flashTimer: 0,
    alive: true,
    spawnedThisWave: true,
    animSeed: Math.floor(rng() * 4),
    ...overrides,
  };
  pattern.init(e);
  return e;
}

// ===== Patterns =====
// All patterns accept a `mul` speed/aggression multiplier from the wave table.

export function straightPattern({ speed = 55, vx = 0, fireInterval = 0, bulletSpeed = 95 } = {}) {
  return {
    init(e) {
      e.vx = vx; e.vy = speed;
      if (fireInterval > 0) e.fireTimer = 0.8 + (e.x % 1.3);
    },
    update(e, dt, ctx) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (fireInterval > 0 && ctx && ctx.player && ctx.player.alive && e.y > 4 && e.y < GAME_H * 0.6) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = fireInterval;
          ctx.spawnEnemyBullet(e.x + e.w / 2 - 3, e.y + e.h, 0, bulletSpeed);
        }
      }
    },
  };
}

export function sinePattern({ speed = 45, amplitude = 50, frequency = 2, baseX, phase = 0 } = {}) {
  return {
    init(e) {
      e.patternState = { t: phase, baseX: baseX ?? e.x };
      e.vy = speed;
    },
    update(e, dt) {
      const ps = e.patternState;
      ps.t += dt;
      e.x = ps.baseX + Math.sin(ps.t * frequency) * amplitude;
      e.y += e.vy * dt;
    },
  };
}

export function spiralPattern({ centerX, centerY, radius = 70, angularSpeed = 2.2, driftY = 26, startAngle = 0 } = {}) {
  return {
    init(e) {
      e.patternState = {
        t: 0, angle: startAngle,
        cx: centerX, cy: centerY,
        r: radius, phase: 'spiral',
      };
    },
    update(e, dt) {
      const ps = e.patternState;
      ps.t += dt;
      if (ps.phase === 'spiral') {
        ps.angle += angularSpeed * dt;
        ps.r = Math.max(6, radius - ps.t * 14);
        ps.cy += driftY * dt;
        e.x = ps.cx + Math.cos(ps.angle) * ps.r - e.w / 2;
        e.y = ps.cy + Math.sin(ps.angle) * ps.r - e.h / 2;
        if (ps.r <= 8) {
          ps.phase = 'dive';
          e.vx = 0; e.vy = 130;
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
    },
  };
}

export function turretPattern({ fireInterval = 2.0, firstDelay = 0.8, bulletSpeed = 110 } = {}) {
  return {
    init(e) {
      e.fireTimer = firstDelay;
      e.fireCooldown = fireInterval;
      e.onTerrain = true;
    },
    update(e, dt, ctx) {
      e.y += ctx.terrainSpeed * dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && ctx.player && ctx.player.alive && e.y > -4 && e.y < GAME_H) {
        e.fireTimer = e.fireCooldown;
        const px = ctx.player.x + ctx.player.w / 2;
        const py = ctx.player.y + ctx.player.h / 2;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = px - ex, dy = py - ey;
        const mag = Math.hypot(dx, dy) || 1;
        ctx.spawnEnemyBullet(ex - 3, ey - 3, (dx / mag) * bulletSpeed, (dy / mag) * bulletSpeed);
      }
    },
  };
}

// Kamikaze: cruises in, pauses to lock on (blinking telegraph), then dashes
// straight at the player's position.
export function diverPattern({ cruiseSpeed = 50, dashSpeed = 220, lockY = 60 } = {}) {
  return {
    init(e) {
      e.patternState = { phase: 'cruise', lockY: lockY + (e.x % 50), aimT: 0.4 };
      e.vy = cruiseSpeed;
    },
    update(e, dt, ctx) {
      const ps = e.patternState;
      if (ps.phase === 'cruise') {
        e.y += e.vy * dt;
        if (e.y >= ps.lockY) ps.phase = 'aim';
      } else if (ps.phase === 'aim') {
        ps.aimT -= dt;
        // blinking telegraph before the dash
        e.flashTimer = Math.floor(ps.aimT * 12) % 2 === 0 ? 0.05 : 0;
        if (ps.aimT <= 0) {
          e.flashTimer = 0;
          const p = ctx.player;
          let dx = 0, dy = 1;
          if (p && p.alive) {
            dx = (p.x + p.w / 2) - (e.x + e.w / 2);
            dy = (p.y + p.h / 2) - (e.y + e.h / 2);
            const mag = Math.hypot(dx, dy) || 1;
            dx /= mag; dy /= mag;
          }
          e.vx = dx * dashSpeed;
          e.vy = Math.max(0.35, dy) * dashSpeed;
          ps.phase = 'dash';
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
    },
  };
}

// Wasp: weaves on a sine while dropping stingers straight down.
export function weaverPattern({ speed = 38, amplitude = 60, frequency = 2, baseX, phase = 0, fireInterval = 1.7, bulletSpeed = 100 } = {}) {
  return {
    init(e) {
      e.patternState = { t: phase, baseX: baseX ?? e.x };
      e.vy = speed;
      e.fireTimer = 0.9 + phase * 0.5;
    },
    update(e, dt, ctx) {
      const ps = e.patternState;
      ps.t += dt;
      e.x = ps.baseX + Math.sin(ps.t * frequency) * amplitude;
      e.y += e.vy * dt;
      if (ctx && ctx.player && ctx.player.alive && e.y > 4 && e.y < GAME_H * 0.75) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = fireInterval;
          ctx.spawnEnemyBullet(e.x + e.w / 2 - 3, e.y + e.h, 0, bulletSpeed);
        }
      }
    },
  };
}

// Mantis: settles into a hover band, strafes toward the player's column and
// fires aimed twin bolts. Slowly sinks so it eventually leaves the screen.
export function hunterPattern({ hoverY = 56, strafe = 65, fireInterval = 1.9, bulletSpeed = 135 } = {}) {
  return {
    init(e) {
      e.patternState = { settled: false, hoverY: hoverY + (e.x % 30) };
      e.vy = 75;
      e.fireTimer = 1.1;
    },
    update(e, dt, ctx) {
      const ps = e.patternState;
      if (!ps.settled) {
        e.y += e.vy * dt;
        if (e.y >= ps.hoverY) ps.settled = true;
        return;
      }
      const p = ctx.player;
      if (p && p.alive) {
        const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
        e.x += clamp(dx, -1, 1) * Math.min(Math.abs(dx), strafe) * dt;
      }
      e.y += 9 * dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && p && p.alive) {
        e.fireTimer = fireInterval;
        const ex = e.x + e.w / 2, ey = e.y + e.h;
        const dx = (p.x + p.w / 2) - ex, dy = (p.y + p.h / 2) - ey;
        const mag = Math.hypot(dx, dy) || 1;
        const nx = dx / mag, ny = dy / mag;
        ctx.spawnEnemyBullet(ex - 3 - 4, ey, nx * bulletSpeed, ny * bulletSpeed, 'enemy_bolt');
        ctx.spawnEnemyBullet(ex - 3 + 4, ey, nx * bulletSpeed, ny * bulletSpeed, 'enemy_bolt');
      }
    },
  };
}

// Mid-boss: sweeps near the top, alternating radial bursts and aimed fans.
export function wardenPattern({ mul = 1 } = {}) {
  return {
    init(e) {
      e.patternState = {
        t: 0, entered: false,
        baseY: 30, centerX: GAME_W / 2,
        sweepAmp: 60, sweepFreq: 0.8,
        fireT: 1.6, fireMode: 0,
      };
      e.vy = 35;
    },
    update(e, dt, ctx) {
      const ps = e.patternState;
      ps.t += dt;
      if (!ps.entered) {
        e.y += e.vy * dt;
        if (e.y >= ps.baseY) { e.y = ps.baseY; ps.entered = true; e.vy = 0; ps.t = 0; }
        return;
      }
      e.x = ps.centerX + Math.sin(ps.t * ps.sweepFreq) * ps.sweepAmp - e.w / 2;
      ps.fireT -= dt;
      if (ps.fireT <= 0 && ctx.player && ctx.player.alive) {
        const cx = e.x + e.w / 2, cy = e.y + e.h - 4;
        ps.fireMode = (ps.fireMode + 1) % 2;
        if (ps.fireMode === 0) {
          // radial burst (lower half)
          const n = 8, speed = 100 * mul;
          for (let i = 0; i < n; i++) {
            const a = (Math.PI / n) * i + Math.PI / (n * 2);
            ctx.spawnEnemyBullet(cx - 3, cy, Math.cos(a) * speed, Math.abs(Math.sin(a)) * speed);
          }
          ps.fireT = 1.6 / mul;
        } else {
          // aimed 3-shot fan
          const px = ctx.player.x + ctx.player.w / 2;
          const py = ctx.player.y + ctx.player.h / 2;
          const base = Math.atan2(py - cy, px - cx);
          const speed = 140 * mul;
          for (let i = -1; i <= 1; i++) {
            const a = base + i * 0.22;
            ctx.spawnEnemyBullet(cx - 3, cy, Math.cos(a) * speed, Math.sin(a) * speed, 'enemy_bolt');
          }
          ps.fireT = 1.2 / mul;
        }
      }
    },
  };
}

// Final boss: phase 1 sweeps with spread/aimed/side shots; below half health
// it enrages — faster sweeps, bullet rings and rapid aimed twins.
export function bossPattern({ mul = 1 } = {}) {
  return {
    init(e) {
      e.patternState = {
        t: 0, entered: false,
        baseY: 26, centerX: GAME_W / 2,
        sweepAmp: 62, sweepFreq: 0.7,
        fireT: 1.6, fireMode: 0, enraged: false,
      };
      e.vx = 0; e.vy = 32;
    },
    update(e, dt, ctx) {
      const ps = e.patternState;
      ps.t += dt;
      if (!ps.entered) {
        e.y += e.vy * dt;
        if (e.y >= ps.baseY) {
          e.y = ps.baseY; ps.entered = true; e.vy = 0; ps.t = 0;
        }
        return;
      }
      if (!ps.enraged && e.hp <= e.maxHp / 2) {
        ps.enraged = true;
        ps.sweepFreq = 1.05;
        ps.fireT = Math.min(ps.fireT, 0.5);
      }
      e.x = ps.centerX + Math.sin(ps.t * ps.sweepFreq) * ps.sweepAmp - e.w / 2;
      ps.fireT -= dt;
      if (ps.fireT <= 0 && ctx.player && ctx.player.alive) {
        const cx = e.x + e.w / 2, cy = e.y + e.h;
        const px = ctx.player.x + ctx.player.w / 2;
        const py = ctx.player.y + ctx.player.h / 2;
        ps.fireMode = (ps.fireMode + 1) % 3;
        if (!ps.enraged) {
          if (ps.fireMode === 0) {
            const spread = 5, speed = 125 * mul;
            for (let i = 0; i < spread; i++) {
              const a = (Math.PI / 2) + (i - (spread - 1) / 2) * 0.2;
              ctx.spawnEnemyBullet(cx - 3, cy, Math.cos(a) * speed, Math.sin(a) * speed);
            }
            ps.fireT = 1.1;
          } else if (ps.fireMode === 1) {
            const dx = px - cx, dy = py - cy;
            const mag = Math.hypot(dx, dy) || 1, speed = 165 * mul;
            ctx.spawnEnemyBullet(cx - 3, cy, dx / mag * speed, dy / mag * speed);
            ps.fireT = 0.32;
          } else {
            const speed = 115 * mul;
            ctx.spawnEnemyBullet(e.x, cy, -45, speed);
            ctx.spawnEnemyBullet(e.x + e.w, cy, 45, speed);
            ps.fireT = 0.9;
          }
        } else {
          if (ps.fireMode === 0) {
            // full bullet ring
            const n = 14, speed = 105 * mul;
            for (let i = 0; i < n; i++) {
              const a = (Math.PI * 2 / n) * i + ps.t;
              ctx.spawnEnemyBullet(cx - 3, e.y + e.h / 2, Math.cos(a) * speed, Math.sin(a) * speed);
            }
            ps.fireT = 1.3;
          } else if (ps.fireMode === 1) {
            // rapid aimed twins
            const dx = px - cx, dy = py - cy;
            const mag = Math.hypot(dx, dy) || 1, speed = 175 * mul;
            ctx.spawnEnemyBullet(cx - 9, cy, dx / mag * speed, dy / mag * speed, 'enemy_bolt');
            ctx.spawnEnemyBullet(cx + 3, cy, dx / mag * speed, dy / mag * speed, 'enemy_bolt');
            ps.fireT = 0.28;
          } else {
            // wide 7-shot fan
            const spread = 7, speed = 130 * mul;
            for (let i = 0; i < spread; i++) {
              const a = (Math.PI / 2) + (i - (spread - 1) / 2) * 0.19;
              ctx.spawnEnemyBullet(cx - 3, cy, Math.cos(a) * speed, Math.sin(a) * speed);
            }
            ps.fireT = 0.95;
          }
        }
      }
    },
  };
}

// ===== Updates / draw =====

let animClock = 0;

export function updateEnemies(enemies, dt, ctx) {
  animClock += dt;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) { enemies.splice(i, 1); continue; }
    e.pattern.update(e, dt, ctx);
    if (e.flashTimer > 0) e.flashTimer -= dt;

    // despawn offscreen (not for bosses)
    if (e.type === 'boss' || e.type === 'warden') continue;
    if (e.y > GAME_H + 30 || e.x < -60 || e.x > GAME_W + 60) {
      enemies.splice(i, 1);
    }
  }
}

// Pick the current animation frame: 4-step cycle a → b → c → b (falls back
// to a 2-frame or static sprite when variants are missing). Each enemy has a
// random phase offset so a formation never animates in lockstep.
const FRAME_SUFFIX = ['', '_b', '_c', '_b'];

function frameId(e) {
  const step = (Math.floor(animClock * 8) + (e.animSeed || 0)) % 4;
  let id = e.spriteId + FRAME_SUFFIX[step];
  if (!hasSprite(id)) id = step % 2 === 1 && hasSprite(e.spriteId + '_b') ? e.spriteId + '_b' : e.spriteId;
  return id;
}

export function drawEnemies(ctx, enemies) {
  for (const e of enemies) {
    if (e.type === 'boss') {
      drawBoss(ctx, e);
      drawBossHealthBar(ctx, e);
      continue;
    }
    if (e.type === 'warden') {
      drawWarden(ctx, e);
      drawBossHealthBar(ctx, e);
      continue;
    }
    if (e.flashTimer > 0) {
      drawSpriteFlash(ctx, e.spriteId, e.x, e.y);
    } else {
      drawSprite(ctx, frameId(e), e.x, e.y);
    }
  }
}

// Glowing eye helper for boss faces
function drawGlowEye(ctx, x, y, r, pulse, color) {
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * (1 + pulse * 0.4));
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * (1 + pulse * 0.4), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PALETTE[8];
  ctx.fillRect(Math.floor(x - 2), Math.floor(y - 2), 4, 4);
  ctx.fillStyle = PALETTE[7];
  ctx.fillRect(Math.floor(x - 1), Math.floor(y - 1), 2, 2);
}

// Final boss: the DREADMAW — armored skull-ship with glowing eyes and fangs.
function drawBoss(ctx, e) {
  const x = Math.floor(e.x), y = Math.floor(e.y);
  const w = e.w, h = e.h;
  const t = e.patternState ? e.patternState.t : 0;
  const enraged = e.patternState && e.patternState.enraged;
  const pulse = (Math.sin(t * (enraged ? 9 : 4)) + 1) / 2;

  // engine glow halo behind hull
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w * 0.65);
  halo.addColorStop(0, enraged ? 'rgba(255,0,77,0.30)' : 'rgba(126,37,83,0.25)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 20, y - 14, w + 40, h + 28);
  ctx.globalCompositeOperation = 'source-over';

  // outer armor with spikes
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(x, y + 6, w, h - 12);
  ctx.fillRect(x + 6, y, w - 12, h);
  // spikes along the top
  for (let i = 0; i < 5; i++) {
    const sx = x + 10 + i * Math.floor((w - 24) / 4);
    ctx.fillRect(sx, y - 6, 4, 6);
  }
  // wing blades
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(x - 10, y + h / 2 - 4, 10, 14);
  ctx.fillRect(x + w, y + h / 2 - 4, 10, 14);
  ctx.fillStyle = PALETTE[8];
  ctx.fillRect(x - 10, y + h / 2 + 10, 10, 3);
  ctx.fillRect(x + w, y + h / 2 + 10, 10, 3);

  // inner hull
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(x + 6, y + 4, w - 12, h - 8);
  ctx.fillStyle = PALETTE[1];
  ctx.fillRect(x + 12, y + 8, w - 24, h - 16);

  // skull face plate
  const fw = 44, fh = 32;
  const fx = x + Math.floor((w - fw) / 2), fy = y + Math.floor((h - fh) / 2) - 2;
  ctx.fillStyle = PALETTE[6];
  ctx.fillRect(fx + 4, fy, fw - 8, fh - 8);
  ctx.fillRect(fx, fy + 4, fw, fh - 16);
  ctx.fillStyle = PALETTE[7];
  ctx.fillRect(fx + 6, fy + 2, fw - 12, fh - 12);

  // eye sockets
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(fx + 8, fy + 6, 10, 8);
  ctx.fillRect(fx + fw - 18, fy + 6, 10, 8);
  drawGlowEye(ctx, fx + 13, fy + 10, 6, pulse, 'rgba(255,0,77,0.9)');
  drawGlowEye(ctx, fx + fw - 13, fy + 10, 6, pulse, 'rgba(255,0,77,0.9)');

  // nasal slit + fanged jaw
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(fx + fw / 2 - 2, fy + 14, 4, 4);
  ctx.fillRect(fx + 6, fy + fh - 12, fw - 12, 6);
  ctx.fillStyle = PALETTE[7];
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(fx + 8 + i * 7, fy + fh - 12, 3, pulse > 0.5 ? 5 : 4);
  }

  // bottom cannon pods
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(x + 4, y + h - 10, 12, 12);
  ctx.fillRect(x + w - 16, y + h - 10, 12, 12);
  ctx.fillStyle = PALETTE[9];
  ctx.fillRect(x + 8, y + h - 2, 4, 4);
  ctx.fillRect(x + w - 12, y + h - 2, 4, 4);

  if (e.flashTimer > 0) {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = PALETTE[7];
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
}

// Mid-boss: the WARDEN — a void eye in a serrated purple shell.
function drawWarden(ctx, e) {
  const x = Math.floor(e.x), y = Math.floor(e.y);
  const w = e.w, h = e.h;
  const t = e.patternState ? e.patternState.t : 0;
  const pulse = (Math.sin(t * 5) + 1) / 2;

  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * 0.6);
  halo.addColorStop(0, 'rgba(131,118,156,0.30)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 16, y - 12, w + 32, h + 24);
  ctx.globalCompositeOperation = 'source-over';

  // serrated shell
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(x, y + 6, w, h - 12);
  ctx.fillRect(x + 6, y, w - 12, h);
  ctx.fillStyle = PALETTE[13];
  for (let i = 0; i < 4; i++) {
    const sx = x + 8 + i * Math.floor((w - 20) / 3);
    ctx.fillRect(sx, y - 5, 4, 5);
    ctx.fillRect(sx, y + h, 4, 5);
  }
  ctx.fillStyle = PALETTE[1];
  ctx.fillRect(x + 8, y + 6, w - 16, h - 12);

  // central eye
  const cx = x + w / 2, cy = y + h / 2;
  ctx.fillStyle = PALETTE[7];
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE[8];
  ctx.beginPath();
  ctx.arc(cx, cy, 8 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE[0];
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  drawGlowEye(ctx, cx, cy, 9, pulse, 'rgba(255,0,77,0.55)');

  // veins
  ctx.strokeStyle = PALETTE[14];
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - 13, cy); ctx.lineTo(x + 8, cy - 6);
  ctx.moveTo(cx + 13, cy); ctx.lineTo(x + w - 8, cy - 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (e.flashTimer > 0) {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = PALETTE[7];
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
}

function drawBossHealthBar(ctx, boss) {
  const x = Math.floor(boss.x);
  const y = Math.floor(boss.y - 8);
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(x - 1, y - 1, boss.w + 2, 5);
  ctx.fillStyle = '#5F574F';
  ctx.fillRect(x, y, boss.w, 3);
  const pct = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = pct > 0.5 ? '#FF004D' : '#FFA300';
  ctx.fillRect(x, y, Math.floor(boss.w * pct), 3);
}

// Returns points awarded (0 if not killed)
export function damageEnemy(e, damage, particles) {
  if (!e.alive) return 0;
  e.hp -= damage;
  e.flashTimer = 0.08;
  // epsilon: fractional bullet damage (0.2/shot) must not leave FP residue
  if (e.hp <= 1e-6) {
    e.alive = false;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const size =
      e.type === 'boss' ? 3 :
      e.type === 'warden' ? 2.4 :
      (e.type === 'turret' || e.type === 'hunter') ? 1.5 : 1;
    spawnExplosion(particles, cx, cy, { size });
    if (size >= 2) {
      // chained secondary blasts for bosses
      spawnExplosion(particles, cx - e.w / 3, cy - e.h / 4, { size: 1.4 });
      spawnExplosion(particles, cx + e.w / 3, cy + e.h / 4, { size: 1.4 });
      spawnParticles(particles, cx, cy, 20, { speed: 200, life: 0.9, colorIdx: 10, size: 2, kind: 'spark' });
    }
    return e.points;
  }
  return 0;
}
