import { GAME_W, GAME_H, PALETTE } from './util.js';
import { drawText, drawTextCentered, textWidth } from './sprites.js';

// Two kinds of item:
//  - leveled upgrades: maxLevel + level pips, cost(lvl)
//  - consumables: repeatable purchases gated by canBuy(player), show status()
export const UPGRADES = [
  {
    id: 'fireRate', name: 'RAPID FIRE', maxLevel: 3,
    cost: (lvl) => 500 + lvl * 500,
    apply: (p) => { p.fireCooldown *= 0.75; },
    desc: 'FIRE 25% FASTER',
  },
  {
    id: 'spread', name: 'SPREAD SHOT', maxLevel: 2,
    cost: (lvl) => 900 + lvl * 900,
    apply: (p) => { /* level counter drives behavior in player.js */ },
    desc: '+2 ANGLED BULLETS',
  },
  {
    id: 'damage', name: 'HEAVY ROUNDS', maxLevel: 3,
    cost: (lvl) => 1200 + lvl * 1100,
    apply: (p) => { /* damage comes from upgrades.damage counter */ },
    desc: '+1 BULLET DAMAGE',
  },
  {
    id: 'autofire', name: 'AUTOFIRE', maxLevel: 1,
    cost: () => 800,
    apply: (p) => { p.autofire = true; },
    desc: 'GUNS NEVER STOP',
  },
  {
    id: 'missileBay', name: 'MISSILE BAY', maxLevel: 3,
    cost: (lvl) => 600 + lvl * 400,
    apply: (p) => { p.missileSlots++; },
    desc: '+1 MISSILE STORAGE',
  },
  {
    id: 'missile', name: 'MISSILE', consumable: true,
    cost: () => 300,
    canBuy: (p) => p.missiles < p.missileSlots,
    blockMsg: (p) => p.missileSlots === 0 ? 'BUY A MISSILE BAY FIRST' : 'ALL BAYS LOADED',
    apply: (p) => { p.missiles++; },
    desc: 'HOMING. X TO FIRE',
    status: (p) => `${p.missiles}/${p.missileSlots}`,
  },
  {
    id: 'shield', name: 'SHIELD', maxLevel: 3,
    cost: (lvl) => 700 + lvl * 600,
    apply: (p) => { p.shield++; },
    desc: 'ABSORB ONE HIT',
  },
  {
    id: 'speed', name: 'THRUSTERS', maxLevel: 3,
    cost: (lvl) => 350 + lvl * 350,
    apply: (p) => { p.speed *= 1.15; },
    desc: 'MOVE 15% FASTER',
  },
  {
    id: 'radar', name: 'RADAR', maxLevel: 1,
    cost: () => 500,
    apply: (p) => { /* upgrades.radar counter enables the minimap */ },
    desc: 'TRACK INCOMING FOES',
  },
  {
    id: 'shuttle', name: 'SHUTTLE ESCORT', consumable: true,
    cost: () => 700,
    canBuy: (p) => !p.shuttleQueued,
    blockMsg: () => 'ESCORT ALREADY QUEUED',
    apply: (p) => { p.shuttleQueued = true; },
    desc: 'WINGMAN 10S NEXT WAVE',
    status: (p) => p.shuttleQueued ? 'READY' : '',
  },
];

const VISIBLE_ROWS = 7;

export function createShop() {
  return { selection: 0, scroll: 0, done: false, flashTimer: 0, flashMsg: '' };
}

function currentLevel(player, upgradeId) {
  return player.upgrades[upgradeId] || 0;
}

function costFor(player, upg) {
  return upg.cost(currentLevel(player, upg.id));
}

function isMaxed(player, upg) {
  if (upg.consumable) return false;
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
  // keep selection visible
  if (shop.selection < shop.scroll) shop.scroll = shop.selection;
  if (shop.selection >= shop.scroll + VISIBLE_ROWS) shop.scroll = shop.selection - VISIBLE_ROWS + 1;

  if (input.isJustPressed('fire')) {
    const upg = UPGRADES[shop.selection];
    const player = game.player;
    if (isMaxed(player, upg)) {
      shop.flashMsg = 'MAXED OUT';
      shop.flashTimer = 0.9;
    } else if (upg.consumable && upg.canBuy && !upg.canBuy(player)) {
      shop.flashMsg = upg.blockMsg ? upg.blockMsg(player) : 'UNAVAILABLE';
      shop.flashTimer = 0.9;
    } else {
      const cost = costFor(player, upg);
      if (game.score < cost) {
        shop.flashMsg = 'NOT ENOUGH POINTS';
        shop.flashTimer = 0.9;
      } else {
        game.score -= cost;
        upg.apply(player);
        if (!upg.consumable) {
          player.upgrades[upg.id] = currentLevel(player, upg.id) + 1;
        }
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
  ctx.fillStyle = PALETTE[2];
  ctx.fillRect(0, 14, GAME_W, 14);

  drawTextCentered(ctx, '** SPACE SHOP **', GAME_W / 2, 18, 10);
  drawTextCentered(ctx, `POINTS: ${game.score}`, GAME_W / 2, 36, 7);

  const listTop = 50;
  const rowH = 26;
  const player = game.player;

  // scroll indicators
  if (shop.scroll > 0) drawTextCentered(ctx, '* MORE *', GAME_W / 2, listTop - 6, 6);
  if (shop.scroll + VISIBLE_ROWS < UPGRADES.length) {
    drawTextCentered(ctx, '* MORE *', GAME_W / 2, listTop + VISIBLE_ROWS * rowH + 1, 6);
  }

  for (let row = 0; row < VISIBLE_ROWS; row++) {
    const i = shop.scroll + row;
    if (i >= UPGRADES.length) break;
    const upg = UPGRADES[i];
    const y = listTop + row * rowH;
    const lvl = currentLevel(player, upg.id);
    const maxed = isMaxed(player, upg);
    const blocked = upg.consumable && upg.canBuy && !upg.canBuy(player);
    const dim = maxed || blocked;
    const cost = maxed ? '---' : String(upg.cost(lvl));

    const isSel = i === shop.selection;
    if (isSel) {
      ctx.fillStyle = PALETTE[13];
      ctx.fillRect(4, y - 2, GAME_W - 8, rowH - 4);
      drawText(ctx, '>', 6, y + 2, 10);
    }
    drawText(ctx, upg.name, 14, y + 2, dim ? 5 : 7);

    if (upg.consumable) {
      // status readout instead of pips
      const st = upg.status ? upg.status(player) : '';
      if (st) drawText(ctx, st, 14, y + 10, blocked ? 5 : 10);
    } else {
      for (let p = 0; p < upg.maxLevel; p++) {
        ctx.fillStyle = p < lvl ? PALETTE[10] : PALETTE[5];
        ctx.fillRect(14 + p * 6, y + 10, 4, 4);
      }
    }
    drawText(ctx, upg.desc, 14, y + 16, dim ? 5 : 6);

    const costText = `${cost}`;
    const cw = textWidth(costText);
    const affordable = game.score >= upg.cost(lvl);
    drawText(ctx, costText, GAME_W - 8 - cw, y + 2, dim ? 5 : (affordable ? 10 : 8));
    drawText(ctx, maxed ? 'MAX' : 'PTS', GAME_W - 8 - textWidth('PTS'), y + 10, dim ? 5 : 6);
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
