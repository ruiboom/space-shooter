import { GAME_W, GAME_H, PALETTE, spawnParticles } from './util.js';
import { drawSprite, drawSpriteFlash } from './sprites.js';

export const ENEMY_TYPES = {
  grunt:  { hp: 1, w: 24, h: 24, points: 100, spriteId: 'enemy_grunt' },
  sine:   { hp: 1, w: 24, h: 24, points: 150, spriteId: 'enemy_sine' },
  spiral: { hp: 1, w: 24, h: 24, points: 200, spriteId: 'enemy_spiral' },
  turret: { hp: 3, w: 24, h: 20, points: 300, spriteId: 'turret' },
  boss:   { hp: 40, w: 80, h: 56, points: 3000, spriteId: 'enemy_grunt' },
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
    ...overrides,
  };
  pattern.init(e);
  return e;
}

// ===== Patterns =====

export function straightPattern({ speed = 55, vx = 0 } = {}) {
  return {
    init(e) { e.vx = vx; e.vy = speed; },
    update(e, dt) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
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
          e.vx = 0; e.vy = 120;
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
    },
  };
}

export function turretPattern({ fireInterval = 2.0, firstDelay = 0.8 } = {}) {
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
        const speed = 110;
        ctx.spawnEnemyBullet(ex - 3, ey - 3, (dx / mag) * speed, (dy / mag) * speed);
      }
    },
  };
}

// Boss: hovers near top, sweeps left-right, fires spread shots.
export function bossPattern() {
  return {
    init(e) {
      e.patternState = {
        t: 0, entered: false,
        baseY: 30, centerX: GAME_W / 2,
        sweepAmp: 70, sweepFreq: 0.7,
        fireT: 2.0, fireMode: 0,
      };
      e.vx = 0; e.vy = 35;
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
      // Sweep left/right around centerX (absolute formula — no drift)
      e.x = ps.centerX + Math.sin(ps.t * ps.sweepFreq) * ps.sweepAmp - e.w / 2;
      ps.fireT -= dt;
      if (ps.fireT <= 0 && ctx.player && ctx.player.alive) {
        const cx = e.x + e.w / 2, cy = e.y + e.h;
        ps.fireMode = (ps.fireMode + 1) % 3;
        if (ps.fireMode === 0) {
          // 5-shot spread down
          const spread = 5, speed = 120;
          for (let i = 0; i < spread; i++) {
            const a = (Math.PI / 2) + (i - (spread - 1) / 2) * 0.18;
            ctx.spawnEnemyBullet(cx - 3, cy, Math.cos(a) * speed, Math.sin(a) * speed);
          }
          ps.fireT = 1.2;
        } else if (ps.fireMode === 1) {
          // aimed shot at player
          const px = ctx.player.x + ctx.player.w / 2;
          const py = ctx.player.y + ctx.player.h / 2;
          const dx = px - cx, dy = py - cy;
          const mag = Math.hypot(dx, dy) || 1, speed = 160;
          ctx.spawnEnemyBullet(cx - 3, cy, dx / mag * speed, dy / mag * speed);
          ps.fireT = 0.35;
        } else {
          // twin side shots
          const speed = 110;
          ctx.spawnEnemyBullet(e.x, cy, -40, speed);
          ctx.spawnEnemyBullet(e.x + e.w, cy, 40, speed);
          ps.fireT = 1.0;
        }
      }
    },
  };
}

// ===== Updates / draw =====

export function updateEnemies(enemies, dt, ctx) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) { enemies.splice(i, 1); continue; }
    e.pattern.update(e, dt, ctx);
    if (e.flashTimer > 0) e.flashTimer -= dt;

    // despawn offscreen (not for boss)
    if (e.type === 'boss') continue;
    if (e.y > GAME_H + 30 || e.x < -60 || e.x > GAME_W + 60) {
      enemies.splice(i, 1);
    }
  }
}

export function drawEnemies(ctx, enemies) {
  for (const e of enemies) {
    if (e.type === 'boss') {
      drawBoss(ctx, e);
      drawBossHealthBar(ctx, e);
      continue;
    }
    if (e.flashTimer > 0) {
      drawSpriteFlash(ctx, e.spriteId, e.x, e.y);
    } else {
      drawSprite(ctx, e.spriteId, e.x, e.y);
      if (e.type === 'turret') {
        drawSprite(ctx, 'turret_barrel', e.x + e.w / 2 - 3, e.y - 4);
      }
    }
  }
}

function drawBoss(ctx, e) {
  const x = Math.floor(e.x), y = Math.floor(e.y);
  const w = e.w, h = e.h;
  const flash = e.flashTimer > 0;
  // outer hull (brown ring)
  ctx.fillStyle = PALETTE[4];
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillRect(x + 2, y, w - 4, h);
  // mid layer (dark purple)
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(x + 4, y + 2, w - 8, h - 4);
  // red inner body
  ctx.fillStyle = PALETTE[8];
  ctx.fillRect(x + 8, y + 4, w - 16, h - 8);
  // cockpit ring
  const cw = 28, ch = 20;
  const cx = x + (w - cw) / 2, cy = y + (h - ch) / 2;
  ctx.fillStyle = PALETTE[10];
  ctx.fillRect(cx, cy, cw, ch);
  // cockpit pupil
  ctx.fillStyle = PALETTE[8];
  ctx.fillRect(cx + 6, cy + 4, cw - 12, ch - 8);
  ctx.fillStyle = PALETTE[7];
  ctx.fillRect(cx + cw / 2 - 2, cy + ch / 2 - 2, 4, 4);
  // guns bottom
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(x, y + h - 12, 10, 12);
  ctx.fillRect(x + w - 10, y + h - 12, 10, 12);
  ctx.fillStyle = PALETTE[6];
  ctx.fillRect(x + 2, y + h - 8, 6, 8);
  ctx.fillRect(x + w - 8, y + h - 8, 6, 8);
  if (flash) {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = PALETTE[7];
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
}

function drawBossHealthBar(ctx, boss) {
  const x = Math.floor(boss.x);
  const y = Math.floor(boss.y - 6);
  ctx.fillStyle = '#5F574F';
  ctx.fillRect(x, y, boss.w, 3);
  const pct = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = '#FF004D';
  ctx.fillRect(x, y, Math.floor(boss.w * pct), 3);
}

// Returns points awarded (0 if not killed)
export function damageEnemy(e, damage, particles) {
  if (!e.alive) return 0;
  e.hp -= damage;
  e.flashTimer = 0.08;
  if (e.hp <= 0) {
    e.alive = false;
    const count = e.type === 'boss' ? 60 : e.type === 'turret' ? 16 : 10;
    const life = e.type === 'boss' ? 1.2 : 0.5;
    spawnParticles(particles, e.x + e.w / 2, e.y + e.h / 2, count, {
      speed: e.type === 'boss' ? 180 : 100, life, colorIdx: 9, size: 2,
    });
    spawnParticles(particles, e.x + e.w / 2, e.y + e.h / 2, Math.floor(count * 0.5), {
      speed: 60, life: life * 0.8, colorIdx: 8, size: 2,
    });
    return e.points;
  }
  return 0;
}
