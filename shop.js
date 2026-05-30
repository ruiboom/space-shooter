import { GAME_W, GAME_H, PALETTE } from './util.js';
import { drawText, drawTextCentered, textWidth } from './sprites.js';

export const UPGRADES = [
  {
    id: 'fireRate', name: 'RAPID FIRE', maxLevel: 3,
    cost: (lvl) => 400 + lvl * 400,
    apply: (p) => { p.fireCooldown *= 0.75; },
    desc: 'FIRE 25% FASTER',
  },
  {
    id: 'spread', name: 'SPREAD SHOT', maxLevel: 2,
    cost: (lvl) => 800 + lvl * 800,
    apply: (p) => { /* level counter drives behavior in player.js */ },
    desc: '+2 ANGLED BULLETS',
  },
  {
    id: 'shield', name: 'SHIELD', maxLevel: 3,
    cost: (lvl) => 600 + lvl * 500,
    apply: (p) => { p.shield++; },
    desc: 'ABSORB ONE HIT',
  },
  {
    id: 'speed', name: 'THRUSTERS', maxLevel: 3,
    cost: (lvl) => 300 + lvl * 300,
    apply: (p) => { p.speed *= 1.15; },
    desc: 'MOVE 15% FASTER',
  },
  {
    id: 'damage', name: 'HEAVY ROUNDS', maxLevel: 2,
    cost: (lvl) => 1000 + lvl * 1000,
    apply: (p) => { /* damage comes from upgrades.damage counter */ },
    desc: '+1 BULLET DAMAGE',
  },
];

export function createShop() {
  return { selection: 0, done: false, flashTimer: 0, flashMsg: '' };
}

function currentLevel(player, upgradeId) {
  return player.upgrades[upgradeId] || 0;
}

function costFor(player, upg) {
  return upg.cost(currentLevel(player, upg.id));
}

function isMaxed(player, upg) {
  return currentLevel(player, upg.id) >= upg.maxLevel;
}

export function updateShop(shop, dt, input, game) {
  if (shop.flashTimer > 0) shop.flashTimer -= dt;

  if (input.isJustPressed('up')) {
    shop.selection = (shop.selection - 1 + UPGRADES.length) % UPGRADES.length;
  }
  if (input.isJustPressed('down')) {
    shop.selection = (shop.selection + 1) % UPGRADES.length;
  }
  if (input.isJustPressed('fire')) {
    const upg = UPGRADES[shop.selection];
    if (isMaxed(game.player, upg)) {
      shop.flashMsg = 'MAXED OUT';
      shop.flashTimer = 0.9;
    } else {
      const cost = costFor(game.player, upg);
      if (game.score < cost) {
        shop.flashMsg = 'NOT ENOUGH POINTS';
        shop.flashTimer = 0.9;
      } else {
        game.score -= cost;
        upg.apply(game.player);
        game.player.upgrades[upg.id] = currentLevel(game.player, upg.id) + 1;
        shop.flashMsg = 'PURCHASED!';
        shop.flashTimer = 0.9;
      }
    }
  }
  if (input.isJustPressed('confirm')) {
    shop.done = true;
  }
}

export function drawShop(ctx, shop, game) {
  // backdrop
  ctx.fillStyle = PALETTE[1];
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  // starry-ish tint banner
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(0, 18, GAME_W, 14);

  drawTextCentered(ctx, '** SPACE SHOP **', GAME_W / 2, 22, 10);
  drawTextCentered(ctx, `POINTS: ${game.score}`, GAME_W / 2, 42, 7);

  const listTop = 60;
  const rowH = 26;

  for (let i = 0; i < UPGRADES.length; i++) {
    const upg = UPGRADES[i];
    const y = listTop + i * rowH;
    const lvl = currentLevel(game.player, upg.id);
    const maxed = isMaxed(game.player, upg);
    const cost = maxed ? '---' : String(upg.cost(lvl));

    const isSel = i === shop.selection;
    if (isSel) {
      ctx.fillStyle = PALETTE[13];
      ctx.fillRect(4, y - 2, GAME_W - 8, rowH - 4);
      drawText(ctx, '>', 6, y + 2, 10);
    }
    drawText(ctx, upg.name, 14, y + 2, maxed ? 5 : 7);

    // level pips
    for (let p = 0; p < upg.maxLevel; p++) {
      ctx.fillStyle = p < lvl ? PALETTE[10] : PALETTE[5];
      ctx.fillRect(14 + p * 6, y + 10, 4, 4);
    }
    drawText(ctx, upg.desc, 14, y + 16, maxed ? 5 : 6);

    const costText = `${cost}`;
    const cw = textWidth(costText);
    drawText(ctx, costText, GAME_W - 8 - cw, y + 2, maxed ? 5 : (game.score >= upg.cost(lvl) ? 10 : 8));
    drawText(ctx, maxed ? 'MAX' : 'PTS', GAME_W - 8 - textWidth('PTS'), y + 10, maxed ? 5 : 6);
  }

  // footer
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, GAME_H - 22, GAME_W, 22);
  ctx.fillStyle = PALETTE[5];
  ctx.fillRect(0, GAME_H - 23, GAME_W, 1);
  drawTextCentered(ctx, 'UP/DOWN SELECT   SPACE BUY   ENTER NEXT WAVE', GAME_W / 2, GAME_H - 15, 6);
  drawTextCentered(ctx, `WAVE ${game.waveIndex + 2} INCOMING...`, GAME_W / 2, GAME_H - 8, 9);

  if (shop.flashTimer > 0) {
    drawTextCentered(ctx, shop.flashMsg, GAME_W / 2, GAME_H - 32, 10);
  }
}
