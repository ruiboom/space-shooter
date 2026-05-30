import { GAME_W } from './util.js';
import {
  createEnemy,
  straightPattern, sinePattern, spiralPattern, turretPattern, bossPattern,
} from './enemies.js';

// Formation spawners. Each pushes enemies into the given array.

function spawnV(enemies, centerX, opts = {}) {
  const speed = opts.speed ?? 60;
  // Spacing scaled for 24x24 grunts.
  const offsets = [
    { dx: -44, dy: 0 },
    { dx: -22, dy: -14 },
    { dx: 0,   dy: -28 },
    { dx: 22,  dy: -14 },
    { dx: 44,  dy: 0 },
  ];
  for (const { dx, dy } of offsets) {
    enemies.push(createEnemy('grunt', centerX + dx - 12, -28 + dy, straightPattern({ speed })));
  }
}

function spawnSineLine(enemies, startX, dir = 1, opts = {}) {
  const count = opts.count ?? 6;
  const speed = opts.speed ?? 40;
  const amplitude = opts.amplitude ?? 70;
  const frequency = opts.frequency ?? 1.8;
  for (let i = 0; i < count; i++) {
    const baseX = startX + dir * i * 14;
    enemies.push(createEnemy(
      'sine',
      baseX,
      -28 - i * 26,
      sinePattern({ speed, amplitude, frequency, baseX, phase: i * 0.25 })
    ));
  }
}

function spawnSpiralIn(enemies, opts = {}) {
  const count = opts.count ?? 8;
  const cx = opts.centerX ?? GAME_W / 2;
  const cy = opts.centerY ?? -40;
  const radius = opts.radius ?? 90;
  const halfW = 12, halfH = 12; // spiral enemy is 24x24
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    enemies.push(createEnemy(
      'spiral',
      cx + Math.cos(a) * radius - halfW,
      cy + Math.sin(a) * radius - halfH,
      spiralPattern({
        centerX: cx, centerY: cy,
        radius, angularSpeed: 2.2,
        driftY: 22, startAngle: a,
      })
    ));
  }
}

function spawnTurret(enemies, x) {
  enemies.push(createEnemy('turret', x - 12, -24, turretPattern({ fireInterval: 2.2, firstDelay: 1.4 })));
}

function spawnBoss(enemies) {
  enemies.push(createEnemy('boss', GAME_W / 2 - 40, -80, bossPattern()));
}

// ===== Waves =====
// Each wave: spawns timeline + clearBonus. duration is how long between first spawn and expected clear.

export const WAVES = [
  { // Wave 1 — intro, V-formations
    clearBonus: 100,
    spawns: [
      { at: 0.8, fn: (enemies) => spawnV(enemies, GAME_W / 2) },
      { at: 5.0, fn: (enemies) => spawnV(enemies, GAME_W / 2 - 40) },
      { at: 7.5, fn: (enemies) => spawnV(enemies, GAME_W / 2 + 40) },
    ],
  },
  { // Wave 2 — terrain introduced
    clearBonus: 200,
    spawns: [
      { at: 0.8, fn: (enemies) => spawnV(enemies, GAME_W / 2) },
      { at: 3.0, fn: (enemies) => spawnTurret(enemies, 60) },
      { at: 4.5, fn: (enemies) => spawnTurret(enemies, 180) },
      { at: 7.0, fn: (enemies) => spawnSineLine(enemies, 24, 1) },
    ],
  },
  { // Wave 3 — sine pressure + turrets
    clearBonus: 300,
    spawns: [
      { at: 0.5, fn: (enemies) => spawnSineLine(enemies, 24, 1) },
      { at: 3.0, fn: (enemies) => spawnTurret(enemies, 40) },
      { at: 4.0, fn: (enemies) => spawnTurret(enemies, 120) },
      { at: 5.0, fn: (enemies) => spawnTurret(enemies, 200) },
      { at: 6.5, fn: (enemies) => spawnSineLine(enemies, GAME_W - 24, -1, { frequency: 2.2 }) },
    ],
  },
  { // Wave 4 — spiral debut + Vs
    clearBonus: 400,
    spawns: [
      { at: 0.5, fn: (enemies) => spawnSpiralIn(enemies) },
      { at: 6.0, fn: (enemies) => spawnV(enemies, GAME_W / 2 - 40) },
      { at: 7.5, fn: (enemies) => spawnV(enemies, GAME_W / 2 + 40) },
    ],
  },
  { // Wave 5 — mixed pressure
    clearBonus: 500,
    spawns: [
      { at: 0.5, fn: (enemies) => spawnSineLine(enemies, 20, 1, { count: 5 }) },
      { at: 2.0, fn: (enemies) => spawnTurret(enemies, 60) },
      { at: 3.0, fn: (enemies) => spawnTurret(enemies, 180) },
      { at: 4.5, fn: (enemies) => spawnSpiralIn(enemies, { centerX: GAME_W / 2 - 20 }) },
      { at: 6.0, fn: (enemies) => spawnTurret(enemies, 100) },
      { at: 7.0, fn: (enemies) => spawnTurret(enemies, 160) },
    ],
  },
  { // Wave 6 — finale: spirals + boss
    clearBonus: 1000,
    spawns: [
      { at: 0.5, fn: (enemies) => spawnSpiralIn(enemies, { centerX: GAME_W / 2 - 30 }) },
      { at: 2.0, fn: (enemies) => spawnSpiralIn(enemies, { centerX: GAME_W / 2 + 30 }) },
      { at: 6.0, fn: (enemies) => spawnV(enemies, GAME_W / 2) },
      { at: 9.0, fn: (enemies) => spawnBoss(enemies) },
    ],
  },
];

export function createSpawner(waveIndex) {
  const wave = WAVES[waveIndex];
  return {
    waveIndex,
    t: 0,
    pending: wave.spawns.map((s) => ({ ...s })),
    wave,
    done: false,
  };
}

export function updateSpawner(spawner, dt, enemies) {
  spawner.t += dt;
  for (let i = spawner.pending.length - 1; i >= 0; i--) {
    const s = spawner.pending[i];
    if (spawner.t >= s.at) {
      s.fn(enemies);
      spawner.pending.splice(i, 1);
    }
  }
  if (spawner.pending.length === 0) spawner.done = true;
}

export function isWaveClear(spawner, enemies) {
  return spawner.done && enemies.length === 0;
}

export function getClearBonus(waveIndex) {
  return WAVES[waveIndex].clearBonus;
}
