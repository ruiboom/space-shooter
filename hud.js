import { GAME_W, GAME_H, PALETTE } from './util.js';
import { drawText, drawSprite, textWidth } from './sprites.js';
import { POWERUP_TYPES } from './powerups.js';

const PAD = 4;
const BAR_H = 10;

// Radar shows the full corridor: 1.5 screens of space above the visible
// area, so upgrades buy you advance warning of what's diving in.
const RADAR_W = 34;
const RADAR_H = 52;
const RADAR_LOOKAHEAD = GAME_H * 1.5;

function radarY(worldY) {
  return ((worldY + RADAR_LOOKAHEAD) / (RADAR_LOOKAHEAD + GAME_H)) * RADAR_H;
}

function drawRadar(ctx, game) {
  const rx = GAME_W - RADAR_W - 3;
  const ry = BAR_H + 4;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(rx, ry, RADAR_W, RADAR_H);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE[13];
  ctx.lineWidth = 1;
  ctx.strokeRect(rx - 0.5, ry - 0.5, RADAR_W + 1, RADAR_H + 1);
  // line marking the top of the visible screen
  const screenLine = ry + radarY(0);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(rx, Math.floor(screenLine), RADAR_W, 1);
  ctx.globalAlpha = 1;

  const px = (worldX) => rx + (worldX / GAME_W) * RADAR_W;
  const py = (worldY) => ry + radarY(worldY);

  // obstacles
  for (const o of game.obstacles) {
    ctx.fillStyle = o.indestructible ? PALETTE[13] : PALETTE[5];
    ctx.fillRect(Math.floor(px(o.x + o.w / 2)) - 1, Math.floor(py(o.y + o.h / 2)) - 1, 2, 2);
  }
  // powerups (blinking, type-colored)
  if (Math.floor(performance.now() / 180) % 2 === 0) {
    for (const p of game.powerups) {
      ctx.fillStyle = PALETTE[POWERUP_TYPES[p.type].color];
      ctx.fillRect(Math.floor(px(p.x)), Math.floor(py(p.y)), 1, 1);
    }
  }
  // enemies
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const big = e.type === 'boss' || e.type === 'warden';
    ctx.fillStyle = PALETTE[big ? 14 : 8];
    const s = big ? 3 : 2;
    ctx.fillRect(Math.floor(px(e.x + e.w / 2)) - 1, Math.floor(py(e.y + e.h / 2)) - 1, s, s);
  }
  // player
  if (game.player.alive) {
    ctx.fillStyle = PALETTE[12];
    ctx.fillRect(Math.floor(px(game.player.x + game.player.w / 2)) - 1, Math.floor(py(game.player.y)) - 1, 2, 2);
  }
}

export function drawHud(ctx, game) {
  // top bar
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, GAME_W, BAR_H);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(0, BAR_H, GAME_W, 1);

  drawText(ctx, 'SCORE', PAD, 2, 6);
  drawText(ctx, String(game.score).padStart(6, '0'), PAD + textWidth('SCORE') + 3, 2, 10);

  const bossWave = game.spawner && game.spawner.wave.endOnBossDeath;
  const waveText = `WAVE ${game.waveIndex + 1}`;
  const wtw = textWidth(waveText);
  drawText(ctx, waveText, Math.floor(GAME_W / 2 - wtw / 2), 2, bossWave ? 8 : 7);

  // Lives as hearts on the right
  const livesStart = GAME_W - PAD - 3;
  for (let i = 0; i < game.player.lives; i++) {
    drawSprite(ctx, 'heart', livesStart - (i + 1) * 6, 3);
  }

  // left-side status stack
  let sy = BAR_H + 3;
  if (game.player.rapidTimer > 0) {
    drawText(ctx, `RAPID ${Math.ceil(game.player.rapidTimer)}`, PAD, sy, 9);
    sy += 8;
  }
  if (game.player.shield > 0) {
    drawText(ctx, `SHIELD x${game.player.shield}`, PAD, sy, 12);
    sy += 8;
  }
  if (game.player.shuttleTimer > 0) {
    drawText(ctx, `WINGMAN ${Math.ceil(game.player.shuttleTimer)}`, PAD, sy, 11);
    sy += 8;
  }
  // missile bays: filled vs empty slots
  if (game.player.missileSlots > 0) {
    drawText(ctx, 'MSL', PAD, sy, 6);
    const baseX = PAD + textWidth('MSL') + 4;
    for (let i = 0; i < game.player.missileSlots; i++) {
      const x = baseX + i * 9;
      if (i < game.player.missiles) {
        drawSprite(ctx, 'missile', x, sy - 3);
      } else {
        ctx.strokeStyle = PALETTE[5];
        ctx.strokeRect(x + 0.5, sy - 2.5, 5, 11);
      }
    }
    sy += 12;
  }

  // radar minimap (paid upgrade)
  if (game.player.upgrades.radar > 0) {
    drawRadar(ctx, game);
  }
}

export function drawPickupToast(ctx, toast) {
  if (!toast || toast.life <= 0) return;
  const alpha = Math.min(1, toast.life / 0.3);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawText(ctx, toast.text, Math.floor(GAME_W / 2 - textWidth(toast.text) / 2), 40 - Math.floor((1 - toast.life) * 8), toast.color ?? 10);
  ctx.restore();
}
