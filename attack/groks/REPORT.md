# GROKS — HUSHFALL attack report

Auditor: **GROKS**. Gemini was attacking the same tree at the same time. Everything from this pass is under `attack/groks/`. No game file was edited. No browser was opened: there was no fresh yes for a headless Chrome job, so nothing here was seen on a GPU.

The regression file `attack/groks/regress/save-shape.test.js` encodes the contracts below. `node --test attack/groks/regress/save-shape.test.js` — **16 tests, 16 failures** on this tree.

How a throw was graded: `stepOnce` (`src/game/main.js:230`) catches a throw from `step` and returns to the title. That is a softlock of Continue, not a dead page. `frame()` does not catch `earn()` or `GameView.render()`. A throw there never reaches `requestAnimationFrame` (`main.js:388`), so the page loop dies. That is the BLOCKER.

Memory leaks: none proven. The counts are in [Memory leaks](#memory-leaks). The GPU heap was not measured.

## Findings

| id | severity | area | title |
| --- | --- | --- | --- |
| G-01 | BLOCKER | save / shell | A save the loader accepts kills the frame loop, and Continue loads it again |
| G-02 | MAJOR | save / sim | A save the loader accepts throws on the first step; the slot is kept and hides the older autosave |
| G-03 | MAJOR | save / sim | Any other `status` string freezes the simulation while the shell stays in play |
| G-04 | MAJOR | progress | `status: "complete"` with an empty `endStats` pays a rank and would advance the campaign |
| G-05 | MAJOR | save / progress | Finite values past every cap are kept; a string of ammunition becomes NaN on the first shot |
| G-06 | MINOR | save | `loadWorld` throws on a bad difficulty instead of returning `{ ok: false }` |
| G-07 | MINOR | settings | Keyboard bindings are not deduped; the pad bindings are |
| G-08 | MINOR | loop | One NaN frame time freezes `FixedLoop` for the rest of the session |

### G-01 — BLOCKER — a save the loader accepts kills the frame loop

**Repro.** `node --test attack/groks/regress/save-shape.test.js` (the two tests named G-01). Or `node attack/groks/fuzz/round3.mjs`.

Two shapes, both from a normal mid-level save of `C1E1M01` passed through `parseSave` and `loadWorld`:

1. Set `world.status` to `"complete"` and `world.endStats` to `null`, or delete `endStats`. `loadWorld` returns `{ ok: true }`. `earn(progress, id, world.endStats, par)` throws `Cannot read properties of null (reading 'total')` (`progress.js:29`, called from `progress.js:63`). The same throw happens when the field was omitted (`endStats` is `undefined`).
2. Set `world.status` to `"complete"` and `world.player.weapon` to `"nope"`. `step()` returns immediately (`world.js:1102`) and does not throw. The expression `GameView.render` evaluates at `view.js:286`, `WEAPONS[p.weapon].adsFov`, throws `Cannot read properties of undefined (reading 'adsFov')`.

**Expected.** A save that cannot be finished is rejected with `{ ok: false }`, the way an unknown enemy kind already is. `earn` of a missing tally does not throw. The frame loop stays up.

**Actual.** Both saves load. The shell then:

- `stepOnce` sees `status === 'complete'` and sets mode `'ending'` with a 0.9 s timer (`main.js:236`). It does not throw, so its catch does not run.
- About 0.9 s later `frame()` calls `earn(g.progress, g.mapId, g.world.endStats, par)` with no try (`main.js:376-377`). Repro 1 throws there. `requestAnimationFrame` is the next call (`main.js:388`) and does not run. The title is never shown.
- Repro 2 throws earlier, in `g.view.render` (`main.js:386`), on the first frame, because `step` never reached the weapon lookup.

`canContinue` (`main.js:99`) is true whenever `parseSave` succeeds. `loadFirstSave` (`main.js:102-105`) returns on the first `loadWorld` that returns `{ ok: true }`, newest `savedAt` first. Reload, then Continue, loads the same save. New Game still starts a level: it rewrites the autosave with a later timestamp (`main.js:142`).

**How found.** `mechanics.mjs` called `earn(..., null)` and it threw. `round3.mjs` repeated it with the field deleted, and showed that `step` does not throw when the status is already `complete` and the weapon is unknown. The render line was evaluated on its own. The page was not opened.

**Root.** `worldShapeErrors` (`save.js:66-77`) checks the type of each top-level field and that player numbers are finite. `status` is a string either way. `endStats` on a fresh world is `null`, so `null` and a missing field both pass. `player.weapon` is only checked when the fresh value is a number. `loadWorld` then copies the snapshot onto the world (`save.js:89-91`), including keys the fresh world does not enumerate.

**What else shares it.** Any state that makes `step` return at line 1102 and then makes `render` or `earn` throw. A `status` of `"dead"` with an unknown weapon is the same render crash, one branch earlier (`main.js:235` sets `'dying'` and still renders).

**Regression.** The two G-01 tests.

### G-02 — MAJOR — the first step throws, the slot is kept, Continue prefers it

**Repro.** The G-02 tests in the same file. Each one starts from a real mid-level save.

| edit | throw |
| --- | --- |
| `player.weapon = 'nope'`, `null`, or deleted, status still `playing` | `world.js:1179` reading `.saw` of `WEAPONS[weapon]` |
| `player.weapon = 0` | same line |
| `player.weapons = { length: 3 }` | `world.js:36` `owns`, `.includes is not a function`, via `world.js:1145` |
| `player.weapons = 'flare'`, then a kill on a map with drops | `drops.js:22` `p.weapons.map` inside `maybeDrop` |
| `player.ammo = null`, then fire | reading `.flare` |
| `player.keys = 'brass'`, iron key at the player's feet | `world.js:1237` `p.keys.push` |
| `world.events = null`, then fire | `world.js:108` `emit` → `.push` |
| `world.map = {}` added on the save | `world.js:1106` `map.cars.length` |
| `projectiles: [null]` | `world.js:1210` reading `.weapon` |
| `pickups: [null]` | `drops.js:60` reading `.drop` |
| `enemyShots: [null]` | `world.js:666` reading `.life` |
| `burns: [null]` | `world.js:337` reading `.t` |

A brass key under `keys: 'brass'` does not throw: `String.prototype.includes` is true for `'brass'`, so the pickup is skipped. Any other key name reaches `.push`.

**Expected.** `loadWorld` returns `{ ok: false }` and Continue tries the other slot. A throw that does escape is the end of that slot.

**Actual.** `loadWorld` returns `{ ok: true }`. The first `step` throws. `stepOnce` catches it, drops to the title, and says the save or level state was damaged (`main.js:232`). It does not delete the slot. `canContinue()` stays true. The next Continue loads the same newest save and throws again. An older autosave is never tried, because `applySave` returned true (`main.js:128`). New Game rewrites the autosave with `Date.now()` and is an escape.

`events` and `map` are non-enumerable on a live world (`world.js:37`, `emit` at line 108), so `JSON.stringify` inside `makeSave` omits them and `worldShapeErrors` never sees them. A hand-edited save that puts them back is copied over the real map and the real event list by `Object.assign`.

**How found.** `save-mutate.mjs`, then `mechanics.mjs` and `round3.mjs` for the cases that need a shot, a key, or a kill.

**Root.** `worldShapeErrors` does not look at `player.weapon`, the element types of `weapons` / `keys` / `ammo` / `projectiles` / `pickups` / `burns` / `enemyShots`, or extra keys. `stepOnce` does not invalidate the slot it just failed.

**What else shares it.** `player.weapons` as a string survives idle ticks, because `String.prototype.includes` exists, and throws later on the first kill that asks for a drop. Same delay for `events: null` (the first `emit`) and `keys` as a string (the first key whose name is not a substring).

**Regression.** The six G-02 tests. They cover the weapon, `events`, the string weapon list, the iron key, and the null pickup. The other rows are the same check failing on a different array.

### G-03 — MAJOR — an unknown status freezes the simulation

**Repro.** G-03 test. `world.status = 'banana'`, then idle ticks.

**Expected.** The status is rejected, or forced back to `'playing'`.

**Actual.** It loads. `step` returns at `world.js:1102`. After 8 ticks the status is still `'banana'` and the tick counter does not move. In the shell, `stepOnce` only reacts to `'dead'` and `'complete'` (`main.js:235-236`), so mode stays `'playing'`, the view keeps drawing, and pause still works because pause is sampled before `step`. Continue loads the freeze again.

**How found.** `round3.mjs`.

**Root.** Same shape check: any string is a legal `status`.

**What else shares it.** G-01. `'complete'` and `'dead'` are legal and take the shell down a different path. Anything else is this freeze.

**Regression.** The G-03 test.

### G-04 — MAJOR — an empty end-of-level tally pays a rank

**Repro.** G-04 test. `status: 'complete'`, `endStats: {}`.

**Expected.** No salvage. A tally without a time and a total is not a finished level.

**Actual.** `earn` returns rank B, score 0.55, gain 1. `record.time` is `undefined`. The score is 0.55 because a missing `total.enemies` scores perfect kills (`progress.js:30`: the ternary's else branch is `1`) and a missing time scores 0. Rank B starts at 0.55 (`progress.js:9`). The shell calls this from `frame()` and, when it does not throw, calls `commitProgress()` (`main.js:378`), which writes the next map as the autosave. One edited save skips the level.

This is a different bug from G-01. `{}` does not throw. `null` does.

**How found.** `round3.mjs`.

**Root.** `rankFor` assumes `end` is the object `world.js:1268` writes. The loader does not require that shape when `status` is `'complete'`.

**What else shares it.** A tally with `total: { enemies: 0 }` also scores perfect kills. The sim writes that only when the map really had no enemies.

**Regression.** The G-04 test.

### G-05 — MAJOR — caps are not applied to finite values

**Repro.** The four G-05 tests.

- `hp: 1e9`, `armor: 1e9` load and stay. `PLAYER.maxHp` is 100 (`defs.js:13`).
- `ammo.flare = 'lots'`, then fire: the dry check is `('lots' || 0) < cost`. A string compared with a number is false, so the shot is real, then `world.js:592` does `'lots' - cost`, which is `NaN`. The next tick treats `NaN` as empty (`NaN || 0`).
- `ammo.flare = -3` stays `-3` and never fires (`-3 < cost`).
- `sanitizeProgress({ salvage: 1e308 })` keeps `1e308`. `buy(progress, 'ammo')` succeeds. `Math.floor` of a finite number is the whole check (`progress.js:45`).

**Expected.** Hit points, armour, and ammunition come back inside the caps the sim already uses for pickups. Salvage comes back as a safe integer. A non-number of ammunition is a dry gun, not `NaN`.

**Actual.** As above. A quicksave of the `NaN` ammunition would store `null` (JSON has no NaN) and reload as empty, so the poison lasts until the next save. These are unsigned local saves: a hex editor can change them. The defect is that the loader's own finite-number check is the only bound, and play cannot reach `1e9` or `1e308` (`Math.min(PLAYER.maxHp, ...)` on health pickups, tier costs on salvage).

An empty projectile (`projectiles: [{}]`) loads and leaves `x`/`y`/`z` undefined. It did not throw in five ticks. `life: 'long'` becomes `NaN`, and `NaN <= 0` is false, so that one projectile never expires. Both are the same missing element check.

**How found.** `save-mutate.mjs`, `mechanics.mjs`, `round3.mjs`.

**Root.** `worldShapeErrors` asks `Number.isFinite` and stops there. `fireWeapon` (`world.js:585` and `592`) does not. `sanitizeProgress` does not cap salvage.

**What else shares it.** Armour and every ammunition type use the same two lines. The seven ammo keys are the same assignment.

**Regression.** The four G-05 tests.

### G-06 — MINOR — `loadWorld` throws instead of rejecting

**Repro.** G-06 test. A level-start save with `campaign.difficulty = 'nightmare'`.

**Expected.** `{ ok: false, reason: 'corrupt' }`.

**Actual.** `createWorld` throws `unknown difficulty nightmare` (`world.js:61`), called from `loadWorld` (`save.js:93`). A carry whose `weapons` is not iterable throws inside `arrivalInventory` (`world.js:54`): `((intermediate value) ?? ["flare"]) is not iterable`. `applySave` catches both (`main.js:125`) and returns false, so Continue does fall through to the next slot. The contract of `loadWorld` is still a return value, and a caller without that try (a test, a future tool) dies.

**How found.** `save-mutate.mjs`.

**Root.** `loadWorld` lets `createWorld` throw. The shape check never runs.

**Regression.** The G-06 test. It fails because the throw escapes the test, which is the bug.

### G-07 — MINOR — one keyboard code, two actions

**Repro.** G-07 test. Settings at the current version, `fire` and `use` both bound to `KeyF`, then `sanitizeSettings`.

**Expected.** One action owns `KeyF`, the way `sanitizePadBindings` already does (`gamepad.js:100`).

**Actual.** Both arrays keep `KeyF` (`settings.js:28` copies any array of strings and never dedupes). `InputState` builds `byCode` in object order and the last write wins (`input.js:18`), so the key performs Use and Fire does not. `legendText` still prints Fire's first code (`bindings.js:11`). The on-screen remap path does not create this: `applyRebind` (`bindings.js:35`) steals the code from the other action. The hole is an edited `localStorage` settings blob, or any writer that assigns two arrays.

**How found.** `save-mutate.mjs`.

**Regression.** The G-07 test. It fails with `KeyF is on fire and use`.

### G-08 — MINOR — a NaN frame freezes the clock

**Repro.** G-08 test.

```js
const loop = new FixedLoop(() => steps++);
loop.advance(NaN);
loop.advance(0.05); // steps stays 0, acc stays NaN
```

**Expected.** A non-finite `dt` is ignored. The next finite frame steps.

**Actual.** `advance` does `this.acc += Math.min(dt, 0.25)` (`loop.js:8`). `NaN` poisons `acc`. The while condition `acc >= tick` is false forever. `frame()` computes `dt` as `Math.min(0.1, (now - g.last) / 1000)` (`main.js:361`) and does not ask `Number.isFinite`. A single NaN timestamp stops every later `stepOnce`, including pause, while `requestAnimationFrame` keeps going. `performance.now()` does not return NaN today. The hole is real and hard to hit.

**How found.** `save-mutate.mjs`, confirmed in `round3.mjs`.

**Regression.** The G-08 test.

## Fix these first

1. **G-01.** In `worldShapeErrors`, require `status` of `playing` / `dead` / `complete`, require `player.weapon` to be a key of `WEAPONS`, and require a finite `endStats.time` and `endStats.total` whenever the status is `complete`. Wrap the `earn` call and the `render` call in `frame()` the way `stepOnce` already wraps `step`.
2. **G-02.** On that catch, delete the slot that just failed so `loadFirstSave` continues to the older one. Reject `null` elements in `projectiles`, `pickups`, `burns`, and `enemyShots`. Reject a `weapons` or `keys` value that is not an array of strings.
3. **G-02, injected map.** Do not `Object.assign` a snapshot's `map` or `events` onto the live world. Those two stay the ones `createWorld` built.
4. **G-03.** An unknown status is a corrupt save, same check as item 1.
5. **G-04.** `rankFor` returns a zero result when `end` or `end.total` is missing, and `frame()` does not call `commitProgress` unless `earn` returned a real tally.
6. **G-05.** Clamp `hp`, `armor`, and each ammo value on load. `fireWeapon` treats a non-finite count as dry. Cap `salvage` with `Number.isSafeInteger` (or a campaign-sized ceiling) inside `sanitizeProgress`.
7. **G-06.** `loadWorld` catches `createWorld` and returns `{ ok: false, reason: 'corrupt' }`.
8. **G-08.** `FixedLoop.advance` returns immediately when `dt` is not finite. One line, and it also saves pause.
9. **G-07.** Dedupe keyboard codes in `sanitizeSettings` the way `sanitizePadBindings` already does.
10. **G-05, the quiet leak.** Drop a projectile whose `x`/`y`/`z`/`life` are not finite, in the same element walk as item 2.

Items 1 through 7 are one function, `worldShapeErrors`, plus two try/catches. That is the whole BLOCKER and both MAJOR softlocks.

## Still likely to hide bugs, and not tested here

1. **The real frame loop on a GPU.** `GameView.render`, the HUD, decals, and `AudioEngine.update` with a running `AudioContext`. The render throw above is the one expression at `view.js:286`, not a loaded page. No Chrome job ran.
2. **The late bosses under a player who actually arrives.** Random input on `C2M24`, `C2M28`, and `C2M29` never left the start at low health (250–400 ticks, full or near-full hp). The Root Bell and the Hive Cantor were not engaged. Acts C and D have never been played by a person.
3. **A committed ride.** Cars, belts, and the tide were not ridden on purpose. The random walk on `C2M20` took 5 damage and lived. The bot's `ride` op was not driven.
4. **The shell around the sim.** Epilogue skip, quicksave during the 0.9 s ending timer, two tabs, a full `localStorage`, `file://`, a build served from a subfolder. No production bundle was made (`npx vite build` was not run).
5. **A long sitting.** Hours, hundreds of restarts, a lost WebGL context, an ultrawide window, reduced motion. Not run. A 20 s idle and a 40 s vat camp are under Memory leaks. The GPU is not.

## Checked, and left off the list

- All 68 maps, standing still for 3 seconds: no death, no exit, no non-start trigger that opens or spawns or chooses. No vent lands out of the map or on void or wall. No interlock points at a missing door or fails to point back. `C2M22` reads `choice:halls=silent`, and `C2M11` writes it.
- `C1E1M08` loses 41 hp in those 3 seconds. The nearest enemy is a gaunt 4.47 m from spawn. The hurts are 9, 9, 9, and 14. That is the fight at the door of the Cantor map.
- Random input, determinism, and a save/load future-hash: `C1E1M01`, `C2M20`, and `C2M29` matched. Thirteen maps, stock and armed, no invariant break.
- `JSON.parse('{"__proto__":...}')` does not pollute `Object.prototype` on Node 24. A save from version 1 migrates. Version 99 is rejected. Truncated JSON, an array, and a bad enemy kind are rejected. An enemy hp of the string `'10'`, `exitLocked: null`, `stats: null`, `swingT: 'x'`, `messagesSeen` as a string, and `secretsFound` as a string are rejected.
- Negative hit points become a death at the end of the tick. A revived tollbearer drops nothing. Killing every Root Bell anchor in one tick, and every Gate Warden seal in one tick, does not throw. A tick of `Number.MAX_VALUE` stays a finite `w.time`. An enemy with `y: null` standing beside the player is put back on the ground. The line-thrower does not move the player. Pad axes of `NaN` become `[0, 0]` before the sim sees them. Settings clamps (fov, brightness, resolution) hold.
- Marking every enemy dead is a legal mid-level save. The sim writes that shape when you have actually killed them, so it is not listed above.
- Standing on a void cell of the Hollow Stair by teleport does not call `voidFall`, because that call is inside `if (m.cars.length)` (`world.js:965`). Walking onto void is blocked, so a player does not get there.
- Already known, and not reported again: the hurt flash, the crosshair, the chainsaw's sound, a punted creature sliding along a wall, messages and pickups that cannot be read at full speed.

## Memory leaks

No leak was proven. Nothing below is a new finding. The GPU heap and the browser's process size were not measured: no Chrome job ran. The counts are from two node scripts, `node attack/groks/fuzz/leak-audio.mjs` and `node attack/groks/fuzz/leak-sim.mjs`. Their JSON is in `attack/groks/fuzz/out/`.

### Audio graph

`AudioEngine.play` (`src/audio/engine.js:60-72`) creates a gain, and a panner when the sound has a position, and connects both to `sfxBus` and `reverbSend`. The recipes in `tone`, `noise`, and `bell` (`src/audio/synth.js:25-50`) create oscillators, filters, and buffer sources, call `start` and `stop`, and never call `disconnect`. A search of `src/audio/` finds `disconnect` only where the ambience loops reconnect a persistent bus.

A fake context drove the real `play` and the real `Music` class:

| run | nodes created | `disconnect` | kept by the owner |
| --- | --- | --- | --- |
| 600 plays (`flare_fire`, positional `toll_soft`, `saw_rev`, 200 each) | 5800 (2600 gains, 1400 oscillators, 600 buffer sources, 1000 filters, 200 panners, 1 shared noise buffer) | 0 | none. `stats.log` stayed at 200 |
| `Music` constructor | 15 (5 oscillators, all `start()`ed, none `stop()`ed) | 0 | the two drone oscillators, the pad, the hush gain, the filter, and the delay. The LFO and the two hush oscillators are started and are not stored |
| 20 s of score at full intensity | 292 more, including 32 hat buffers (`music.js:41-43`) | 0 | none of the note nodes. The 82 note oscillators were `stop()`ed. The 32 hat sources were not |

Every shot source in the 600 plays was `stop()`ed (2000 starts, 2000 stops). Web Audio 1.1 §1.5.3 says a scheduled source is actively processing only while it is playing. After `stop`, with no JavaScript reference, that rule does not keep the node. A hat is a non-looping buffer of 0.05 s, so it finishes when the buffer ends. The five oscillators from the `Music` constructor (`music.js:17` and `music.js:24`) are the drone: a fixed set, created once.

`AudioEngine.dispose` (`engine.js:123`) closes the context. `main.js` never calls it. One engine is built (`main.js:41`) and `newLevel()` (`main.js:145`, `main.js:198`) resets the mix. The context is meant to last the session. Whether a browser then collects a finished node that is still connected was not measured. That is why this is not filed.

### Simulation arrays

`leak-sim.mjs`, seed 1, normal:

- **Idle on `C1E1M01` for 20 s.** Enemies 16, pickups 12, and every other list at 0, at the start and at 20 s. Hit points stayed 100.
- **Flare held for 8 s.** Projectiles peaked at 2 and ended at 1. Burns peaked at 5 (the cap in `world.js:332` is 8) and ended at 4. One enemy died. Pickups went from 12 to 13 (one drop). Events in a single tick peaked at 4, then `drainEvents` cleared them.
- **One projectile with `life: 'long'` and `g: 0`, held in the air for 3 s.** It stayed, one object, `life` became `NaN`, and `step` did not throw. Same hole as G-05. The list length stayed 1. A copy with ordinary flare gravity fell into the floor and was removed by the hit test, so the life check is the part that fails.
- **`C1E3M07`, one vat forced awake, every other creature killed each tick, player hit points pinned at 500, 40 s.** Living enemies stayed at 4, the four vats. Dead bodies went from 17 to 29. Pickups stayed at 35 after the opening (a summoned brood does not drop, `drops.js:40`). No shots, burns, or pulses were left alive. The busiest tick emitted 27 events, then the drain cleared them.

Dead bodies are never spliced out of `w.enemies` (there is no `enemies.splice` in `src/`). `view.js:297` builds a rig the first time an id is seen, and `view.js:317` removes that rig only when the id leaves the array, which does not happen during play. The +12 bodies in 40 s would be +12 rigs until `GameView.dispose`. Living brood is capped (`world.js:820`, `e.brood.length < S.max`, and the vat's `max` is 3). The growth is the corpse list of a spawner that keeps birthing while its young are killed. `dispose` runs on the next level, on quit, and when `step` throws (`main.js:135`, `197`, `232`). I am leaving it off the findings list: the bodies are the sim's record of the dead, the living cap held, and the rate is about three corpses per ten seconds on that camp.

### Already bounded in the source

These were read and, where a soak applies, the soak agreed.

- Particles expire: motes `view.js:439`, arcs `451`, bolts `452-455` (stuck bolts capped at 24, `219`), debris `457-461`, puffs `400`. Ripples, shocks, pulse rings, pools, and burn patches dispose the material they allocated (`333`, `401`, `340`, `388`, `436`).
- Arcs share one geometry and are capped at 90 (`view.js:238`). Decals are three fixed rings, 96 / 128 / 96 (`defs.js:129`), and the oldest slot is overwritten (`decals.js:27`).
- Burns, pulses, tears, patches, and spikes splice themselves out when their timer ends (`world.js:332`, `925`, `898`, `902`, `rootbell.js:111`).
- Summon caps key off the living count: vat `world.js:820`, Weeping Mother `860`, Hive Cantor `hivecantor.js:20`.
- `drainEvents` (`world.js:107`) replaces the event array. The shell calls it every playing frame (`main.js:234`). Dev `g.events` is capped at 4000 on that same line. `g.frameTimes` is capped at 900 (`main.js:362`).
- The play log is capped at 200 (`engine.js:71`). The Record keeps at most 400 message ids per map (`progress.js:50`). Toasts keep four DOM nodes (`ui.js:124`). `CommsQueue.push` has no cap of its own (`commsqueue.js:12`); each message id is delivered once (`world.js:1250`), so the queue is bounded by the map's own lines. `bellTimers` drops an id that leaves chase (`engine.js:109`) and `newLevel` clears the map.
- The noise buffer is one per context (`synth.js:7-17`, a `WeakMap`).

### Not measured

`tools/dev/browser-check.mjs:526-530` already asserts that geometries and textures stay within +2 across 12 level restarts. That check was not run. Renderer heap, a lost WebGL context, and a sitting long enough to camp a vat for an hour were not run.

## git status --short

Run at the end of this pass. `attack/` is one untracked directory, so git does not list the files inside it. GROKS wrote only `attack/groks/` (`IDEAS.md`, `REPORT.md`, `fuzz/`, `regress/`). The rest of `attack/` (`gemini/`, `fuzz/`, `dist/`, `REPORT.md`, `IDEAS.md`, and the names with a `_GEMINI` suffix) is the other auditor's tree and was not edited here. `validation/browser/C1E1M01.json` and every untracked path outside `attack/` were already dirty at the start of this session. This pass did not write them.

```
 M validation/browser/C1E1M01.json
?? "DEEPSEEK SEES.md"
?? "GEMINI SEES.MD"
?? "Grok Sees.md"
?? "Your Mission.md"
?? attack/
?? gemini-playthrough/
?? review/audit-deepseek/
?? review/independent-audit/
?? review/level-c2m09/
?? review/level-c2m10/
?? review/level-c2m11/
?? review/level-c2m12/
?? review/level-c2m13/
?? review/level-c2m14/
?? review/level-c2m15/
?? review/level-c2m16/
?? review/level-c2s01/
?? review/maps/C2M09.png
?? review/maps/C2M10.png
?? review/maps/C2M13.png
?? review/maps/C2M14.png
?? review/maps/C2M16.png
?? review/pt-021/a2-quay/
?? review/pt-021/a2/
?? review/pt-021/before/
?? review/pt-021/final/
?? review/self-audit/
?? tools/dev/playthrough-critic.mjs
```
