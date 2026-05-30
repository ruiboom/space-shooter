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

export function spawnParticles(particles, x, y, count, opts = {}) {
  const {
    speed = 80, life = 0.5, colorIdx = 9, size = 2,
    spread = Math.PI * 2, baseAngle = 0,
  } = opts;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (rng() - 0.5) * spread;
    const s = speed * (0.4 + rng() * 0.8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life: life * (0.7 + rng() * 0.6),
      colorIdx,
      size,
    });
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.fillStyle = PALETTE[p.colorIdx];
    const s = p.life < 0.15 ? Math.max(1, p.size - 1) : p.size;
    ctx.fillRect(Math.floor(p.x - s / 2), Math.floor(p.y - s / 2), s, s);
  }
}
