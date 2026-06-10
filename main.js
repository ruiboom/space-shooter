import {
  GAME_W, GAME_H, DISPLAY_SCALE, PALETTE,
  aabb, clamp, spawnParticles, spawnExplosion, updateParticles, drawParticles, rng,
} from './util.js';
import { bakeSprites, drawText, drawTextCentered, textWidth, drawSprite, getSprite } from './sprites.js';
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
  AUTHORED_COUNT, getWaveDef, createSpawner, updateSpawner, isWaveClear, getClearBonus,
} from './waves.js';
import { createTerrain, updateTerrain, drawTerrain } from './terrain.js';
import {
  maybeSpawnPowerup, updatePowerups, drawPowerups, applyPowerup,
  powerupLabel, powerupToastColor,
} from './powerups.js';
import {
  spawnObstacle, updateObstacles, drawObstacles, damageObstacle,
} from './obstacles.js';
import {
  createMissilePool, fireMissile, updateMissiles, drawMissiles, clearMissiles,
} from './missiles.js';
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
    missiles: createMissilePool(),
    enemies: [],
    powerups: [],
    obstacles: [],
    particles: [],
    terrain: createTerrain(),
    spawner: null,
    shop: createShop(),
    obstacleTimer: 4,
    waveClearTimer: 0,
    waveClearBonusShown: 0,
    waveClearBonusTotal: 0,
    screenShake: 0,
    flash: 0, // white screen flash (bomb / boss kill)
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

function deployQueuedShuttle() {
  const p = game.player;
  if (p.shuttleQueued) {
    p.shuttleQueued = false;
    p.shuttleTimer = 10;
    p.shuttleX = p.x - 34;
  }
}

function advanceToNextWave() {
  game.waveIndex++;
  game.spawner = createSpawner(game.waveIndex);
  clearBullets(game.playerBullets);
  clearBullets(game.enemyBullets);
  clearMissiles(game.missiles);
  game.enemies.length = 0;
  game.powerups.length = 0;
  game.obstacles.length = 0;
  game.obstacleTimer = 3;
  resetPlayerPosition(game.player);
  deployQueuedShuttle();
  game.state = STATE.PLAYING;
  const wave = getWaveDef(game.waveIndex);
  let label = wave.endOnBossDeath ? `WAVE ${game.waveIndex + 1} - BOSS!` : `WAVE ${game.waveIndex + 1}`;
  if (game.waveIndex === AUTHORED_COUNT) label = 'ENTERING DEEP SPACE';
  game.toast = { text: label, life: 1.6, color: wave.endOnBossDeath ? 8 : 10 };
}

function showToast(text, color = 10, life = 1.4) {
  game.toast = { text, life, color };
}

// ===== Context passed to enemies for shooting =====
function enemyCtx() {
  return {
    player: game.player,
    terrainSpeed: game.terrain.scrollSpeed,
    spawnEnemyBullet: (x, y, vx, vy, spriteId = 'enemy_bullet') => {
      spawnBullet(game.enemyBullets, {
        owner: 'enemy', x, y, vx, vy, w: 6, h: 6, damage: 1, spriteId,
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
    spawnExplosion(game.particles, game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, {
      size: 0.8, ringColor: 12,
    });
    game.screenShake = 0.15;
    showToast('SHIELD BROKEN', 12, 0.8);
  } else {
    damagePlayer(game.player, game.particles);
    game.screenShake = 0.35;
  }
}

// ===== Kill bookkeeping (score, drops, boss-down detection) =====
function creditKill(e, pts) {
  if (pts <= 0) return;
  game.score += pts;
  maybeSpawnPowerup(game.powerups, e);
  if (pts >= 300) game.screenShake = Math.max(game.screenShake, 0.12);
  if ((e.type === 'boss' || e.type === 'warden')) {
    const bossStillUp = game.enemies.some(
      (x) => x.alive && (x.type === 'boss' || x.type === 'warden')
    );
    if (!bossStillUp) onBossDefeated();
  }
}

// ===== Powerup pickup (bomb needs full game state) =====
function onPowerup(p) {
  applyPowerup(p.type, game.player);
  if (p.type === 'bomb') detonateBomb();
  showToast(powerupLabel(p.type), powerupToastColor(p.type), 1.3);
}

function detonateBomb() {
  clearBullets(game.enemyBullets);
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const pts = damageEnemy(e, 4, game.particles);
    if (pts > 0) game.score += pts; // no drops from bomb kills
  }
  for (const o of game.obstacles) {
    if (o.alive && !o.indestructible) game.score += damageObstacle(o, 4, game.particles);
  }
  for (let i = 0; i < 5; i++) {
    spawnExplosion(game.particles,
      30 + rng() * (GAME_W - 60), 40 + rng() * (GAME_H - 120),
      { size: 1.4 });
  }
  game.screenShake = 0.5;
  game.flash = 0.3;
}

// Missile detonation: splash damage around the impact point.
function detonateMissile(m) {
  const RADIUS = 44;
  spawnExplosion(game.particles, m.x, m.y, { size: 1.7 });
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x + e.w / 2 - m.x, e.y + e.h / 2 - m.y);
    if (d > RADIUS) continue;
    const pts = damageEnemy(e, d < 16 ? 8 : 5, game.particles);
    creditKill(e, pts);
  }
  for (const o of game.obstacles) {
    if (!o.alive) continue;
    const d = Math.hypot(o.x + o.w / 2 - m.x, o.y + o.h / 2 - m.y);
    if (d <= RADIUS + o.w / 2) game.score += damageObstacle(o, 6, game.particles);
  }
  game.screenShake = Math.max(game.screenShake, 0.2);
}

// Boss down: chain-detonate the stragglers and end the wave timeline.
function onBossDefeated() {
  game.spawner.pending.length = 0;
  game.spawner.done = true;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    game.score += damageEnemy(e, 999, game.particles);
  }
  clearBullets(game.enemyBullets);
  game.screenShake = 0.6;
  game.flash = 0.35;
}

// ===== Obstacle field =====
function updateObstacleSpawning(dt) {
  const wi = game.waveIndex;
  if (wi < 2) return; // clean skies for the intro waves
  game.obstacleTimer -= dt;
  if (game.obstacleTimer > 0) return;
  game.obstacleTimer = Math.max(2.8, 8 - wi * 0.35) * (0.7 + rng() * 0.6);
  if (game.obstacles.length >= 5) return;
  const r = rng();
  let kind = 'asteroid';
  if (wi >= 5 && r < 0.18) kind = 'hulk';
  else if (wi >= 3 && r < 0.45) kind = 'wreck';
  spawnObstacle(game.obstacles, wi, kind);
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
  if (game.flash > 0) game.flash -= dt;

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

// Bullet-vs-world collision shared by both bullet pools: obstacles soak
// shots from anyone.
function bulletHitsObstacle(b) {
  for (const o of game.obstacles) {
    if (!o.alive) continue;
    if (aabb(b, o)) {
      b.alive = false;
      if (b.owner === 'player') {
        game.score += damageObstacle(o, b.damage, game.particles);
      } else {
        damageObstacle(o, 0.0001, game.particles); // ping, no real damage
      }
      return true;
    }
  }
  return false;
}

function updatePlaying(dt) {
  updateTerrain(game.terrain, dt);
  updateSpawner(game.spawner, dt, game.enemies);
  updateObstacleSpawning(dt);

  updatePlayer(game.player, dt, { getAxis, isFiring }, game.playerBullets, game.particles);

  // missile launch
  if (isJustPressed('missile') && game.player.alive
      && game.player.missiles > 0 && game.player.missileCooldown <= 0) {
    game.player.missiles--;
    game.player.missileCooldown = 0.35;
    fireMissile(game.missiles, game.player.x + game.player.w / 2, game.player.y - 2);
  }

  updateEnemies(game.enemies, dt, enemyCtx());
  updateObstacles(game.obstacles, dt);

  updateMissiles(game.missiles, dt, game.enemies, game.obstacles, game.particles, detonateMissile);

  // player bullets vs obstacles, then enemies
  updateBullets(game.playerBullets, dt, (b) => {
    if (bulletHitsObstacle(b)) return;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (aabb(b, e)) {
        b.alive = false;
        const pts = damageEnemy(e, b.damage, game.particles);
        creditKill(e, pts);
        return;
      }
    }
  });

  // enemy bullets vs obstacles, then player
  updateBullets(game.enemyBullets, dt, (b) => {
    if (bulletHitsObstacle(b)) return;
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
        if (e.type !== 'boss' && e.type !== 'warden') damageEnemy(e, 999, game.particles);
        break;
      }
    }
    // obstacle body vs player
    for (const o of game.obstacles) {
      if (!o.alive) continue;
      if (aabb(game.player, o)) {
        hitPlayer();
        if (!o.indestructible) game.score += damageObstacle(o, 5, game.particles);
        break;
      }
    }
  }

  updatePowerups(game.powerups, dt, game.player, onPowerup);

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
  updatePlayer(game.player, dt, { getAxis, isFiring }, game.playerBullets, game.particles);
  updateObstacles(game.obstacles, dt);
  updateMissiles(game.missiles, dt, game.enemies, game.obstacles, game.particles, detonateMissile);
  updateBullets(game.playerBullets, dt, (b) => { bulletHitsObstacle(b); });
  updatePowerups(game.powerups, dt, game.player, onPowerup);

  game.waveClearTimer -= dt;
  const progress = 1 - clamp(game.waveClearTimer / 2.0, 0, 1);
  game.waveClearBonusShown = Math.floor(game.waveClearBonusTotal * progress);
  if (isJustPressed('fire') || isJustPressed('confirm')) game.waveClearTimer = 0;

  if (game.waveClearTimer <= 0) {
    game.score += game.waveClearBonusTotal;
    game.waveClearBonusShown = game.waveClearBonusTotal;
    game.state = STATE.SHOP;
    game.shop = createShop();
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
      renderWorld();
      break;
    case STATE.SHOP:
      drawShop(ctx, game.shop, game);
      break;
  }

  ctx.restore();

  // white flash (bomb / boss kill)
  if (game.flash > 0) {
    ctx.globalAlpha = Math.min(0.85, game.flash * 2.5);
    ctx.fillStyle = PALETTE[7];
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }

  // overlays (un-shaken)
  if (game.state === STATE.PLAYING || game.state === STATE.WAVE_CLEAR) {
    drawHud(ctx, game);
    drawPickupToast(ctx, game.toast);
  }
  if (game.state === STATE.WAVE_CLEAR) renderWaveClearOverlay();
  if (game.state === STATE.GAME_OVER) renderGameOverOverlay();
}

function renderWorld() {
  drawTerrain(ctx, game.terrain);
  drawObstacles(ctx, game.obstacles);
  drawEnemies(ctx, game.enemies);
  drawPowerups(ctx, game.powerups);
  drawBullets(ctx, game.enemyBullets);
  drawPlayer(ctx, game.player);
  drawBullets(ctx, game.playerBullets);
  drawMissiles(ctx, game.missiles);
  drawParticles(ctx, game.particles);
}

function renderTitle() {
  drawTerrain(ctx, game.terrain);

  const t = titleAnim;
  const bob = Math.sin(t * 2) * 2;
  const shimmer = Math.floor(t * 5) % 3 === 0 ? 10 : 7;

  // glow behind the title
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(GAME_W / 2, 80, 5, GAME_W / 2, 80, 90);
  g.addColorStop(0, 'rgba(255,163,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_W, 170);
  ctx.globalCompositeOperation = 'source-over';

  drawTextCentered(ctx, 'STELLAR', GAME_W / 2, 56 + bob, shimmer, 2);
  drawTextCentered(ctx, 'RAID', GAME_W / 2, 80 + bob, 9, 2);

  // Decorative ship with engine flame
  const ship = getSprite('player');
  if (ship) {
    const sx = GAME_W / 2 - ship.w / 2;
    const sy = 112 + bob;
    const flameLen = 8 + Math.floor((Math.sin(t * 12) + 1) * 3);
    ctx.fillStyle = PALETTE[9];
    ctx.fillRect(GAME_W / 2 - 3, sy + ship.h - 2, 6, flameLen);
    ctx.fillStyle = PALETTE[10];
    ctx.fillRect(GAME_W / 2 - 2, sy + ship.h - 2, 4, Math.floor(flameLen * 0.7));
    ctx.fillStyle = PALETTE[7];
    ctx.fillRect(GAME_W / 2 - 1, sy + ship.h - 2, 2, Math.floor(flameLen * 0.4));
    drawSprite(ctx, 'player', sx, sy);
  }

  drawTextCentered(ctx, '-- A RETRO SHMUP --', GAME_W / 2, 160, 6);

  // Blinking "PRESS SPACE"
  if (Math.floor(t * 2) % 2 === 0) {
    drawTextCentered(ctx, 'PRESS SPACE', GAME_W / 2, 200, 10);
  }
  drawTextCentered(ctx, 'ARROWS / WASD  MOVE', GAME_W / 2, 228, 6);
  drawTextCentered(ctx, 'SPACE  FIRE', GAME_W / 2, 238, 6);
  drawTextCentered(ctx, 'X  MISSILE', GAME_W / 2, 248, 6);
  drawTextCentered(ctx, 'ENTER  CONFIRM', GAME_W / 2, 258, 6);

  drawTextCentered(ctx, 'ENDLESS WAVES . MEGA BOSSES . NO MERCY', GAME_W / 2, 290, 5);
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
  drawTextCentered(ctx, 'GAME OVER', GAME_W / 2, 114, 8, 2);
  drawTextCentered(ctx, `FINAL SCORE  ${game.score}`, GAME_W / 2, 150, 7);
  drawTextCentered(ctx, `REACHED WAVE ${game.waveIndex + 1}`, GAME_W / 2, 162, 6);
  if (Math.floor(titleAnim * 2) % 2 === 0) {
    drawTextCentered(ctx, 'PRESS SPACE', GAME_W / 2, 200, 10);
  }
}

// ===== Boot =====
requestAnimationFrame(frame);
