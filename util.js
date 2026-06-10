export const GAME_W = 240;
export const GAME_H = 320;
export const DISPLAY_SCALE = 2;

// PICO-8 palette (16 colors)
export const PALETTE = [
  '#000000', // 0  black
  '#1D2B53', // 1  dark blue
  '#7E2553', // 2  dark purple
  '#008751', // 3  dark green
  '#AB5236', // 4  brown
  '#5F574F', // 5  dark gray
  '#C2C3C7', // 6  light gray
  '#FFF1E8', // 7  white
  '#FF004D', // 8  red
  '#FFA300', // 9  orange
  '#FFEC27', // 10 yellow
  '#00E436', // 11 green
  '#29ADFF', // 12 blue
  '#83769C', // 13 indigo
  '#FF77A8', // 14 pink
  '#FFCCAA', // 15 peach
];

export const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
export const lerp = (a, b, t) => a + (b - a) * t;

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
      && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rng = mulberry32(Date.now() & 0xffffffff);

// ===== Particle / FX system =====
// Particles are typed via `kind`:
//   'spark'  — additive glowing ember, color ramps white→yellow→orange→red
//   'flash'  — additive radial burst at explosion center
//   'ring'   — additive expanding shockwave circle
//   'smoke'  — soft dark cloud that grows and fades
//   'debris' — hull chunks with slight gravity
//   default  — plain colored square (legacy spawnParticles)

export function spawnParticles(particles, x, y, count, opts = {}) {
  const {
    speed = 80, life = 0.5, colorIdx = 9, size = 2,
    spread = Math.PI * 2, baseAngle = 0, kind = 'plain',
  } = opts;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (rng() - 0.5) * spread;
    const s = speed * (0.4 + rng() * 0.8);
    const l = life * (0.7 + rng() * 0.6);
    particles.push({
      kind,
      x, y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life: l, maxLife: l,
      colorIdx,
      size,
    });
  }
}

// A proper multi-element explosion: flash, shockwave ring(s), fire sparks,
// debris chunks and smoke. `size` ~1 for grunts, ~1.5 turrets, 2-3 bosses.
export function spawnExplosion(particles, x, y, opts = {}) {
  const size = opts.size ?? 1;
  const ringColor = opts.ringColor ?? 7;

  // center flash
  particles.push({
    kind: 'flash', x, y, vx: 0, vy: 0,
    life: 0.1 + 0.05 * size, maxLife: 0.1 + 0.05 * size,
    r: 7 + 6 * size, colorIdx: 7,
  });

  // shockwave rings
  particles.push({
    kind: 'ring', x, y, vx: 0, vy: 0,
    life: 0.35, maxLife: 0.35,
    r: 2, vr: 55 + 45 * size, colorIdx: ringColor,
  });
  if (size >= 1.5) {
    particles.push({
      kind: 'ring', x, y, vx: 0, vy: 0,
      life: 0.45, maxLife: 0.45, delay: 0.1,
      r: 2, vr: 45 + 40 * size, colorIdx: 9,
    });
  }

  // fire sparks (additive embers)
  const sparkCount = Math.floor(12 * size);
  for (let i = 0; i < sparkCount; i++) {
    const a = rng() * Math.PI * 2;
    const s = (90 + 70 * size) * (0.3 + rng() * 0.9);
    const l = (0.4 + rng() * 0.45) * Math.min(size, 1.8);
    particles.push({
      kind: 'spark', x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: l, maxLife: l, size: rng() < 0.3 ? 3 : 2,
    });
  }

  // debris chunks
  const debrisCount = Math.floor(5 * size);
  for (let i = 0; i < debrisCount; i++) {
    const a = rng() * Math.PI * 2;
    const s = (50 + 40 * size) * (0.4 + rng() * 0.8);
    const l = 0.5 + rng() * 0.5;
    particles.push({
      kind: 'debris', x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
      life: l, maxLife: l,
      colorIdx: rng() < 0.5 ? 5 : 6, size: rng() < 0.4 ? 3 : 2,
    });
  }

  // smoke puffs
  const smokeCount = Math.floor(4 * size);
  for (let i = 0; i < smokeCount; i++) {
    const a = rng() * Math.PI * 2;
    const s = 18 + rng() * 22;
    const l = 0.6 + rng() * 0.5;
    particles.push({
      kind: 'smoke',
      x: x + (rng() - 0.5) * 8 * size,
      y: y + (rng() - 0.5) * 8 * size,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 14,
      life: l, maxLife: l, size: 2 + rng() * 2 * size,
    });
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.delay && p.delay > 0) { p.delay -= dt; continue; }
    switch (p.kind) {
      case 'ring':
        p.r += p.vr * dt;
        p.vr *= Math.pow(0.5, dt * 4);
        break;
      case 'flash':
        break;
      case 'smoke':
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.97; p.vy *= 0.97;
        p.size += dt * 4;
        break;
      case 'debris':
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.96; p.vy = p.vy * 0.96 + 70 * dt;
        break;
      default:
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.92; p.vy *= 0.92;
        break;
    }
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function sparkColor(frac) {
  if (frac > 0.7) return PALETTE[7];
  if (frac > 0.45) return PALETTE[10];
  if (frac > 0.22) return PALETTE[9];
  return PALETTE[8];
}

export function drawParticles(ctx, particles) {
  // pass 1: normal-blend (smoke, debris, plain)
  for (const p of particles) {
    if (p.delay && p.delay > 0) continue;
    const frac = p.life / p.maxLife;
    if (p.kind === 'smoke') {
      ctx.globalAlpha = frac * 0.45;
      ctx.fillStyle = PALETTE[5];
      const s = p.size;
      ctx.fillRect(Math.floor(p.x - s / 2), Math.floor(p.y - s / 2), Math.ceil(s), Math.ceil(s));
      ctx.globalAlpha = 1;
    } else if (p.kind === 'debris' || p.kind === 'plain' || !p.kind) {
      ctx.fillStyle = PALETTE[p.colorIdx ?? 9];
      const s = frac < 0.3 ? Math.max(1, p.size - 1) : p.size;
      ctx.fillRect(Math.floor(p.x - s / 2), Math.floor(p.y - s / 2), s, s);
    }
  }
  // pass 2: additive (sparks, flash, ring)
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    if (p.delay && p.delay > 0) continue;
    const frac = p.life / p.maxLife;
    if (p.kind === 'spark') {
      ctx.fillStyle = sparkColor(frac);
      const s = frac < 0.3 ? Math.max(1, p.size - 1) : p.size;
      ctx.fillRect(Math.floor(p.x - s / 2), Math.floor(p.y - s / 2), s, s);
    } else if (p.kind === 'flash') {
      const r = p.r * (1.1 - frac * 0.4);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(255,241,232,${0.9 * frac})`);
      g.addColorStop(0.5, `rgba(255,163,0,${0.5 * frac})`);
      g.addColorStop(1, 'rgba(255,0,77,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'ring') {
      ctx.strokeStyle = PALETTE[p.colorIdx ?? 7];
      ctx.globalAlpha = frac * 0.9;
      ctx.lineWidth = Math.max(1, 2.5 * frac);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
