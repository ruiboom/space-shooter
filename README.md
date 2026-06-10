# STELLAR RAID

A retro 16-bit vertical-scrolling space shooter. Zero dependencies, zero build
step, runs in any modern browser.

Twelve authored waves, then **endless deep space**: procedurally generated
waves that keep climbing in density, speed and HP, with scaling mega-bosses
every third wave (and eventually two at once). Homing missiles, autofire, a
radar minimap, wingman shuttles, and drifting obstacles — asteroids, burnt-out
wrecks and indestructible armored hulks — round out the chaos. All sprites are
hand-drawn programmatic pixel art baked to offscreen canvases at load (enemies
cycle 3 animation frames; obstacles are procedurally baked for variety);
rendered at an internal 240×320 buffer with nearest-neighbor scaling, with
additive-blend glow for bullets, engines, powerups and explosions.

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
| X / M                     | Fire a homing missile           |
| Enter                     | Confirm / advance to next wave  |

### Objective

Survive as long as you can. Waves 1–12 are authored — the Warden mid-boss
guards wave 6, the Dreadmaw awaits at wave 12 — then the game goes endless:
procedurally generated waves of increasing density, with a scaled-up boss
every third wave (Warden and Dreadmaw alternate, and from wave 24 they attack
*together*, with stacking HP forever). Score points by destroying enemies,
obstacles and clearing waves. Spend your score in the shop between waves.

### Lives

You start with **3 lives**. Each lethal hit costs one life; the ship respawns
with brief invulnerability (blinking). Game over when all lives are gone.

A **shield** (from the shop or a powerup drop) absorbs one hit each *before*
lives are consumed — shields stack.

### Enemies

| Enemy            | Behavior                                                       | Points |
|------------------|----------------------------------------------------------------|--------|
| Grunt (beetle)   | Flies straight down in V-formations; shoots in later waves     | 100    |
| Sine (wraith)    | Sweeps in a horizontal sine wave while descending              | 150    |
| Diver (dart)     | Cruises in, blinks to lock on, then dashes at the player       | 150    |
| Spiral (eyeball) | Orbits in from off-screen, then dives                          | 200    |
| Weaver (wasp)    | Weaves on a sine while dropping stingers straight down         | 200    |
| Turret (pod)     | Sits on scrolling terrain, fires aimed shots at the player     | 300    |
| Hunter (mantis)  | Hovers, strafes to the player's column, fires aimed twin bolts | 350    |
| Warden (wave 6)  | Mid-boss: sweeps, alternates radial bursts and aimed fans      | 2000   |
| Dreadmaw (wave 12)| Final boss: 3 fire patterns; enrages below half health        | 5000   |

Basic enemies gain extra HP as waves progress, and all speeds, fire rates and
bullet speeds scale up wave over wave.

**Firepower:** gun bullets are deliberately weak — a global `BULLET_DAMAGE_SCALE`
(`0.4`, in `player.js`) multiplies all player-bullet damage, so everything takes
roughly 2.5× as many shots to kill as its raw HP would suggest. A plain shot
deals `0.4`; each **Heavy Rounds** level adds a full `+1` *before* scaling
(`(1 + level) × 0.4`), so the upgrade matters more than ever. Missiles and the
Mega Bomb bypass this scale entirely — they're the efficient answer to the
late-game HP curve.

### Wave progression

| Wave | Highlights                                         | Clear bonus |
|------|----------------------------------------------------|-------------|
| 1    | V-formations + sine line (intro)                   | 100         |
| 2    | Turrets debut                                      | 200         |
| 3    | Kamikaze divers debut, obstacles start drifting in | 300         |
| 4    | Weaver wasps debut                                 | 400         |
| 5    | Spiral storms + shooting grunts                    | 500         |
| 6    | **The Warden** (mid-boss) + escorts                | 800         |
| 7    | Mantis hunters debut                               | 850         |
| 8    | Turret gauntlet + dense mixed assault              | 950         |
| 9    | Double spiral + hunters                            | 1050        |
| 10   | Swarm pressure: everything in numbers              | 1200        |
| 11   | The rush: every enemy type, fast                   | 1400        |
| 12   | **The Dreadmaw** + escort waves                    | 2500        |
| 13+  | Endless deep space: seeded procedural barrages     | 900 + ramp  |
| 15, 18, 21… | Boss every 3rd wave, HP scaling forever     | 1800 + ramp |
| 24+  | Boss waves field **both** bosses at once           | —           |

Boss waves end the moment the last boss falls — remaining enemies
chain-detonate.

### Obstacles (from wave 3)

Big debris drifts down through the battlefield. All obstacles block bullets
from both sides (use them as cover!) and hurt on contact.

| Obstacle | Destroyable | Notes                                          |
|----------|-------------|------------------------------------------------|
| Asteroid | Yes (HP scales with wave) | Spinning rock, worth 150+ points |
| Wreck    | Yes (more HP)             | Burnt-out hull, embers still glowing, 300+ points |
| Hulk     | **No**                    | Armored slab with warning stripes — shots just spark off |

### Powerups (dropped by kills, ~12% chance)

| Pickup | Effect                                   |
|--------|------------------------------------------|
| Shield (blue)  | +1 shield (stacks; absorbs one hit)  |
| Rapid (orange) | 8 seconds of 45% faster firing       |
| Bomb (red)     | Clears enemy bullets, heavy damage to everything on screen |
| Shuttle (green)| Wingman ship doubles your shots for 10 seconds |
| Life (pink)    | +1 life (capped at 5)                |

### Shop (between waves)

Upgrades persist for the rest of the run. Score **is** your currency —
purchases deduct from score. The list scrolls (7 rows visible).

| Item           | Max level | Base cost | Effect per level / purchase |
|----------------|-----------|-----------|------------------------------|
| Rapid Fire     | 3         | 500       | Fire rate ×0.75 (faster)     |
| Spread Shot    | 2         | 900       | +2 angled bullets            |
| Heavy Rounds   | 3         | 1200      | +1 bullet damage (before the 0.4 scale) |
| Autofire       | 1         | 800       | Guns fire continuously, hands-free |
| Missile Bay    | 3         | 600       | +1 missile storage slot      |
| Missile        | repeatable| 300       | Loads one homing missile (needs an empty bay; X to fire) |
| Shield         | 3         | 700       | +1 shield charge             |
| Thrusters      | 3         | 350       | Move speed ×1.15             |
| Radar          | 1         | 500       | Minimap of the corridor, incl. 1.5 screens of incoming enemies |
| Shuttle Escort | repeatable| 700       | Wingman for the first 10s of the next wave |

Missiles home in on the nearest enemy and detonate with splash damage —
they're the answer to late-game bosses. Cost scales linearly per level for
leveled upgrades (e.g. Rapid Fire: 500 → 1000 → 1500).

Shop controls: Up/Down select, Space buy, Enter advance to next wave.

---

## Technical documentation

### Architecture

Flat module layout — 15 ES modules under the project root, all loaded by a
single `<script type="module">` in `index.html`. No bundler; the browser
resolves imports.

```
index.html          ─ canvas + CSS (pixelated scaling)
main.js             ─ state machine, game loop, composition root
util.js             ─ shared math, palette, RNG, particles/explosions
sprites.js          ─ pixel-art data, bake-to-canvas, bitmap font
input.js            ─ keyboard → normalized actions
player.js           ─ player entity, firing, wingman shuttle
bullets.js          ─ bullet pool, update, collision hook
enemies.js          ─ enemy factory, movement patterns, bosses, draw
waves.js            ─ authored waves + endless procedural generator
obstacles.js        ─ asteroids / wrecks / hulks (procedurally baked)
missiles.js         ─ homing missile pool
terrain.js          ─ parallax starfield background
powerups.js         ─ powerup spawn/update/apply
shop.js             ─ upgrade data + scrolling shop UI
hud.js              ─ in-game overlay (score/lives/wave/radar)
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
   PLAYING ─────┘            (endless — no victory state)
      │
      │ last enemy dies
      ▼
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
4. Buy Thrusters (350) → next wave, ship is faster.
5. Take a hit → lose a life; with shield, the shield absorbs first.
6. Reach wave 6 → Warden mid-boss appears (wave 12 → Dreadmaw), health bar
   visible, dies with chained explosions → endless waves continue.
7. Buy a Missile Bay + Missile → X fires a homing missile with splash damage.
8. From wave 3, obstacles drift down: shootable asteroids/wrecks, immortal hulks.

### Out of scope (deliberate)

Audio, gamepad/touch, high-score persistence, level editor, mid-run save. The `input.js` module exposes a
`getAxis() / isFiring()` abstraction so gamepad polling can be added there
without touching consumers.

---

## File sizes (rough)

~1,500 lines of JS total across 12 modules + 40 lines HTML. Fits comfortably in
a few screens of code each — no module is over ~300 lines.
