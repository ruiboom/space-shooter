import { GAME_W, PALETTE } from './util.js';
import { drawText, drawSprite, textWidth } from './sprites.js';

const PAD = 4;
const BAR_H = 10;

export function drawHud(ctx, game) {
  // top bar
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, GAME_W, BAR_H);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(0, BAR_H, GAME_W, 1);

  drawText(ctx, 'SCORE', PAD, 2, 6);
  drawText(ctx, String(game.score).padStart(6, '0'), PAD + textWidth('SCORE') + 3, 2, 10);

  const waveText = `WAVE ${game.waveIndex + 1}/6`;
  const wtw = textWidth(waveText);
  drawText(ctx, waveText, Math.floor(GAME_W / 2 - wtw / 2), 2, 7);

  // Lives as hearts on the right
  const livesStart = GAME_W - PAD - 3;
  for (let i = 0; i < game.player.lives; i++) {
    drawSprite(ctx, 'heart', livesStart - (i + 1) * 6, 3);
  }

  // powerup active indicator (rapid)
  if (game.player.rapidTimer > 0) {
    const msg = `RAPID ${Math.ceil(game.player.rapidTimer)}`;
    drawText(ctx, msg, PAD, BAR_H + 3, 9);
  }
  if (game.player.shield > 0) {
    const off = game.player.rapidTimer > 0 ? 8 : 0;
    drawText(ctx, `SHIELD x${game.player.shield}`, PAD, BAR_H + 3 + off, 12);
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
