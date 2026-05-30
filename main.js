import {
  GAME_W, GAME_H, DISPLAY_SCALE, PALETTE,
  aabb, clamp, spawnParticles, updateParticles, drawParticles, rng,
} from './util.js';
import { bakeSprites, drawText, drawTextCentered, textWidth, drawSprite } from './sprites.js';
import { initInput, isDown, isJustPressed, consumeJustPressed, getAxis, isFiring } from './input.js';
import {
  createPlayer, resetPlayerPosition, updatePlayer, drawPlayer, damagePlayer,
} from './player.js';
import {
  createBulletPool, spawnBullet, updateBullets, drawBullets, clearBullets,
} from './bullets.js';
import {
  updateEnemies, drawEnemies, damageEnemy, ENEMY_TYPES,
} from './enemies.js';
import {
  WAVES, createSpawner, updateSpawner, isWaveClear, getClearBonus,
} from './waves.js';
import { createTerrain, updateTerrain, drawTerrain } from './terrain.js';
import {
  maybeSpawnPowerup, updatePowerups, drawPowerups, applyPowerup, powerupLabel,
} from './powerups.js';
import { createShop, updateShop, drawShop } from './shop.js';
import { drawHud, drawPickupToast } from './hud.js';

// ===== Canvas setup =====
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const marginY = 80; // leave room for info bar and padding
  const maxByW = Math.floor(window.innerWidth / GAME_W);
  const maxByH = Math.floor((window.innerHeight - marginY) / GAME_H);
  const scale = Math.max(1, Math.min(DISPLAY_SCALE + 1, maxByW, maxByH));
  canvas.style.width = (GAME_W * scale) + 'px';
  canvas.style.height = (GAME_H * scale) + 'px';
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

bakeSprites();
initInput();

// ===== States =====
const STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  WAVE_CLEAR: 'wave_clear',
  SHOP: 'shop',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

let game = newGame();
let titleAnim = 0;

function newGame() {
  return {
    state: STATE.TITLE,
    waveIndex: 0,
    score: 0,
    player: createPlayer(),
    playerBullets: createBulletPool(),
    enemyBullets: createBulletPool(),
    enemies: [],
    powerups: [],
    particles: [],
    terrain: createTerrain(),
    spawner: null,
    shop: createShop(),
    waveClearTimer: 0,
    waveClearBonusShown: 0,
    waveClearBonusTotal: 0,
    screenShake: 0,
    toast: null, // { text, life, color }
    waveStartToastTimer: 0,
  };
}

function startRun() {
  game = newGame();
  game.state = STATE.PLAYING;
  game.spawner = createSpawner(0);
  game.waveStartToastTimer = 1.6;
  game.toast = { text: 'WAVE 1', life: 1.6, color: 10 };
}

function advanceToNextWave() {
  game.waveIndex++;
  if (game.waveIndex >= WAVES.length) {
    game.state = STATE.VICTORY;
    return;
  }
  game.spawner = createSpawner(game.waveIndex);
  clearBullets(game.playerBullets);
  clearBullets(game.enemyBullets);
  game.enemies.length = 0;
  game.powerups.length = 0;
  resetPlayerPosition(game.player);
  game.state = STATE.PLAYING;
  game.toast = { text: `WAVE ${game.waveIndex + 1}`, life: 1.6, color: 10 };
}

function showToast(text, color = 10, life = 1.4) {
  game.toast = { text, life, color };
}

// ===== Context passed to enemies for shooting =====
function enemyCtx() {
  return {
    player: game.player,
    terrainSpeed: game.terrain.scrollSpeed,
    spawnEnemyBullet: (x, y, vx, vy) => {
      spawnBullet(game.enemyBullets, {
        owner: 'enemy', x, y, vx, vy, w: 6, h: 6, damage: 1, spriteId: 'enemy_bullet',
      });
    },
  };
}

// ===== Player hit handling =====
function hitPlayer() {
  if (!game.player.alive) return;
  if (game.player.invulnTimer > 0) return;
  if (game.player.shield > 0) {
    game.player.shield--;
    game.player.invulnTimer = 1.0;
    spawnParticles(game.particles, game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, 10, {
      speed: 80, life: 0.35, colorIdx: 12, size: 2,
    });
    game.screenShake = 0.15;
    showToast('SHIELD BROKEN', 12, 0.8);
  } else {
    damagePlayer(game.player, game.particles);
    game.screenShake = 0.35;
  }
}

// ===== Input adapter passed to shop =====
const shopInput = {
  isJustPressed: (k) => isJustPressed(k),
  isDown: (k) => isDown(k),
};

// ===== Fixed-timestep loop =====
let last = performance.now();
const FIXED_DT = 1 / 60;
const MAX_STEPS = 4;
let accum = 0;

function frame(now) {
  const raw = (now - last) / 1000;
  last = now;
  accum = Math.min(accum + raw, FIXED_DT * MAX_STEPS);
  let steps = 0;
  while (accum >= FIXED_DT && steps < MAX_STEPS) {
    update(FIXED_DT);
    consumeJustPressed();
    accum -= FIXED_DT;
    steps++;
  }
  render();
  requestAnimationFrame(frame);
}

function update(dt) {
  titleAnim += dt;
  if (game.toast && game.toast.life > 0) game.toast.life -= dt;

  switch (game.state) {
    case STATE.TITLE: updateTitle(dt); break;
    case STATE.PLAYING: updatePlaying(dt); break;
    case STATE.WAVE_CLEAR: updateWaveClear(dt); break;
    case STATE.SHOP:
      updateShop(game.shop, dt, shopInput, game);
      if (game.shop.done) {
        game.shop.done = false;
        advanceToNextWave();
      }
      break;
    case STATE.GAME_OVER:
    case STATE.VICTORY:
      updateTerrain(game.terrain, dt);
      updateParticles(game.particles, dt);
      if (isJustPressed('fire') || isJustPressed('confirm')) {
        game = newGame();
      }
      break;
  }
}

function updateTitle(dt) {
  updateTerrain(game.terrain, dt);
  updateParticles(game.particles, dt);
  if (isJustPressed('fire') || isJustPressed('confirm')) startRun();
}

function updatePlaying(dt) {
  updateTerrain(game.terrain, dt);
  updateSpawner(game.spawner, dt, game.enemies);

  updatePlayer(game.player, dt, { getAxis, isFiring }, game.playerBullets);

  updateEnemies(game.enemies, dt, enemyCtx());

  // player bullets vs enemies
  updateBullets(game.playerBullets, dt, (b) => {
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (aabb(b, e)) {
        b.alive = false;
        const pts = damageEnemy(e, b.damage, game.particles);
        if (pts > 0) {
          game.score += pts;
          maybeSpawnPowerup(game.powerups, e);
        }
        return;
      }
    }
  });

  // enemy bullets vs player
  updateBullets(game.enemyBullets, dt, (b) => {
    if (!game.player.alive || game.player.invulnTimer > 0) return;
    if (aabb(b, game.player)) {
      b.alive = false;
      hitPlayer();
    }
  });

  // enemy body vs player
  if (game.player.alive && game.player.invulnTimer <= 0) {
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (aabb(game.player, e)) {
        hitPlayer();
        if (e.type !== 'boss') damageEnemy(e, 999, game.particles);
        break;
      }
    }
  }

  updatePowerups(game.powerups, dt, game.player, (p) => {
    applyPowerup(p.type, game.player);
    showToast(powerupLabel(p.type), p.type === 'life' ? 14 : (p.type === 'rapid' ? 9 : 12), 1.3);
  });

  updateParticles(game.particles, dt);

  if (game.screenShake > 0) game.screenShake -= dt;

  // transitions
  if (game.player.lives <= 0 && !game.player.alive && game.player.deathTimer <= 0) {
    game.state = STATE.GAME_OVER;
    return;
  }
  if (isWaveClear(game.spawner, game.enemies)) {
    enterWaveClear();
  }
}

function enterWaveClear() {
  game.state = STATE.WAVE_CLEAR;
  game.waveClearTimer = 2.0;
  game.waveClearBonusTotal = getClearBonus(game.waveIndex);
  game.waveClearBonusShown = 0;
  clearBullets(game.enemyBullets);
}

function updateWaveClear(dt) {
  updateTerrain(game.terrain, dt);
  updateParticles(game.particles, dt);
  updatePlayer(game.player, dt, { getAxis, isFiring }, game.playerBullets);
  updateBullets(game.playerBullets, dt);
  updatePowerups(game.powerups, dt, game.player, (p) => {
    applyPowerup(p.type, game.player);
    showToast(powerupLabel(p.type), p.type === 'life' ? 14 : (p.type === 'rapid' ? 9 : 12), 1.3);
  });

  game.waveClearTimer -= dt;
  const progress = 1 - clamp(game.waveClearTimer / 2.0, 0, 1);
  game.waveClearBonusShown = Math.floor(game.waveClearBonusTotal * progress);
  if (isJustPressed('fire') || isJustPressed('confirm')) game.waveClearTimer = 0;

  if (game.waveClearTimer <= 0) {
    game.score += game.waveClearBonusTotal;
    game.waveClearBonusShown = game.waveClearBonusTotal;
    if (game.waveIndex >= WAVES.length - 1) {
      game.state = STATE.VICTORY;
    } else {
      game.state = STATE.SHOP;
      game.shop = createShop();
    }
  }
}

// ===== Rendering =====

function render() {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // camera shake
  const shake = game.screenShake > 0 ? game.screenShake : 0;
  const sx = shake > 0 ? Math.floor((rng() - 0.5) * shake * 10) : 0;
  const sy = shake > 0 ? Math.floor((rng() - 0.5) * shake * 10) : 0;

  ctx.save();
  if (sx || sy) ctx.translate(sx, sy);

  switch (game.state) {
    case STATE.TITLE: renderTitle(); break;
    case STATE.PLAYING:
    case STATE.WAVE_CLEAR:
    case STATE.GAME_OVER:
    case STATE.VICTORY:
      renderWorld();
      break;
    case STATE.SHOP:
      drawShop(ctx, game.shop, game);
      break;
  }

  ctx.restore();

  // overlays (un-shaken)
  if (game.state === STATE.PLAYING || game.state === STATE.WAVE_CLEAR) {
    drawHud(ctx, game);
    drawPickupToast(ctx, game.toast);
  }
  if (game.state === STATE.WAVE_CLEAR) renderWaveClearOverlay();
  if (game.state === STATE.GAME_OVER) renderGameOverOverlay();
  if (game.state === STATE.VICTORY) renderVictoryOverlay();
}

function renderWorld() {
  drawTerrain(ctx, game.terrain);
  drawEnemies(ctx, game.enemies);
  drawPowerups(ctx, game.powerups);
  drawBullets(ctx, game.enemyBullets);
  drawPlayer(ctx, game.player);
  drawBullets(ctx, game.playerBullets);
  drawParticles(ctx, game.particles);
}

function renderTitle() {
  drawTerrain(ctx, game.terrain);

  // Title graphic
  const t = titleAnim;
  const bob = Math.sin(t * 2) * 2;
  const shimmer = Math.floor(t * 5) % 3 === 0 ? 10 : 7;

  drawTextCentered(ctx, 'STELLAR', GAME_W / 2, 70 + bob, shimmer);
  drawTextCentered(ctx, 'RAID', GAME_W / 2, 86 + bob, 9);

  // Decorative ship (sprite is 18x22, thrust 14x10)
  drawSprite(ctx, 'player', GAME_W / 2 - 9, 108 + bob);
  drawSprite(ctx, 'player_thrust', GAME_W / 2 - 7, 128 + bob);

  drawTextCentered(ctx, '-- A RETRO SHMUP --', GAME_W / 2, 150, 6);

  // Blinking "PRESS SPACE"
  if (Math.floor(t * 2) % 2 === 0) {
    drawTextCentered(ctx, 'PRESS SPACE', GAME_W / 2, 210, 10);
  }
  drawTextCentered(ctx, 'ARROWS / WASD  MOVE', GAME_W / 2, 240, 6);
  drawTextCentered(ctx, 'SPACE  FIRE', GAME_W / 2, 250, 6);
  drawTextCentered(ctx, 'ENTER  CONFIRM', GAME_W / 2, 260, 6);

  drawTextCentered(ctx, '6 WAVES  .  1 SHOP  .  NO MERCY', GAME_W / 2, 290, 5);
}

function renderWaveClearOverlay() {
  const txt1 = `WAVE ${game.waveIndex + 1} CLEAR!`;
  const txt2 = `+${game.waveClearBonusShown} BONUS`;
  const pulse = Math.floor(titleAnim * 6) % 2 === 0 ? 10 : 7;

  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, GAME_H / 2 - 26, GAME_W, 44);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE[13];
  ctx.strokeRect(0, GAME_H / 2 - 26, GAME_W, 44);

  drawTextCentered(ctx, txt1, GAME_W / 2, GAME_H / 2 - 18, pulse);
  drawTextCentered(ctx, txt2, GAME_W / 2, GAME_H / 2 - 4, 10);
  drawTextCentered(ctx, 'SPACE TO SKIP', GAME_W / 2, GAME_H / 2 + 8, 6);
}

function renderGameOverOverlay() {
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.globalAlpha = 1;
  drawTextCentered(ctx, 'GAME OVER', GAME_W / 2, 120, 8);
  drawTextCentered(ctx, `FINAL SCORE  ${game.score}`, GAME_W / 2, 150, 7);
  drawTextCentered(ctx, `REACHED WAVE ${game.waveIndex + 1}`, GAME_W / 2, 162, 6);
  if (Math.floor(titleAnim * 2) % 2 === 0) {
    drawTextCentered(ctx, 'PRESS SPACE', GAME_W / 2, 200, 10);
  }
}

function renderVictoryOverlay() {
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.globalAlpha = 1;
  drawTextCentered(ctx, 'VICTORY!', GAME_W / 2, 110, 11);
  drawTextCentered(ctx, 'STELLAR RAID COMPLETE', GAME_W / 2, 128, 7);
  drawTextCentered(ctx, `FINAL SCORE  ${game.score}`, GAME_W / 2, 148, 10);
  if (Math.floor(titleAnim * 2) % 2 === 0) {
    drawTextCentered(ctx, 'PRESS SPACE', GAME_W / 2, 200, 10);
  }
}

// ===== Boot =====
requestAnimationFrame(frame);
