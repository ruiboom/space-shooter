import { GAME_W, GAME_H, PALETTE, rng } from './util.js';

// Two-layer parallax starfield baked onto offscreen tiles.
// Far layer: dim stars, nebulae and a distant planet, scrolls slowly.
// Near layer: brighter stars with glow, scrolls at full speed.

const TILE_H = GAME_H * 2;

function makeLayer() {
  const c = document.createElement('canvas');
  c.width = GAME_W;
  c.height = TILE_H;
  return c;
}

function starLayer(g, count, colorIdx, size, glow = false) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * GAME_W);
    const y = Math.floor(rng() * TILE_H);
    if (glow && rng() < 0.5) {
      g.globalAlpha = 0.35;
      g.fillStyle = PALETTE[colorIdx];
      g.fillRect(x - 1, y, size + 2, size);
      g.fillRect(x, y - 1, size, size + 2);
      g.globalAlpha = 1;
    }
    g.fillStyle = PALETTE[colorIdx];
    g.fillRect(x, y, size, size);
  }
}

function drawPlanet(g, cx, cy, r, baseIdx, bandIdx) {
  // base disc
  g.fillStyle = PALETTE[baseIdx];
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // banding
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = PALETTE[bandIdx];
  g.globalAlpha = 0.5;
  for (let i = -2; i <= 2; i++) {
    g.fillRect(cx - r, cy + i * (r / 2.2) - 2, r * 2, 3 + (i % 2));
  }
  // terminator shadow
  g.globalAlpha = 0.45;
  g.fillStyle = PALETTE[0];
  g.beginPath();
  g.arc(cx + r * 0.45, cy + r * 0.2, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.globalAlpha = 1;
  // rim light
  g.strokeStyle = PALETTE[6];
  g.globalAlpha = 0.25;
  g.beginPath();
  g.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 1.6);
  g.stroke();
  g.globalAlpha = 1;
}

export function createTerrain() {
  // --- far layer ---
  const far = makeLayer();
  const fg = far.getContext('2d');
  fg.fillStyle = PALETTE[0];
  fg.fillRect(0, 0, GAME_W, TILE_H);

  // nebulae clouds
  const nebulaColors = [1, 2, 13, 12, 3];
  for (let i = 0; i < 9; i++) {
    const cx = rng() * GAME_W;
    const cy = rng() * TILE_H;
    const r = 24 + rng() * 50;
    fg.fillStyle = PALETTE[nebulaColors[Math.floor(rng() * nebulaColors.length)]];
    for (let j = 0; j < 12; j++) {
      fg.globalAlpha = 0.06 + rng() * 0.1;
      const ox = (rng() - 0.5) * r;
      const oy = (rng() - 0.5) * r;
      const rr = r * (0.3 + rng() * 0.6);
      fg.beginPath();
      fg.arc(cx + ox, cy + oy, rr / 2, 0, Math.PI * 2);
      fg.fill();
    }
  }
  fg.globalAlpha = 1;

  // distant planet + tiny moon
  drawPlanet(fg, 40 + rng() * (GAME_W - 80), 90 + rng() * (TILE_H - 180), 22 + rng() * 12, 1, 13);
  drawPlanet(fg, 30 + rng() * (GAME_W - 60), 60 + rng() * (TILE_H - 120), 6 + rng() * 4, 4, 15);

  starLayer(fg, 130, 5, 1);
  starLayer(fg, 80, 13, 1);
  starLayer(fg, 50, 1, 1);

  // --- near layer (transparent background) ---
  const near = makeLayer();
  const ng = near.getContext('2d');
  starLayer(ng, 55, 6, 1);
  starLayer(ng, 26, 7, 1, true);
  starLayer(ng, 12, 7, 2, true);
  starLayer(ng, 8, 12, 1, true);

  return {
    far, near,
    scrollY: 0,
    scrollSpeed: 42,
    farFactor: 0.35,
    tileH: TILE_H,
  };
}

export function updateTerrain(terrain, dt) {
  // wrap at tileH * 20: with farFactor 0.35 both layers land on whole-tile
  // boundaries (20 and 7 tiles respectively), so neither jumps on wrap.
  terrain.scrollY = (terrain.scrollY + terrain.scrollSpeed * dt) % (terrain.tileH * 20);
}

export function drawTerrain(ctx, terrain) {
  const farY = Math.floor((terrain.scrollY * terrain.farFactor) % terrain.tileH);
  ctx.drawImage(terrain.far, 0, farY - terrain.tileH);
  ctx.drawImage(terrain.far, 0, farY);
  const nearY = Math.floor(terrain.scrollY % terrain.tileH);
  ctx.drawImage(terrain.near, 0, nearY - terrain.tileH);
  ctx.drawImage(terrain.near, 0, nearY);
}
