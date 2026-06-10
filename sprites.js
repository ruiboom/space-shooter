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

export function drawChar(ctx, ch, x, y, colorIdx = 7, scale = 1) {
  const g = GLYPHS[ch] || GLYPHS['?'];
  ctx.fillStyle = PALETTE[colorIdx];
  for (let row = 0; row < 5; row++) {
    const bits = g[row];
    for (let col = 0; col < 3; col++) {
      if (bits & (1 << (2 - col))) {
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

// spacing of 1 px -> each char takes 4 px (times scale)
export function drawText(ctx, text, x, y, colorIdx = 7, scale = 1) {
  let cx = x;
  const s = String(text).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    drawChar(ctx, s[i], cx, y, colorIdx, scale);
    cx += 4 * scale;
  }
}

export function textWidth(text, scale = 1) {
  return String(text).length * 4 * scale - scale;
}

export function drawTextCentered(ctx, text, cx, y, colorIdx = 7, scale = 1) {
  const w = textWidth(text, scale);
  drawText(ctx, text, Math.floor(cx - w / 2), y, colorIdx, scale);
}

// ===== Sprites =====
// Definition format: array of equal-length strings. Each char is a hex palette
// index (0-f, uppercase too), or '.' for transparent.
// Animation: sprites with `_b` (and optionally `_c`) variants cycle
// a → b → c → b at runtime. Entries in SPRITE_MIRRORS bake a horizontally
// flipped copy of another def (used for the ship banking right).

const SPRITE_DEFS = {
  // Sleek interceptor: white spine, cyan canopy, gray hull, red wingtips.
  player: [
    '......7......',
    '.....676.....',
    '.....6c6.....',
    '.....6c6.....',
    '....66c66....',
    '....6ccc6....',
    '...66ccc66...',
    '..8666c6668..',
    '.88666766688.',
    '8866677766688',
    '86.6677766.68',
    '8..6677766..8',
    '...55.6.55...',
  ],
  // Banking left: port wing tucks in, engines shift starboard.
  player_bank_l: [
    '......7......',
    '.....676.....',
    '.....6c6.....',
    '.....6c6.....',
    '....66c66....',
    '....6ccc6....',
    '...66ccc66...',
    '..8666c6668..',
    '.88666766688.',
    '.886677766688',
    '.86.677766.68',
    '.8..677766..8',
    '....55.6.55..',
  ],
  // Wingman shuttle: half-size escort fighter.
  shuttle: [
    '....7....',
    '...676...',
    '...6c6...',
    '..66c66..',
    '.866c668.',
    '886666688',
    '8.66766.8',
    '...5.5...',
  ],
  // Homing missile: white tip, gray body, red fins, orange exhaust.
  missile: [
    '.7.',
    '676',
    '676',
    '676',
    '868',
    '.9.',
  ],
  // Plasma bolt: white-hot tip fading to orange tail.
  player_bullet: [
    '.7.',
    '7a7',
    '7a7',
    '.a.',
    '.9.',
    '.9.',
  ],
  enemy_bullet: [
    '.888.',
    '87778',
    '87778',
    '.888.',
  ],
  enemy_bolt: [
    '.e.',
    'e7e',
    'e7e',
    '.e.',
  ],
  // Demon beetle: red carapace, glowing yellow eyes, white fangs.
  enemy_grunt: [
    '.8........8.',
    '..8......8..',
    '..88888888..',
    '.8822222288.',
    '882a2222a288',
    '882222222288',
    '.8822882288.',
    '..88822888..',
    '..7..88..7..',
    '.8..8..8..8.',
  ],
  enemy_grunt_b: [
    '.8........8.',
    '..8......8..',
    '..88888888..',
    '.8822222288.',
    '882a2222a288',
    '882222222288',
    '.8822882288.',
    '..88822888..',
    '.7...88...7.',
    '8..8....8..8',
  ],
  enemy_grunt_c: [
    '.8........8.',
    '..8......8..',
    '..88888888..',
    '.8822222288.',
    '882a2222a288',
    '882222222288',
    '.8822882288.',
    '..88822888..',
    '...7.88.7...',
    '.8.8....8.8.',
  ],
  // Wraith skull: hooded skull, hollow sockets weeping red.
  enemy_sine: [
    '..dddddddd..',
    '.dd777777dd.',
    '.d77777777d.',
    'dd70077007dd',
    'dd78877887dd',
    '.d77777777d.',
    '.d77177177d.',
    '..d777777d..',
    '..71717171..',
    '...777777...',
    '..d..dd..d..',
    '.d........d.',
  ],
  enemy_sine_b: [
    '..dddddddd..',
    '.dd777777dd.',
    '.d77777777d.',
    'dd70077007dd',
    'dd78877887dd',
    '.d77777777d.',
    '.d77177177d.',
    '..d777777d..',
    '..71717171..',
    '...777777...',
    '...d.dd.d...',
    '..d......d..',
  ],
  enemy_sine_c: [
    '..dddddddd..',
    '.dd777777dd.',
    '.d77777777d.',
    'dd70077007dd',
    'dd78877887dd',
    '.d77777777d.',
    '.d77177177d.',
    '..d777777d..',
    '..71717171..',
    '...777777...',
    '..d.d..d.d..',
    '...d....d...',
  ],
  // Eyeball horror: bloodshot eye with writhing tendrils.
  enemy_spiral: [
    '.2...22...2.',
    '..2.2222.2..',
    '..22777722..',
    '.27e7777e72.',
    '.2778888772.',
    '277880088772',
    '277880088772',
    '.2778888772.',
    '.27e7777e72.',
    '..22777722..',
    '..2.2222.2..',
    '.2...22...2.',
  ],
  enemy_spiral_b: [
    '.2...22...2.',
    '..2.2222.2..',
    '..22777722..',
    '.27e7777e72.',
    '.2778888772.',
    '278800888772',
    '278800888772',
    '.2778888772.',
    '.27e7777e72.',
    '..22777722..',
    '..2.2222.2..',
    '.2...22...2.',
  ],
  enemy_spiral_c: [
    '.2...22...2.',
    '..2.2222.2..',
    '..22777722..',
    '.27e7777e72.',
    '.2778888772.',
    '277888008772',
    '277888008772',
    '.2778888772.',
    '.27e7777e72.',
    '..22777722..',
    '..2.2222.2..',
    '.2...22...2.',
  ],
  // Spiked gun pod with a baleful red eye.
  turret: [
    '.5..5555..5.',
    '.5555555555.',
    '555222222555',
    '552288882255',
    '55228ee82255',
    '552288882255',
    '555222222555',
    '.5555555555.',
    '.55..55..55.',
  ],
  turret_b: [
    '.5..5555..5.',
    '.5555555555.',
    '555222222555',
    '552222222255',
    '552288882255',
    '552222222255',
    '555222222555',
    '.5555555555.',
    '.55..55..55.',
  ],
  turret_c: [
    '.5..5555..5.',
    '.5555555555.',
    '555222222555',
    '552288882255',
    '5522ee882255',
    '552288882255',
    '555222222555',
    '.5555555555.',
    '.55..55..55.',
  ],
  // Kamikaze fang-dart: dives straight at the player.
  enemy_diver: [
    '88....88',
    '.888888.',
    '.822228.',
    '8a2222a8',
    '82222228',
    '.822228.',
    '.872278.',
    '..8228..',
    '..8228..',
    '...88...',
    '...88...',
  ],
  enemy_diver_b: [
    '88....88',
    '.888888.',
    '.822228.',
    '87222278',
    '82222228',
    '.822228.',
    '.872278.',
    '..8228..',
    '..8228..',
    '...88...',
    '...88...',
  ],
  enemy_diver_c: [
    '88....88',
    '.888888.',
    '.822228.',
    '82222228',
    '82222228',
    '.822228.',
    '.872278.',
    '..8228..',
    '..8228..',
    '...88...',
    '....8...',
  ],
  // Hell wasp: drops stingers straight down.
  enemy_weaver: [
    '.66......66.',
    '66..0880..66',
    '.66aaaaaa66.',
    '..00aaaa00..',
    '..aaaaaaaa..',
    '..00aaaa00..',
    '...aaaaaa...',
    '...00aa00...',
    '....aaaa....',
    '.....77.....',
  ],
  enemy_weaver_b: [
    '............',
    '6...0880...6',
    '66.aaaaaa.66',
    '.6600aa0066.',
    '..aaaaaaaa..',
    '..00aaaa00..',
    '...aaaaaa...',
    '...00aa00...',
    '....aaaa....',
    '.....77.....',
  ],
  enemy_weaver_c: [
    '..6......6..',
    '6.6.0880.6.6',
    '.66aaaaaa66.',
    '..00aaaa00..',
    '..aaaaaaaa..',
    '..00aaaa00..',
    '...aaaaaa...',
    '...00aa00...',
    '....aaaa....',
    '.....77.....',
  ],
  // Mantis stalker: tracks the player and fires aimed bolts.
  enemy_hunter: [
    '....3333....',
    '...333333...',
    '..33888833..',
    '..b333333b..',
    '.bb333333bb.',
    'bb.3b33b3.bb',
    'b..333333..b',
    '...333333...',
    '..3..33..3..',
    'bb...33...bb',
    '.bb..33..bb.',
    '..b..33..b..',
  ],
  enemy_hunter_b: [
    '....3333....',
    '...333333...',
    '..33888833..',
    '..b333333b..',
    '.bb333333bb.',
    'bb.3b33b3.bb',
    'b..333333..b',
    '...333333...',
    '..3..33..3..',
    'b....33....b',
    'bb...33...bb',
    '.b...33...b.',
  ],
  enemy_hunter_c: [
    '....3333....',
    '...333333...',
    '..33888833..',
    '..b333333b..',
    '.bb333333bb.',
    'bb.3b33b3.bb',
    'b..333333..b',
    '...333333...',
    '..3..33..3..',
    'b.b..33..b.b',
    '.b.b.33.b.b.',
    '..b..33..b..',
  ],
  powerup_shield: [
    '.ccccc.',
    'c77777c',
    'c77c77c',
    'c7ccc7c',
    'c77c77c',
    '.c777c.',
    '..ccc..',
  ],
  powerup_rapid: [
    '.99aa9.',
    '99aa999',
    '99aaaa9',
    '999aa99',
    '99aa999',
    '.9a999.',
    '.99999.',
  ],
  powerup_life: [
    '.ee.ee.',
    'efeeeee',
    'eeeeeee',
    '.eeeee.',
    '..eee..',
    '...e...',
  ],
  powerup_bomb: [
    '....a..',
    '...7...',
    '.55555.',
    '5566555',
    '5558555',
    '5555555',
    '.55555.',
  ],
  powerup_shuttle: [
    '...7...',
    '..676..',
    '..6c6..',
    '.66666.',
    '8666668',
    '..5.5..',
    '..9.9..',
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

// Horizontally flipped copies baked from another def.
const SPRITE_MIRRORS = {
  player_bank_r: 'player_bank_l',
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

function mirrorRows(rows) {
  return rows.map((r) => r.split('').reverse().join(''));
}

export function bakeSprites() {
  for (const id in SPRITE_DEFS) {
    const scale = scaleFor(id);
    SPRITES[id] = bakeSprite(SPRITE_DEFS[id], scale);
    SPRITES[id + '_flash'] = bakeSpriteFlash(SPRITE_DEFS[id], scale);
  }
  for (const id in SPRITE_MIRRORS) {
    const rows = mirrorRows(SPRITE_DEFS[SPRITE_MIRRORS[id]]);
    const scale = scaleFor(SPRITE_MIRRORS[id]);
    SPRITES[id] = bakeSprite(rows, scale);
    SPRITES[id + '_flash'] = bakeSpriteFlash(rows, scale);
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
      if (!ch || ch === '.') continue;
      const idx = parseInt(ch, 16);
      if (Number.isNaN(idx)) continue;
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
      const ch = rows[y][x];
      if (ch && ch !== '.') g.fillRect(x * scale, y * scale, scale, scale);
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

export function hasSprite(id) {
  return !!SPRITES[id];
}
