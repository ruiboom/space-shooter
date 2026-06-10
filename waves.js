import { GAME_W, mulberry32 } from './util.js';
import {
  createEnemy,
  straightPattern, sinePattern, spiralPattern, turretPattern,
  diverPattern, weaverPattern, hunterPattern, wardenPattern, bossPattern,
} from './enemies.js';

// ===== Difficulty scaling =====
// Speeds/fire rates ramp with wave index but are capped so the endless game
// stays (barely) dodgeable; numbers and HP keep climbing instead.
const spd = (wi) => Math.min(2.1, 1 + wi * 0.06);
const bulletSpd = (wi) => Math.min(200, 95 + wi * 6);
const gruntHp = (wi) => Math.min(5, 1 + Math.floor(wi / 4));
const sineHp = (wi) => Math.min(4, 1 + Math.floor(wi / 7));
const turretHp = (wi) => Math.min(8, 3 + Math.floor(wi / 5));
const spiralHp = (wi) => Math.min(5, 2 + Math.floor(wi / 8));
const weaverHp = (wi) => Math.min(5, 2 + Math.floor(wi / 9));
const hunterHp = (wi) => Math.min(6, 3 + Math.floor(wi / 9));

// ===== Formation spawners =====

function spawnV(enemies, centerX, wi, opts = {}) {
  const speed = (opts.speed ?? 58) * spd(wi);
  const hp = gruntHp(wi);
  const fireInterval = opts.shooting ? Math.max(1.3, 2.8 - wi * 0.13) : 0;
  const offsets = [
    { dx: -44, dy: 0 },
    { dx: -22, dy: -14 },
    { dx: 0,   dy: -28 },
    { dx: 22,  dy: -14 },
    { dx: 44,  dy: 0 },
  ];
  for (const { dx, dy } of offsets) {
    enemies.push(createEnemy(
      'grunt', centerX + dx - 12, -28 + dy,
      straightPattern({ speed, fireInterval, bulletSpeed: bulletSpd(wi) }),
      { hp, maxHp: hp }
    ));
  }
}

function spawnSineLine(enemies, startX, dir, wi, opts = {}) {
  const count = opts.count ?? 6;
  const speed = (opts.speed ?? 42) * spd(wi);
  const amplitude = opts.amplitude ?? 70;
  const frequency = (opts.frequency ?? 1.8) + Math.min(1, wi * 0.05);
  const hp = sineHp(wi);
  for (let i = 0; i < count; i++) {
    const baseX = startX + dir * i * 14;
    enemies.push(createEnemy(
      'sine', baseX, -28 - i * 26,
      sinePattern({ speed, amplitude, frequency, baseX, phase: i * 0.25 }),
      { hp, maxHp: hp }
    ));
  }
}

function spawnSpiralIn(enemies, wi, opts = {}) {
  const count = opts.count ?? 8;
  const cx = opts.centerX ?? GAME_W / 2;
  const cy = opts.centerY ?? -40;
  const radius = opts.radius ?? 90;
  const halfW = 12, halfH = 12;
  const hp = spiralHp(wi);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    enemies.push(createEnemy(
      'spiral',
      cx + Math.cos(a) * radius - halfW,
      cy + Math.sin(a) * radius - halfH,
      spiralPattern({
        centerX: cx, centerY: cy,
        radius, angularSpeed: Math.min(3.4, 2.2 + wi * 0.08),
        driftY: Math.min(55, 22 + wi * 2), startAngle: a,
      }),
      { hp, maxHp: hp }
    ));
  }
}

function spawnTurret(enemies, x, wi) {
  const hp = turretHp(wi);
  enemies.push(createEnemy(
    'turret', x - 12, -22,
    turretPattern({
      fireInterval: Math.max(0.9, 2.2 - wi * 0.11),
      firstDelay: 1.3,
      bulletSpeed: Math.min(190, 105 + wi * 7),
    }),
    { hp, maxHp: hp }
  ));
}

function spawnDivers(enemies, count, wi) {
  const gap = GAME_W / (count + 1);
  for (let i = 0; i < count; i++) {
    enemies.push(createEnemy(
      'diver', gap * (i + 1) - 8, -26 - (i % 3) * 22,
      diverPattern({
        cruiseSpeed: 50 * spd(wi),
        dashSpeed: Math.min(330, 200 + wi * 9),
        lockY: 40 + (i % 4) * 18,
      })
    ));
  }
}

function spawnWeavers(enemies, count, wi) {
  const hp = weaverHp(wi);
  for (let i = 0; i < count; i++) {
    const baseX = 40 + (i * 160 / Math.max(1, count - 1 || 1)) + (i % 2) * 10;
    enemies.push(createEnemy(
      'weaver', baseX, -24 - i * 30,
      weaverPattern({
        speed: 36 * spd(wi),
        amplitude: 55 + (i % 2) * 20,
        frequency: 1.9 + Math.min(1, wi * 0.05),
        baseX, phase: i * 0.6,
        fireInterval: Math.max(1.0, 1.9 - wi * 0.08),
        bulletSpeed: bulletSpd(wi),
      }),
      { hp, maxHp: hp }
    ));
  }
}

function spawnHunters(enemies, count, wi) {
  const hp = hunterHp(wi);
  for (let i = 0; i < count; i++) {
    const x = 30 + (i * (GAME_W - 84) / Math.max(1, count - 1 || 1));
    enemies.push(createEnemy(
      'hunter', x, -28 - i * 20,
      hunterPattern({
        hoverY: 50 + (i % 2) * 24,
        strafe: Math.min(110, 60 + wi * 3),
        fireInterval: Math.max(1.1, 2.0 - wi * 0.08),
        bulletSpeed: Math.min(190, 125 + wi * 6),
      }),
      { hp, maxHp: hp }
    ));
  }
}

function spawnWarden(enemies, opts = {}) {
  const hp = Math.round(35 * (opts.hpScale ?? 1));
  enemies.push(createEnemy(
    'warden', (opts.x ?? GAME_W / 2 - 32), -60,
    wardenPattern({ mul: opts.mul ?? 1 }),
    { hp, maxHp: hp }
  ));
}

function spawnBoss(enemies, opts = {}) {
  const hp = Math.round(110 * (opts.hpScale ?? 1));
  enemies.push(createEnemy(
    'boss', GAME_W / 2 - 48, -80,
    bossPattern({ mul: opts.mul ?? 1.15 }),
    { hp, maxHp: hp }
  ));
}

// ===== Authored campaign (waves 1-12) =====
// Each wave: spawn timeline + clearBonus. Waves with `endOnBossDeath` finish
// (remaining mobs chain-detonate) as soon as their boss falls.

const AUTHORED = [
  { // Wave 1 — intro: V-formations, gentle
    clearBonus: 100,
    spawns: [
      { at: 0.8,  fn: (e) => spawnV(e, GAME_W / 2, 0) },
      { at: 4.0,  fn: (e) => spawnV(e, GAME_W / 2 - 40, 0) },
      { at: 6.5,  fn: (e) => spawnV(e, GAME_W / 2 + 40, 0) },
      { at: 9.5,  fn: (e) => spawnSineLine(e, 24, 1, 0, { count: 5 }) },
    ],
  },
  { // Wave 2 — turrets join the party
    clearBonus: 200,
    spawns: [
      { at: 0.6,  fn: (e) => spawnV(e, GAME_W / 2, 1) },
      { at: 2.5,  fn: (e) => spawnTurret(e, 60, 1) },
      { at: 4.0,  fn: (e) => spawnTurret(e, 180, 1) },
      { at: 5.5,  fn: (e) => spawnSineLine(e, 24, 1, 1) },
      { at: 8.5,  fn: (e) => spawnV(e, GAME_W / 2 - 30, 1) },
      { at: 10.0, fn: (e) => spawnTurret(e, 120, 1) },
    ],
  },
  { // Wave 3 — kamikaze divers debut
    clearBonus: 300,
    spawns: [
      { at: 0.6,  fn: (e) => spawnDivers(e, 4, 2) },
      { at: 3.0,  fn: (e) => spawnV(e, GAME_W / 2 - 40, 2) },
      { at: 4.5,  fn: (e) => spawnV(e, GAME_W / 2 + 40, 2) },
      { at: 6.5,  fn: (e) => spawnDivers(e, 5, 2) },
      { at: 8.0,  fn: (e) => spawnTurret(e, 120, 2) },
      { at: 10.0, fn: (e) => spawnSineLine(e, GAME_W - 24, -1, 2, { frequency: 2.2 }) },
    ],
  },
  { // Wave 4 — hell wasps drop stingers
    clearBonus: 400,
    spawns: [
      { at: 0.6,  fn: (e) => spawnWeavers(e, 4, 3) },
      { at: 3.0,  fn: (e) => spawnTurret(e, 50, 3) },
      { at: 3.6,  fn: (e) => spawnTurret(e, 190, 3) },
      { at: 5.5,  fn: (e) => spawnSineLine(e, 24, 1, 3) },
      { at: 7.5,  fn: (e) => spawnWeavers(e, 5, 3) },
      { at: 10.0, fn: (e) => spawnV(e, GAME_W / 2, 3) },
    ],
  },
  { // Wave 5 — spiral storms + divers
    clearBonus: 500,
    spawns: [
      { at: 0.5,  fn: (e) => spawnSpiralIn(e, 4) },
      { at: 3.0,  fn: (e) => spawnDivers(e, 4, 4) },
      { at: 5.0,  fn: (e) => spawnTurret(e, 80, 4) },
      { at: 5.6,  fn: (e) => spawnTurret(e, 160, 4) },
      { at: 7.5,  fn: (e) => spawnSpiralIn(e, 4, { centerX: GAME_W / 2 - 40 }) },
      { at: 10.0, fn: (e) => spawnV(e, GAME_W / 2 + 30, 4, { shooting: true }) },
    ],
  },
  { // Wave 6 — THE WARDEN (mid-boss)
    clearBonus: 800,
    endOnBossDeath: true,
    spawns: [
      { at: 0.5,  fn: (e) => spawnSineLine(e, 24, 1, 5, { count: 5 }) },
      { at: 4.0,  fn: (e) => spawnWarden(e), boss: true },
      { at: 12.0, fn: (e) => spawnDivers(e, 3, 5) },
      { at: 22.0, fn: (e) => spawnDivers(e, 3, 5) },
      { at: 32.0, fn: (e) => spawnWeavers(e, 2, 5) },
    ],
  },
  { // Wave 7 — mantis hunters debut
    clearBonus: 850,
    spawns: [
      { at: 0.6,  fn: (e) => spawnHunters(e, 2, 6) },
      { at: 3.0,  fn: (e) => spawnWeavers(e, 4, 6) },
      { at: 6.0,  fn: (e) => spawnV(e, GAME_W / 2, 6, { shooting: true }) },
      { at: 8.0,  fn: (e) => spawnHunters(e, 2, 6) },
      { at: 10.5, fn: (e) => spawnSineLine(e, GAME_W - 24, -1, 6) },
    ],
  },
  { // Wave 8 — turret gauntlet
    clearBonus: 950,
    spawns: [
      { at: 0.5,  fn: (e) => spawnTurret(e, 40, 7) },
      { at: 1.1,  fn: (e) => spawnTurret(e, 100, 7) },
      { at: 1.7,  fn: (e) => spawnTurret(e, 160, 7) },
      { at: 2.3,  fn: (e) => spawnTurret(e, 220, 7) },
      { at: 3.5,  fn: (e) => spawnSineLine(e, 24, 1, 7) },
      { at: 5.0,  fn: (e) => spawnSineLine(e, GAME_W - 24, -1, 7) },
      { at: 7.0,  fn: (e) => spawnDivers(e, 6, 7) },
      { at: 9.5,  fn: (e) => spawnV(e, GAME_W / 2, 7, { shooting: true }) },
      { at: 11.5, fn: (e) => spawnWeavers(e, 4, 7) },
    ],
  },
  { // Wave 9 — double spiral + hunters
    clearBonus: 1050,
    spawns: [
      { at: 0.5,  fn: (e) => spawnSpiralIn(e, 8, { centerX: GAME_W / 2 - 45 }) },
      { at: 2.0,  fn: (e) => spawnSpiralIn(e, 8, { centerX: GAME_W / 2 + 45 }) },
      { at: 4.5,  fn: (e) => spawnHunters(e, 3, 8) },
      { at: 7.0,  fn: (e) => spawnV(e, GAME_W / 2, 8, { shooting: true }) },
      { at: 9.0,  fn: (e) => spawnDivers(e, 5, 8) },
      { at: 11.0, fn: (e) => spawnTurret(e, 70, 8) },
      { at: 11.6, fn: (e) => spawnTurret(e, 170, 8) },
    ],
  },
  { // Wave 10 — swarm pressure
    clearBonus: 1200,
    spawns: [
      { at: 0.5,  fn: (e) => spawnWeavers(e, 6, 9) },
      { at: 3.0,  fn: (e) => spawnDivers(e, 6, 9) },
      { at: 5.5,  fn: (e) => spawnTurret(e, 40, 9) },
      { at: 6.1,  fn: (e) => spawnTurret(e, 120, 9) },
      { at: 6.7,  fn: (e) => spawnTurret(e, 200, 9) },
      { at: 8.5,  fn: (e) => spawnHunters(e, 3, 9) },
      { at: 11.0, fn: (e) => spawnSineLine(e, 24, 1, 9) },
      { at: 12.0, fn: (e) => spawnSineLine(e, GAME_W - 24, -1, 9) },
      { at: 14.0, fn: (e) => spawnSpiralIn(e, 9) },
    ],
  },
  { // Wave 11 — the rush: everything, fast
    clearBonus: 1400,
    spawns: [
      { at: 0.4,  fn: (e) => spawnV(e, GAME_W / 2, 10, { shooting: true }) },
      { at: 1.6,  fn: (e) => spawnV(e, GAME_W / 2 - 50, 10, { shooting: true }) },
      { at: 2.8,  fn: (e) => spawnV(e, GAME_W / 2 + 50, 10, { shooting: true }) },
      { at: 4.5,  fn: (e) => spawnSpiralIn(e, 10, { centerX: GAME_W / 2 - 40 }) },
      { at: 5.5,  fn: (e) => spawnSpiralIn(e, 10, { centerX: GAME_W / 2 + 40 }) },
      { at: 7.5,  fn: (e) => spawnDivers(e, 8, 10) },
      { at: 10.0, fn: (e) => spawnHunters(e, 4, 10) },
      { at: 12.5, fn: (e) => spawnWeavers(e, 6, 10) },
      { at: 15.0, fn: (e) => spawnTurret(e, 60, 10) },
      { at: 15.6, fn: (e) => spawnTurret(e, 180, 10) },
      { at: 17.0, fn: (e) => spawnSineLine(e, 24, 1, 10) },
      { at: 18.0, fn: (e) => spawnSineLine(e, GAME_W - 24, -1, 10) },
    ],
  },
  { // Wave 12 — THE DREADMAW (final authored boss)
    clearBonus: 2500,
    endOnBossDeath: true,
    spawns: [
      { at: 0.5,  fn: (e) => spawnSineLine(e, 24, 1, 11, { count: 5 }) },
      { at: 2.5,  fn: (e) => spawnDivers(e, 4, 11) },
      { at: 6.0,  fn: (e) => spawnBoss(e), boss: true },
      { at: 16.0, fn: (e) => spawnDivers(e, 3, 11) },
      { at: 28.0, fn: (e) => spawnWeavers(e, 3, 11) },
      { at: 40.0, fn: (e) => spawnDivers(e, 4, 11) },
    ],
  },
];

export const AUTHORED_COUNT = AUTHORED.length;

// ===== Endless deep space (wave 13+) =====
// Procedurally generated, seeded by wave index so each wave is stable within
// (and across) runs. Counts and density climb forever; every 3rd wave is a
// boss wave with stacking HP, and from deep enough in, BOTH bosses at once.

function generateWave(i) {
  const r = mulberry32(i * 7919 + 13);
  const n = i - AUTHORED.length; // endless tier, 0-based
  const isBossWave = n % 3 === 2;
  const spawns = [];

  if (isBossWave) {
    const tier = Math.floor(n / 3); // 0 for wave 15, 1 for 18, ...
    const hpScale = 1 + (tier + 1) * 0.45;
    const mul = Math.min(1.9, 1.15 + tier * 0.06);
    const both = tier >= 3; // wave 24+: Warden AND Dreadmaw together
    spawns.push({ at: 0.5, fn: (e) => spawnSineLine(e, 24, 1, i, { count: 5 }) });
    spawns.push({ at: 2.5, fn: (e) => spawnDivers(e, 4 + Math.min(4, tier), i) });
    if (both) {
      spawns.push({ at: 5.0, fn: (e) => spawnWarden(e, { hpScale: hpScale * 0.8, mul, x: GAME_W / 4 - 32 }), boss: true });
      spawns.push({ at: 7.0, fn: (e) => spawnBoss(e, { hpScale, mul }), boss: true });
    } else if (tier % 2 === 0) {
      spawns.push({ at: 5.0, fn: (e) => spawnWarden(e, { hpScale: hpScale * 1.4, mul }), boss: true });
    } else {
      spawns.push({ at: 5.0, fn: (e) => spawnBoss(e, { hpScale, mul }), boss: true });
    }
    // relentless escort pressure while the boss lives
    for (let t = 14; t <= 50; t += 9) {
      const pick = r();
      spawns.push({
        at: t,
        fn: (e) => {
          if (pick < 0.4) spawnDivers(e, 3 + Math.min(3, tier), i);
          else if (pick < 0.7) spawnWeavers(e, 2 + Math.min(3, tier), i);
          else spawnHunters(e, 1 + Math.min(2, tier), i);
        },
      });
    }
    return {
      clearBonus: 1800 + tier * 400,
      endOnBossDeath: true,
      spawns,
    };
  }

  // Regular endless wave: a dense, shuffled barrage.
  const events = 6 + Math.min(12, Math.floor(n * 0.9));
  const gap = Math.max(0.9, 2.1 - n * 0.06);
  let t = 0.5;
  for (let k = 0; k < events; k++) {
    const roll = r();
    const jitter = r();
    spawns.push({
      at: t,
      fn: (e) => {
        if (roll < 0.18)      spawnV(e, 60 + jitter * (GAME_W - 120), i, { shooting: true });
        else if (roll < 0.34) spawnSineLine(e, jitter < 0.5 ? 24 : GAME_W - 24, jitter < 0.5 ? 1 : -1, i);
        else if (roll < 0.48) spawnSpiralIn(e, i, { centerX: 60 + jitter * (GAME_W - 120) });
        else if (roll < 0.64) spawnDivers(e, 4 + Math.min(6, Math.floor(n / 2)), i);
        else if (roll < 0.78) spawnWeavers(e, 3 + Math.min(5, Math.floor(n / 3)), i);
        else if (roll < 0.90) spawnHunters(e, 2 + Math.min(3, Math.floor(n / 4)), i);
        else {
          spawnTurret(e, 40 + jitter * 80, i);
          spawnTurret(e, GAME_W - 40 - jitter * 80, i);
        }
      },
    });
    t += gap * (0.7 + r() * 0.6);
  }
  return {
    clearBonus: 900 + n * 130,
    spawns,
  };
}

const waveCache = new Map();

export function getWaveDef(i) {
  if (i < AUTHORED.length) return AUTHORED[i];
  if (!waveCache.has(i)) waveCache.set(i, generateWave(i));
  return waveCache.get(i);
}

export function createSpawner(waveIndex) {
  const wave = getWaveDef(waveIndex);
  return {
    waveIndex,
    t: 0,
    pending: wave.spawns.map((s) => ({ ...s })),
    wave,
    done: false,
    bossSpawned: false,
  };
}

export function updateSpawner(spawner, dt, enemies) {
  spawner.t += dt;
  for (let i = spawner.pending.length - 1; i >= 0; i--) {
    const s = spawner.pending[i];
    if (spawner.t >= s.at) {
      s.fn(enemies);
      if (s.boss) spawner.bossSpawned = true;
      spawner.pending.splice(i, 1);
    }
  }
  if (spawner.pending.length === 0) spawner.done = true;
}

export function isWaveClear(spawner, enemies) {
  return spawner.done && enemies.length === 0;
}

export function getClearBonus(waveIndex) {
  return getWaveDef(waveIndex).clearBonus;
}
