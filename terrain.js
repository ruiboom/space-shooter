import { GAME_W, GAME_H, PALETTE, rng } from './util.js';

// Stars: parallax background; drawn procedurally onto an offscreen tile canvas.
// Tile is GAME_W × (GAME_H * 2) tall. Scrolled with wrap.

const TILE_H = GAME_H * 2;

export function createTerrain() {
  const stars = document.createElement('canvas');
  stars.width = GAME_W;
  stars.height = TILE_H;
  const g = stars.getContext('2d');
  g.fillStyle = PALETTE[0];
  g.fillRect(0, 0, GAME_W, TILE_H);
  // 3 layers of stars: slow (small, dim), medium, fast (big, bright)
  function layer(count, colorIdx, size) {
    g.fillStyle = PALETTE[colorIdx];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rng() * GAME_W);
      const y = Math.floor(rng() * TILE_H);
      g.fillRect(x, y, size, size);
    }
  }
  layer(120, 5, 1);   // dim small
  layer(70, 13, 1);   // indigo small
  layer(40, 6, 1);    // bright small
  layer(16, 7, 2);    // bright big

  // A few nebulae / gas clouds — just tinted blobs
  g.globalAlpha = 0.18;
  for (let i = 0; i < 6; i++) {
    const cx = rng() * GAME_W;
    const cy = rng() * TILE_H;
    const r = 20 + rng() * 40;
    g.fillStyle = PALETTE[[1, 2, 13, 12][Math.floor(rng() * 4)]];
    for (let j = 0; j < 8; j++) {
      const ox = (rng() - 0.5) * r;
      const oy = (rng() - 0.5) * r;
      const rr = r * (0.4 + rng() * 0.6);
      g.fillRect(cx + ox - rr / 2, cy + oy - rr / 2, rr, rr);
    }
  }
  g.globalAlpha = 1;

  return {
    canvas: stars,
    scrollY: 0,
    scrollSpeed: 38,
    tileH: TILE_H,
  };
}

export function updateTerrain(terrain, dt) {
  terrain.scrollY = (terrain.scrollY + terrain.scrollSpeed * dt) % terrain.tileH;
}

export function drawTerrain(ctx, terrain) {
  const y = Math.floor(terrain.scrollY);
  ctx.drawImage(terrain.canvas, 0, y - terrain.tileH);
  ctx.drawImage(terrain.canvas, 0, y);
}
