import { PALETTE } from './util.js';

// 3x5 bitmap font. Each char: 5 rows, each row is 3 bits (MSB = leftmost).
const GLYPHS = {
  'A': [0b010, 0b101, 0b111, 0b101, 0b101],
  'B': [0b110, 0b101, 0b110, 0b101, 0b110],
  'C': [0b011, 0b100, 0b100, 0b100, 0b011],
  'D': [0b110, 0b101, 0b101, 0b101, 0b110],
  'E': [0b111, 0b100, 0b110, 0b100, 0b111],
  'F': [0b111, 0b100, 0b110, 0b100, 0b100],
  'G': [0b011, 0b100, 0b101, 0b101, 0b011],
  'H': [0b101, 0b101, 0b111, 0b101, 0b101],
  'I': [0b111, 0b010, 0b010, 0b010, 0b111],
  'J': [0b001, 0b001, 0b001, 0b101, 0b010],
  'K': [0b101, 0b101, 0b110, 0b101, 0b101],
  'L': [0b100, 0b100, 0b100, 0b100, 0b111],
  'M': [0b101, 0b111, 0b111, 0b101, 0b101],
  'N': [0b101, 0b111, 0b111, 0b111, 0b101],
  'O': [0b010, 0b101, 0b101, 0b101, 0b010],
  'P': [0b110, 0b101, 0b110, 0b100, 0b100],
  'Q': [0b010, 0b101, 0b101, 0b111, 0b011],
  'R': [0b110, 0b101, 0b110, 0b101, 0b101],
  'S': [0b011, 0b100, 0b010, 0b001, 0b110],
  'T': [0b111, 0b010, 0b010, 0b010, 0b010],
  'U': [0b101, 0b101, 0b101, 0b101, 0b111],
  'V': [0b101, 0b101, 0b101, 0b010, 0b010],
  'W': [0b101, 0b101, 0b111, 0b111, 0b101],
  'X': [0b101, 0b010, 0b010, 0b010, 0b101],
  'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
  'Z': [0b111, 0b001, 0b010, 0b100, 0b111],
  '0': [0b010, 0b101, 0b101, 0b101, 0b010],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b110, 0b001, 0b010, 0b100, 0b111],
  '3': [0b110, 0b001, 0b010, 0b001, 0b110],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b110, 0b001, 0b110],
  '6': [0b011, 0b100, 0b110, 0b101, 0b010],
  '7': [0b111, 0b001, 0b010, 0b010, 0b010],
  '8': [0b010, 0b101, 0b010, 0b101, 0b010],
  '9': [0b010, 0b101, 0b011, 0b001, 0b110],
  '!': [0b010, 0b010, 0b010, 0b000, 0b010],
  '?': [0b110, 0b001, 0b010, 0b000, 0b010],
  '%': [0b101, 0b001, 0b010, 0b100, 0b101],
  '#': [0b101, 0b111, 0b101, 0b111, 0b101],
  '=': [0b000, 0b111, 0b000, 0b111, 0b000],
  '+': [0b000, 0b010, 0b111, 0b010, 0b000],
  '-': [0b000, 0b000, 0b111, 0b000, 0b000],
  '.': [0b000, 0b000, 0b000, 0b000, 0b010],
  ':': [0b000, 0b010, 0b000, 0b010, 0b000],
  '$': [0b011, 0b110, 0b010, 0b011, 0b110],
  '/': [0b001, 0b001, 0b010, 0b100, 0b100],
  '>': [0b100, 0b010, 0b001, 0b010, 0b100],
  '<': [0b001, 0b010, 0b100, 0b010, 0b001],
  '*': [0b000, 0b010, 0b111, 0b010, 0b000],
  '(': [0b001, 0b010, 0b010, 0b010, 0b001],
  ')': [0b100, 0b010, 0b010, 0b010, 0b100],
  ',': [0b000, 0b000, 0b000, 0b010, 0b100],
  "'": [0b010, 0b010, 0b000, 0b000, 0b000],
  ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
};

export function drawChar(ctx, ch, x, y, colorIdx = 7) {
  const g = GLYPHS[ch] || GLYPHS['?'];
  ctx.fillStyle = PALETTE[colorIdx];
  for (let row = 0; row < 5; row++) {
    const bits = g[row];
    for (let col = 0; col < 3; col++) {
      if (bits & (1 << (2 - col))) {
        ctx.fillRect(x + col, y + row, 1, 1);
      }
    }
  }
}

// spacing of 1 px -> each char takes 4 px
export function drawText(ctx, text, x, y, colorIdx = 7) {
  let cx = x;
  const s = String(text).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    drawChar(ctx, s[i], cx, y, colorIdx);
    cx += 4;
  }
}

export function textWidth(text) {
  return String(text).length * 4 - 1;
}

export function drawTextCentered(ctx, text, cx, y, colorIdx = 7) {
  const w = textWidth(text);
  drawText(ctx, text, Math.floor(cx - w / 2), y, colorIdx);
}

// ===== Sprites =====
// Definition format: array of equal-length strings. Each char is a hex palette
// index (0-f, uppercase too), or '.' for transparent.

const SPRITE_DEFS = {
  player: [
    '....7....',
    '....7....',
    '...767...',
    '..66666..',
    '.6677766.',
    '666777666',
    '66.777.66',
    '.6.777.6.',
    '.c.9c9.c.',
    '...c.c...',
    '...9.9...',
  ],
  player_thrust: [
    '..9.9..',
    '.9a9a9.',
    '9aaaaa9',
    '.9999..',
    '..9....',
  ],
  player_bullet: [
    '.a.',
    'aaa',
    '7a7',
    '.a.',
  ],
  enemy_bullet: [
    '.8.',
    '888',
    '.8.',
  ],
  enemy_grunt: [
    '.8888.',
    '822228',
    '822228',
    '888888',
    '.2882.',
    '.8..8.',
  ],
  enemy_sine: [
    '..bb..',
    '.b33b.',
    'b3333b',
    'b3773b',
    '.b33b.',
    '..bb..',
  ],
  enemy_spiral: [
    '..ee..',
    '.e22e.',
    'e2882e',
    'e2882e',
    '.e22e.',
    '..ee..',
  ],
  turret: [
    '.5555.',
    '566665',
    '566665',
    '556655',
    '.5..5.',
  ],
  turret_barrel: [
    '.8.',
    '.8.',
    '.8.',
  ],
  powerup_shield: [
    '.cccc.',
    'c7777c',
    'c7cc7c',
    'c7cc7c',
    'c7777c',
    '.cccc.',
  ],
  powerup_rapid: [
    '.aaaa.',
    'a9aa9a',
    'a9aa9a',
    'a999aa',
    'a9aa9a',
    '.aaaa.',
  ],
  powerup_life: [
    '.e.e..',
    'eeeee.',
    'eeeee.',
    '.eee..',
    '..e...',
  ],
  star_s: ['7'],
  star_m: ['.7.', '777', '.7.'],
  heart: [
    '.e.e.',
    'eeeee',
    'eeeee',
    '.eee.',
    '..e..',
  ],
};

const SPRITES = {};

// Per-sprite bake scale. Default 2 (double the pixel-art). HUD/decoration
// sprites opt-out via scale: 1 to stay compact.
const SPRITE_SCALES = {
  heart: 1,
  star_s: 1,
  star_m: 1,
};
const DEFAULT_SCALE = 2;

function scaleFor(id) {
  return SPRITE_SCALES[id] ?? DEFAULT_SCALE;
}

export function bakeSprites() {
  for (const id in SPRITE_DEFS) {
    const scale = scaleFor(id);
    SPRITES[id] = bakeSprite(SPRITE_DEFS[id], scale);
    SPRITES[id + '_flash'] = bakeSpriteFlash(SPRITE_DEFS[id], scale);
  }
}

function bakeSprite(rows, scale) {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      const idx = parseInt(ch, 16);
      g.fillStyle = PALETTE[idx];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return { canvas: c, w: w * scale, h: h * scale };
}

// White-silhouette version for hit flash
function bakeSpriteFlash(rows, scale) {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  g.fillStyle = PALETTE[7];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== '.') g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return { canvas: c, w: w * scale, h: h * scale };
}

export function drawSprite(ctx, id, x, y) {
  const s = SPRITES[id];
  if (!s) return;
  ctx.drawImage(s.canvas, Math.floor(x), Math.floor(y));
}

export function drawSpriteFlash(ctx, id, x, y) {
  const s = SPRITES[id + '_flash'];
  if (!s) return;
  ctx.drawImage(s.canvas, Math.floor(x), Math.floor(y));
}

export function getSprite(id) {
  return SPRITES[id];
}
