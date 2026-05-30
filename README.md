# STELLAR RAID

A retro 16-bit vertical-scrolling space shooter. Zero dependencies, zero build
step, runs in any modern browser.

Six waves of flying formations and terrain turrets, a shop between waves, a boss
finale. All sprites are hand-drawn programmatic pixel art baked to offscreen
canvases at load; rendered at an internal 240×320 buffer with nearest-neighbor
scaling for crisp pixels.

---

## Run

ES modules require an `http://` origin, not `file://`. Serve the directory with
any static server:

```bash
cd space-shooter
python3 -m http.server 8000
# open http://localhost:8000 in a browser
```

Or use `npx serve`, `busybox httpd -p 8000`, or any other static server. No
build, no install.

Browser requirements: ES modules, `<canvas>`, `requestAnimationFrame` — i.e. any
browser from ~2018 onward.

---

## Play

### Controls

| Key                       | Action                          |
|---------------------------|---------------------------------|
| Arrow keys / WASD         | Move the ship                   |
| Space                     | Fire (also: start, skip, buy)   |
| Enter                     | Confirm / advance to next wave  |

### Objective

Survive 6 waves of enemies, culminating in a boss. Score points by destroying
enemies and clearing waves. Spend your score in the shop between waves.

### Lives

You start with **3 lives**. Each lethal hit costs one life; the ship respawns
with brief invulnerability (blinking). Game over when all lives are gone.

A **shield** (from the shop or a powerup drop) absorbs one hit each *before*
lives are consumed — shields stack.

### Enemies

| Enemy      | Behavior                                                        | Points |
|------------|-----------------------------------------------------------------|--------|
| Grunt (red)| Flies straight down in V-formations                             | 100    |
| Sine (green)| Sweeps in a horizontal sine wave while descending              | 150    |
| Spiral (pink)| Orbits in from off-screen, then dives                          | 200    |
| Turret (gray)| Sits on scrolling terrain, fires aimed shots at the player     | 300    |
| Boss (wave 6)| Sweeps, cycles 3 fire patterns (spread / aimed burst / twin)   | 3000   |

### Wave progression

| Wave | Contents                                           | Clear bonus |
|------|----------------------------------------------------|-------------|
| 1    | 3× V-formation                                     | 100         |
| 2    | V + sine line + 2 turrets (terrain debut)          | 200         |
| 3    | 2× sine + 3 turrets                                | 300         |
| 4    | Spiral + 2× V                                      | 400         |
| 5    | Sine + spiral + 4 turrets                          | 500         |
| 6    | 2× spiral + V + **boss**                           | 1000        |

### Powerups (dropped by kills, ~14% chance)

| Pickup | Effect                                   |
|--------|------------------------------------------|
| Shield (blue)  | +1 shield (stacks; absorbs one hit)  |
| Rapid (orange) | 8 seconds of 45% faster firing       |
| Life (pink)    | +1 life (capped at 5)                |

### Shop (between waves)

Upgrades persist for the rest of the run. Score **is** your currency —
purchases deduct from score.

| Upgrade        | Max level | Base cost | Effect per level         |
|----------------|-----------|-----------|--------------------------|
| Rapid Fire     | 3         | 400       | Fire rate ×0.75 (faster) |
| Spread Shot    | 2         | 800       | +2 angled bullets        |
| Shield         | 3         | 600       | +1 shield charge         |
| Thrusters      | 3         | 300       | Move speed ×1.15         |
| Heavy Rounds   | 2         | 1000      | +1 bullet damage         |

Cost scales linearly per level (e.g. Rapid Fire: 400 → 800 → 1200).

Shop controls: Up/Down select, Space buy, Enter advance to next wave.

---

## Technical documentation

### Architecture

Flat module layout — 13 ES modules under the project root, all loaded by a
single `<script type="module">` in `index.html`. No bundler; the browser
resolves imports.

```
index.html          ─ canvas + CSS (pixelated scaling)
main.js             ─ state machine, game loop, composition root
util.js             ─ shared math, palette, RNG, particles
sprites.js          ─ pixel-art data, bake-to-canvas, bitmap font
input.js            ─ keyboard → normalized actions
player.js           ─ player entity + firing
bullets.js          ─ bullet pool, update, collision hook
enemies.js          ─ enemy factory, movement patterns, boss, draw
waves.js            ─ wave timelines, formation spawners
terrain.js          ─ scrolling starfield background
powerups.js         ─ powerup spawn/update/apply
shop.js             ─ upgrade data + shop UI
hud.js              ─ in-game overlay (score/lives/wave)
```

Dependency graph (all arrows point to imports):

```
            main.js  ──────────┐
             │                  │
    ┌────────┼────────┬─────────┼─────────┐
    ▼        ▼        ▼         ▼         ▼
 player.js enemies.js waves.js terrain.js shop.js …
    │        │        │          │         │
    └────────┴────────┴─────┬────┴─────────┘
                            ▼
                        sprites.js ──► util.js
                        bullets.js ──► util.js
                        input.js  (no deps)
```

`waves.js` is the only module that imports from another gameplay module
(`enemies.js`) — everything else hangs off `util.js` / `sprites.js`. Runtime
wiring (who shoots whose bullets, who collides with whom) happens in `main.js`
via context objects passed to `updateEnemies`, `updatePlayer`, etc. This keeps
the modules mutually unaware and easy to reason about.

### Game loop

Fixed 1/60 s simulation step with a small accumulator, rendered every vsync:

```js
function frame(now) {
  accum += (now - last) / 1000;
  while (accum >= 1/60 && steps < MAX_STEPS) {
    update(1/60);       // deterministic sim
    consumeJustPressed();
    accum -= 1/60; steps++;
  }
  render();             // variable
  requestAnimationFrame(frame);
}
```

`MAX_STEPS` caps the catch-up work per frame (spiral-of-death protection).
Simulation is deterministic in `dt`, so physics and spawn timing are stable at
any framerate.

### State machine

Five top-level states in `main.js`; each has its own `updateXxx(dt)` and
(implicit) render branch:

```
        ┌─ space ─┐
        ▼         │
    TITLE    GAME_OVER ◄──── lives reach 0
      │         ▲
    space       │ death
      ▼         │
   PLAYING ─────┘ ────────► VICTORY (after wave 6)
      │                        ▲
      │ last enemy dies        │
      ▼                        │
  WAVE_CLEAR ─── 2s tally ──► SHOP ── enter ──► PLAYING (next wave)
```

Wave-clear tally: `waveClearTimer` counts down from 2 s; `waveClearBonusShown`
animates linearly from 0 → `waveClearBonusTotal` for display. On timer zero,
full bonus is added to `score` and the state transitions.

### Data flow (per frame, PLAYING state)

```
     input.js  (keydown/keyup → keys, justPressed)
        │
        ▼
  updatePlayer(player, dt, input, playerBullets)  ← may spawn bullets
        │
  updateSpawner(spawner, dt, enemies)             ← pushes new enemies
        │
  updateEnemies(enemies, dt, ctx={player, spawnEnemyBullet, terrainSpeed})
        │                         (turrets use spawnEnemyBullet)
        │
  updateBullets(playerBullets, dt, onHit)
        │   onHit: for each enemy, AABB check → damageEnemy → score
        │                            → maybeSpawnPowerup
        │
  updateBullets(enemyBullets, dt, onHit)
        │   onHit: if aabb(bullet, player) → hitPlayer (shield or lives)
        │
  enemy-body vs player collision (inline)
        │
  updatePowerups(powerups, dt, player, onPickup)  ← applyPowerup
  updateParticles(particles, dt)
  updateTerrain(terrain, dt)                       ← scrolls background
        │
        ▼
  isWaveClear(spawner, enemies)? → enterWaveClear()
  player.lives === 0?            → STATE.GAME_OVER
```

All collision is AABB (`util.aabb`). Lists are simple arrays mutated in place;
dead entries (`alive === false` or `life <= 0`) are spliced during their
respective update.

### Rendering pipeline

A single canvas, buffer size **240 × 320**, CSS-scaled to fit the viewport with
`image-rendering: pixelated` and `ctx.imageSmoothingEnabled = false`. Per
frame, after screen-shake offset:

1. Clear to palette color 0 (black).
2. Scrolling starfield (`terrain.js`, two `drawImage` calls to wrap seamlessly).
3. Enemies (flying + terrain turrets).
4. Powerups.
5. Enemy bullets.
6. Player ship.
7. Player bullets.
8. Particles (1–3 px rectangles).
9. HUD overlay (no shake applied).

**Sprites**: defined as row-arrays of characters — each character is a hex
palette index `0-f` or `.` for transparent. At boot, `bakeSprites()` renders
each definition once into its own offscreen `<canvas>`, stamping each source
pixel as a 2×2 block (default bake scale). Per-frame rendering is then just
`drawImage(bakedCanvas, x, y)`. HUD sprites (`heart`) opt out of scaling via
`SPRITE_SCALES[id] = 1`.

**Palette**: PICO-8's 16 colors, indexed 0–15, defined once in `util.js`.

**Text**: custom 3×5 bitmap font in `sprites.js`, encoded as 3-bit-per-row
integers. Drawn with per-pixel `fillRect` — still tiny but avoids the blur of
`ctx.fillText`.

**Boss**: skips the sprite pipeline entirely. `drawBoss()` composes the boss
procedurally from rectangles (hull rings, cockpit, pupil, guns, flash overlay)
sized from `e.w`/`e.h`. Changing boss dimensions needs no asset edits.

### Core data shapes

All entities are plain objects, no classes. Shared factory functions:

```js
// player.js
createPlayer() → { x, y, vx, vy, w, h, lives, shield, invulnTimer,
                   fireCooldown, fireTimer, speed, rapidTimer,
                   upgrades: { fireRate, spread, shield, speed, damage },
                   alive, deathTimer, thrustPulse }

// enemies.js
createEnemy(type, x, y, pattern) →
  { type, x, y, vx, vy, w, h, hp, maxHp, spriteId, points,
    pattern: { init(e), update(e, dt, ctx) },
    patternState, fireTimer, fireCooldown, onTerrain, flashTimer, alive }

// bullets.js
spawnBullet(pool, opts) → { owner, x, y, vx, vy, w, h, damage, spriteId, alive }

// powerups.js
{ type: 'shield'|'rapid'|'life', x, y, vx, vy, w, h, spriteId, t }

// waves.js
WAVES[i] = { clearBonus, spawns: [{ at, fn(enemies) }] }
```

### Movement patterns

Each enemy carries a `pattern` object: `{ init(e), update(e, dt, ctx) }`. The
pattern mutates the enemy's position and state. Patterns are factories (closures
over their parameters), so they're pure data-in / data-out and easy to combine.

```js
straightPattern({ speed, vx })
sinePattern({ speed, amplitude, frequency, baseX, phase })
spiralPattern({ centerX, centerY, radius, angularSpeed, driftY, startAngle })
turretPattern({ fireInterval, firstDelay })    // scrolls with terrain
bossPattern()                                   // entry + 3-mode attack cycle
```

### Extending

**Add a new enemy type**:

1. Add a sprite definition in `sprites.js` under `SPRITE_DEFS` (rows of hex
   chars).
2. Register it in `ENEMY_TYPES` in `enemies.js` (hp, w, h, points, spriteId).
3. Either reuse an existing pattern or write a new `xxxPattern({...})` factory
   next to the others.

**Add a new wave**:

Append an entry to `WAVES` in `waves.js`. Each entry is a list of timed
spawn callbacks that push enemies into the world. Reuse the existing
`spawnV / spawnSineLine / spawnSpiralIn / spawnTurret` helpers or write new
ones.

**Add a new upgrade**:

Append to `UPGRADES` in `shop.js`:

```js
{ id: 'myUpgrade', name: 'MY UPGRADE', maxLevel: 3,
  cost: (lvl) => base + lvl * step,
  apply: (p) => { /* mutate player */ },
  desc: 'WHAT IT DOES' }
```

Purchases call `apply(player)` and then bump `player.upgrades[id]`. For
upgrades whose effect is level-driven (spread, damage), make `apply` a no-op
and have the player code read `player.upgrades[id]` each frame.

**Add a new powerup**:

1. Add a sprite in `sprites.js`.
2. Add an entry in `POWERUP_TYPES` in `powerups.js`.
3. Add a branch in `applyPowerup(type, player)` and a label in
   `powerupLabel(type)`.
4. Adjust the weights in `maybeSpawnPowerup` if you want it to drop.

### Verification

Manual — open the page and play. There are no tests. A quick smoke check:

1. Title shows, space → wave 1 spawns the V.
2. Fire hits enemies, particles spawn, score increments.
3. Clear the wave → tally animates → shop appears with correct points.
4. Buy Thrusters (300) → next wave, ship is faster.
5. Take a hit → lose a life; with shield, the shield absorbs first.
6. Reach wave 6 → boss appears, health bar visible, dies with a big explosion
   → victory screen.

### Out of scope (deliberate)

Audio, gamepad/touch, high-score persistence, multi-frame sprite animation,
parallax layers, level editor, mid-run save. The `input.js` module exposes a
`getAxis() / isFiring()` abstraction so gamepad polling can be added there
without touching consumers.

---

## File sizes (rough)

~1,500 lines of JS total across 12 modules + 40 lines HTML. Fits comfortably in
a few screens of code each — no module is over ~300 lines.
