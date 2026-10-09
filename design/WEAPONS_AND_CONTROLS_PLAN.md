# HUSHFALL: weapons, melee, controls, controller and the weapon wheel (the plan to resume from)

**Status (2026-10-07, later the same day): STEPS 1-6 BUILT at the owner's go ("go to town my friend"), awaiting their play; step 7 (the one evidence regeneration + the push) waits for them to say the machine is free.** See section 11 for what exists, where, and what is NOT done. The section 7 questions were answered by me (logged in `PLAYTEST_NOTES.md`): V / Q / 6 kept, parry YES, melee placements kept but the FOUND weapons are not placed on any map yet, lantern = charge + water + Vael, order 1+2 then 3-6. Source of the requests: `PLAYTEST_NOTES.md` PT-011 (aim down sights, DONE), PT-013 (weapon identity, melee, parry, controls, controller, wheel).

Legend: **[OWNER]** decided by the owner in chat. **[MINE]** my proposal, open to veto. **[GUESS]** a number or a name that is a first guess to be tuned in play (the progression numbers are guesses already: `src/engine/progress.js`).

---

## 1. Where we are (facts, 2026-10-07)

| Thing | State |
|---|---|
| Weapons built | flare cannon (start weapon), Tidewarden scattergun (C1E1M01), Riveter driver (C1E1M02), Harpoon rifle (C1E2M02), Charge-arc lamp (C1E2M06). No melee anywhere; the sim feeds a flare when you have no ammunition (`world.js`, "there is no melee weapon") |
| Aim down sights (PT-011) | rebuilt and **accepted by the owner ("Much better for ADS")**: `src/render/weapon-pose.js`, `weapon-sights.js`, `rig.sights`; preview tool `tools/dev/rast-weapon.mjs` (node only) |
| Look redesign L1 (ten creatures) | in the tree, 6 local commits NOT pushed (`origin/main` is behind), evidence of all 18 maps STALE, frame time NOT measured; `design/LOOK_BIBLE.md` PART C |
| Machine load | the owner's mouse stops reaching the whole screen while my Chrome jobs run; cause unknown. Rule in `AGENTS.md` ("Machine load"): idle priority, two cores, one render job at a time, no long job without the owner saying the machine is free |
| Input | `src/engine/input.js`: 21 actions, digital movement, mouse/keyboard deltas for look; **no gamepad code**; the rebind screen is built from `ACTIONS` + `ACTION_LABELS` (`src/game/bindings.js`, `ui.js`) |

## 2. Decisions so far

| # | Decision | By |
|---|---|---|
| D1 | ADS looks like Call of Duty: eye on the sight line, real iron sights, body below | OWNER (PT-011) |
| D2 | Every weapon gets its own identity (flare = area, shotgun = close, SMG = fast and weak, harpoon = one heavy shot, lantern = to be decided) | OWNER |
| D3 | Melee for people who prefer it: unarmed AND with weapons | OWNER |
| D4 | Parry | MINE, proposed, not yet vetoed |
| D5 | Controller support for **PS5 and Xbox**, one set of bindings, glyphs for both | OWNER |
| D6 | A weapon wheel | OWNER (asked) |
| D7 | **Wheel time: Easy = time FREEZES, Normal = 15% speed, Hard = 5% speed** | OWNER |
| D8 | Keyboard defaults V (quick melee), Q (last weapon, hold for the wheel), 6 (melee slot) | MINE, **waiting for the owner's answer** |

## 3. Weapons: the table (what exists, what is planned, where)

Original plan of eight is `GAME_VISION.md` "Weapon taxonomy" and `design/CAMPAIGN_SPINE.md` section 4.

| # | Weapon | Role (target identity) | Status | Act / map |
|---|---|---|---|---|
| 1 | Flare cannon | area denial | built | start weapon, taught on C1E1M01 Marrow Quay |
| 2 | Tidewarden scattergun | close range | built | pickup C1E1M01 Marrow Quay |
| 3 | Riveter driver | fast, weak, holds crowds | built | pickup C1E1M02 Customs Hall |
| 4 | Harpoon rifle | one heavy piercing shot | built | C1E2M02 Evaporation Pans (docs: E2M02-M03) |
| 5 | Charge-arc lamp | charge, range, water, Vael | built, **to be reworked** (W2) | C1E2M06 Pump Cathedral |
| 6 | Melee / tool sidearm | melee | NOT built | docs: "early", no map fixed |
| 7 | Bell-breaker mortar | arcing splash | NOT built | **C1E3M03 Gill Gardens** (docs: E3M03) |
| 8 | Counter-tone emitter | alternate behaviour, not a gun | NOT built | docs: "late Campaign 2"; no map fixed. My candidate: near C2M29 The Root Bell (the boss is a bell) |

Added by this pass **[MINE]**, placements are proposals and must be checked against each map's brief (every map introduces exactly ONE new thing, `CAMPAIGN_SPINE.md` rule 5):

| Weapon | Role | Proposed map |
|---|---|---|
| Quick bash (any gun) | weak, free, replaces the dry-feed rule | from C1E1M01 |
| Fists | no ammo, jab + charged heavy punch that staggers | from C1E1M01 |
| Boat hook | long reach, pulls the target in | C1E1M03 Fishmarket Rows |
| Marlinspike | fast stab, triple damage on sleeping/unaware | C1E1M04 The Drowned Chandlery |
| Lamplighter's mallet | stuns, ignores the Warden's front plate | C1E1M05 Lamplighter Hill (before the first Warden, M06) |
| Fire axe | slow heavy cleave | C1E2M04 Kiln Row |

Episode 3, Episode 4 and Campaign 2 (about 41 maps) have only the mortar and the emitter planned. **[MINE]** fill that with upgrades and alt-fires on the existing guns, not more new guns. Episode 3 is NOT started and stays unbuilt until the owner approves Gate 4 batches.

## 4. Workstreams (what each one is, where it lives, how it is tested)

Every number below is **[GUESS]**.

### W1. The feel pass (all weapons, cheap, first)
Goal: a hit must be felt. Per weapon: its own sound (new recipes in `src/audio/synth.js`, mapped in `events.js`), camera kick and a little shake (`render/view.js` recoil), a hit-marker tick on the crosshair, enemy hit-stagger (a `poise` per enemy kind in `defs.js`; the sim applies it), a kill pop (debris), a coloured muzzle light. Sim part is deterministic and tested; the rest is render/audio (events only).
Tests: `tests/weapons.test.js` (stagger values), `tests/audio.test.js` (each new sound is finite, audible, decays).

### W2. Weapon identities (`defs.js`, `world.js`, view effects)
| Weapon | Change |
|---|---|
| Flare | the flare leaves burning ground (radius 2.5 m, 4 s, damage per second); lights dark rooms |
| Scattergun | stagger on every hit, a point-blank hit (under 3 m) interrupts an enemy's attack windup |
| Riveter | rivets slow the target (**built: 10% for 0.8 s**; the first try, 30% for 1 s, made a perfect bot's run on C1E2M04 hard 5x easier) and cancel a Gaunt's lunge windup (once per 1.8 s) |
| Harpoon | a bolt through a body pins it to the wall behind it for 2 s when a wall is within 3 m (the bolt-in-wall effect already exists) |
| **Lantern** | (1) **charge**: tap = today's arc; hold past 0.35 s charges to 1.2 s, release = a forked bolt, range 24 m, 60 damage, 5 jumps at 80%, costs cells in proportion; the lamp glows and lights the room as it charges. (2) **water**: an arc that touches an enemy standing in water chains to every enemy in the same water within 8 m at +50% (the kit already has wading/toxic water cells). (3) **Vael**: stuns Drone-Gills (1.2 s) and does extra damage to bell nodes. Fixes "no power, no range". |
Tests: new cases in `tests/arc.test.js`, `tests/weapons.test.js`; `tests/harpoon.test.js`.

### W3. Melee and parry (the sim)
- New weapon `kind: 'melee'` in `defs.js`: reach, arc, windup, recovery, damage, knock, stagger, optional `backstab`, `cleave`, `pull`, `ignorePlate`. Resolved in `world.js` as a short deterministic hit test (like `fireHitscan`, same RNG discipline).
- **Quick bash**: any gun, key V, reach 1.8 m, 15 damage, cooldown 0.45 s, cancels aim and sprint.
- **Fists**: jab 8 damage, 0.35 s; hold to charge (0.6 s) for a heavy punch, 30 damage + 1 s stagger, 0.9 s recovery.
- **Found weapons** (one melee SLOT, press 6 again to cycle): boat hook (reach 2.8, 28, pulls 1.5 m), marlinspike (14, x3 on sleeping/unaware), lamplighter's mallet (30, stagger 1.5 s, full damage through the Warden's plate), fire axe (55, cleaves everything within 2.2 m and 100 degrees, 1.1 s).
- **Guard / parry**: with a melee weapon equipped, **Aim (right mouse / L2 / LT) is Guard**. Hold = block (70% less melee damage). A guard raised within 0.2 s BEFORE a strike lands = **parry**: the attacker is staggered 1 s and your next hit does x2. A whiffed parry has a 0.6 s cooldown. Heavy hits (Warden charge) break a block but can still be parried. Ranged toll-shots are out of scope. Guard is always HOLD, even if aim toggle is on.
- ~~**Remove the dry-feed rule**~~ **KEPT (decided 2026-10-07 while building it):** fists mean you always have something to hit with, but they cannot hurt a plated Warden from the front (a bash does a third through the plate), so the one-flare-every-10-seconds feed stays as a safety net against a soft-lock; the C1E1M06 robustness gate (a strafing fighter with 25% less ammunition) also failed without it.
- Saves: fists are always owned; found melee weapons are in `weapons`; **save version bump + migration** (`src/engine/save.js`); old saves load unchanged.
- Bots and canonical routes keep using only the existing actions: no route changes.
Tests: new `tests/melee.test.js` (reach, cleave, backstab, pull, parry window, block, cooldown, determinism), `tests/sim.test.js` (dry-feed gone), `tests/save.test.js` (migration).

### W4. Controls (keyboard and mouse)
| Action | Default | Note |
|---|---|---|
| `melee` (quick bash) | V | edge action |
| `weapon6` (melee slot) | 6 | press again cycles fists/found weapons |
| `weaponLast` | Q | **tap = last weapon, hold = the wheel** (W6) |
| attack | Fire (Mouse0, F) | tap light, hold heavy (melee) |
| guard / parry | Aim (Mouse2) | context: melee weapon equipped |
Reserved for later: `weapon7` (mortar), `weapon8` (emitter).
Work: `ACTIONS`, `DEFAULT_BINDINGS`, `ACTION_LABELS`; the sim command (`cmd.melee`, slot 6); `settings.js` must fill missing actions from defaults for OLD saved settings; the rebind screen gets the rows automatically; the HUD weapon strip and `legendText` learn the melee slot. Tests: `tests/bindings.test.js`, `tests/controls.test.js` (no two default keys collide, old settings load, new bindings rebind and persist).

### W5. Controller (PS5 and Xbox)
- New pure module `src/game/gamepad.js`: a pad SNAPSHOT in, input events out (testable in node with fake snapshots). Polled once per frame by the shell; the sim never sees a pad. Buttons become binding codes (`PadA`, `PadRT`, ...), rebindable in the same screen. Both families use the browser's **standard mapping**, so one binding set serves both; **only the glyphs differ** (vendor id 054c = PlayStation, 045e = Xbox; setting Auto / PlayStation / Xbox).
- **Two gaps to close in `input.js`:** movement is digital (+-1): add analog movement and check the sim scales speed by tilt; look is accumulated deltas: add a stick turn RATE with deadzone and response curve.
- Aim assist: light slowdown over an enemy, computed in the shell from read-only sim state (determinism kept).
- Menus: D-pad/stick focus, confirm/back, for title, pause, rebind, Locker, intermission (the biggest single job).
- Rumble (recoil, damage) with an off switch; pause when the pad disconnects; settings: stick sensitivity, deadzone, invert Y, assist strength, vibration.
- **Not reachable from a web page:** DualSense adaptive triggers, haptic motors, gyro, light bar.

| Control | PS5 | Xbox |
|---|---|---|
| Move / Look | Left / Right stick | Left / Right stick |
| Fire, hold = heavy melee | R2 | RT |
| Aim / Guard | L2 | LT |
| Previous / next weapon | L1 / R1 | LB / RB |
| Last weapon (tap), wheel (hold) | Triangle | Y |
| Use | Cross | A |
| Quick melee | R3 | RS click |
| Sprint | L3 | LS click |
| Slots 1-4 | D-pad left / up / right / down | same |
| Map | Create, or touchpad click | View |
| Pause | Options | Menu |
| Menu confirm / back | Cross / Circle | A / B |
Slots 5 (lantern) and 6 (melee) via L1/R1 or the wheel. Square/Circle (X/B) free for rebinding. L2/R2 are analog: Fire at a light squeeze, Aim/Guard firmer.
**Step 0:** a tiny gamepad test page that prints the button numbers the browser reports, because I have no controller and the table is my understanding of the standard layout, not a test. The owner (PS5) presses the buttons; the mapping is confirmed before anything is built on it.

### W6. The weapon wheel
- **Open**: hold Q (tap = last weapon); pad: hold Triangle/Y. Toggle-to-open as an accessibility setting.
- **Pick**: push the mouse / right stick toward a segment (direction from the centre, not a cursor position); release to equip. Esc closes without switching. Equip still costs the weapon's normal switch time.
- **Segments**: fixed slots in a fixed order (flare, scattergun, riveter, harpoon, lantern, melee, then mortar, emitter when they exist); unowned slots dimmed; ammo shown.
- **Time (D7, OWNER): Easy = frozen, Normal = 15% speed, Hard = 5% speed.** Implemented in the shell: the dt fed to `FixedLoop.advance` is multiplied by the scale (0 = no ticks), with a short ease in and out; the simulation is untouched and stays deterministic (`FixedLoop` already takes dt, `src/engine/loop.js`). Audio is muffled and slowed while open (`audio.setMuffled`). Rank/par time counts sim ticks, so frozen time costs nothing; a setting turns the effect off.
- Icons: eight small baked p5.brush icons (text labels until they exist). Selecting a segment emits the EXISTING weapon-slot command: no sim change.
Tests: `FixedLoop` tick counts at scale 0, 0.15, 0.05 (node); tap/hold timing; wheel selection from a direction (pure function).

## 5. Order and batching

Everything below changes `src/game`, `src/render`, `src/audio` or `src/engine`, so it **stales the real-game evidence of all 18 maps**. Do ONE regeneration at the end of the whole batch, from a clean commit.

| Step | What | Verified by (no Chrome) |
|---|---|---|
| 0 | owner answers D8 (V / Q / 6), D4 (parry); the PS5 test page; the owner says when the machine is free | |
| 1 | W1 feel pass | node tests, audio QA offline renders (`audio-qa` is Chrome: schedule) |
| 2 | W2 identities, lantern first | node tests, bots |
| 3 | W3 melee + parry + save migration | node tests, `verify-map` (ammo slack) |
| 4 | W4 controls | node tests |
| 5 | W5 controller (after the test page) | node tests with fake snapshots |
| 6 | W6 wheel | node tests |
| 7 | evidence: browsercheck (render budget, frame time of the ten new creatures too), `browser-maps --all`, `verify-map` x18, audio QA, `validate`, then PUSH | needs the machine free: ONE long Chrome job |
| later | mortar at C1E3M03, emitter late C2, found melee weapons placed on their maps (map edits, each map re-verified) | Gate 4 rules |

## 6. Guardrails

- The sim stays headless, fixed-step and deterministic; no new RNG outside the sim's seeded one; render, audio and UI only read state and drain events.
- Bots and canonical routes use only existing actions; a route that breaks is a sign of a sim change that is wrong, not a route to rewrite.
- Never claim what was not seen: the aim preview and the node tests are NOT the real game. Real-game checks wait for the owner to free the machine; the owner can also look in their own dev server.
- Do not build the mortar, the emitter, Episode 3 or any new map before the owner approves.
- Add a load test for any new module that the browser imports (`tests/render-modules-load.test.js` exists since PT-012: a duplicate `const` once left the game on its loading screen).

## 7. Open questions for the owner

1. D8: are V (quick melee), Q (last weapon / wheel) and 6 (melee slot) fine on your keyboard?
2. D4: parry yes or no?
3. Melee weapon placement (section 3 table): the maps are mine; any you would change?
4. Lantern: charge + water + Vael as written, or a different identity?
5. Go: which step first? My recommendation: 0, then 1 and 2 together (the feel pass and the lantern), because they are the smallest change that fixes what you felt.

## 8. Resume checklist

1. `git status` (clean expected), `git log --oneline -8`, read the top of `PRODUCTION_LOG.md`, then this file.
2. `npm test` (380 at the time of writing; run at idle priority while the machine-load rule stands).
3. Open `PLAYTEST_NOTES.md` PT-013 and PT-011/012 for the owner's words.
4. `node tools/dev/rast-weapon.mjs <out.png> all` shows the aimed pose with no browser.
5. Pick the step in section 5 the owner approved; log it in `PLAYTEST_NOTES.md` BEFORE touching code.

## 9. Not built, not approved

Sections 3 to 7 are a proposal. The owner has decided D1, D2, D3, D5, D6 and D7; D4 and D8 are mine and open; nothing has been started.

## 10. After this batch: what comes next (added 2026-10-07 at the owner's question)

Order, each step waits for the owner's go and for them to play the one before. Built so far: 18 of 68 maps (Episode 1 nine, Episode 2 nine). Remaining: Episode 3 nine, Episode 4 nine, Campaign 2 thirty-two = 50.

| # | Step | What it is | Needs from the owner |
|---|---|---|---|
| 1 | The owner tests this batch | feel, lantern, melee, parry, keys, pad, wheel; findings go to `PLAYTEST_NOTES.md` first, then fixes | their play and findings |
| 2 | Evidence + push | ONE regeneration of all 18 maps (also covers the unpushed creature redesign, frame time of the new creatures included), then push | "the machine is free" |
| 3 | Close the open findings | PT-009: the Locker perks are bought but not FELT (the owner could not tell what they do); balance numbers (all first guesses: weapons, melee, progression) tuned from their play; Episodes 1-2 human review (only they can award COMPLETE) | their notes on difficulty and perks |
| 4 | L3 "the world" look pass (from `assessment.md`, approved plan C:/Users/sumos/.claude/plans/joyful-plotting-liskov.md) | decals, blood and bodies, real lighting and shadows, first-person hands and weapon polish, UI restyle, the alien room kit and surface variety (Episode 2's arrival rooms were one room eight times) | a go; they judge stills first |
| 5 | Gate 4: Episode 3, The Choir Ships | nine maps in small batches the owner sets: C1E3M01 Landing Scar to M08 The Cantor's Throat + secret S01; the Vael themselves, resin interiors; new enemies (the Chorister suppression enemy, Bulwark Shell and Weeping Mother elites, the Grand Cantor boss); **the bell-breaker mortar at C1E3M03 Gill Gardens**; the Episode 3 colour/tone in the look bible | a batch go, then a playtest per batch |
| 6 | Gate 4: Episode 4, The Hollow Sky | nine maps; NEW ENGINE WORK first: low gravity, vacuum doors, light-beam routing (Mirror Array) | the same |
| 7 | Gate 4: Campaign 2 | thirty-two maps; the counter-tone emitter late (candidate near C2M29); upgrades/alt-fires instead of new guns | the same |

Rules that do not change: one new thing per map (briefed before it is built), every map verified by the bots and the real game before the next, evidence regenerated from a clean commit, the owner awards COMPLETE.

## 11. What was built (2026-10-07) and what is not

Built at the owner's go, in this order, each by node tests (not a person): **identities + the feel pass** (W1/W2), **melee + parry + the save migration** (W3, `SAVE_VERSION` 10), **controls** (W4), **controller** (W5), **wheel** (W6). Tests added: `tests/identity.test.js` (18), `tests/melee.test.js` (15), `tests/gamepad.test.js` (12), `tests/wheel.test.js` (11), additions in `settings`, `bindings`, `render-modules-load` (the suite: 442, all passing); tests that encoded the old behaviour (held-fire lamp, the flare feed) were rewritten, not deleted: the behaviour changed on purpose.

| Thing | Where |
|---|---|
| weapon identities, melee tables, guard, poise | `src/engine/defs.js` |
| the sim: hit effects, burning ground, the lamp's charge / fork / water / Vael, swings, guard / parry, weapon slots | `src/engine/world.js` |
| the quick-melee / slot-6 / last-weapon actions, analog movement | `src/engine/input.js` |
| the bot taps the lamp and bashes when dry | `src/engine/bot.js` |
| melee rigs (fists, boat hook, marlinspike, mallet, fire axe) | `src/render/models_melee.js`, atlas cells 8-15 of `flarecannon_atlas` (`tools/baker/recipes3d.js`) |
| swing phase, bash, melee anchor | `src/render/weapon-pose.js` |
| view: melee, charge glow, burning ground, shake, motes, parry zoom | `src/render/view.js` |
| 14 new sounds, event mapping | `src/audio/synth.js`, `events.js` |
| controller, wheel, menu focus | `src/game/gamepad.js`, `wheel.js`, `padmenu.js`; the shell in `main.js`; settings in `settings.js` |
| the controller test page | `pad.html` |

Not done, on purpose or for lack of a person: (1) the four found melee weapons are on NO map (placing them edits shipped maps: `C1E1M03` hook, `C1E1M04` spike, `C1E1M05` mallet, `C1E2M04` axe, each to be re-verified after the owner has played the melee itself); (2) the mortar and the counter-tone emitter (not before Episode 3 / late Campaign 2); (3) no real PS5 pad was available: open `/pad.html`; `tools/dev/probe-pad.mjs` drove a FAKE pad through the real page (the wiring works; the real numbering is the W3C standard mapping, unconfirmed); (4) the real game was run only by scripts (`tools/dev/shoot-melee.mjs` stills in `review/pt-013/`, the pad probe): none of it was played, no motion was seen; (5) icons on the wheel are drawn in code (simple vector pictograms), not painted; (6) enemies have no hit-react POSE (flinch is a slow, not an animation); (7) frame time and audio QA of the new content: not measured before the one evidence run.

Balance is first-guess everywhere. One number WAS tuned against a bot (the rivets' slow, after it broke a viability gate); see `PLAYTEST_NOTES.md`.

## 12. PT-022: four more weapons, built in the Range first (owner, 2026-10-08: "We need a rocket launcher, an assault rifle, a gravity gun, and a chainsaw" ... "Do all of this now")

The owner's answers to the discussion: the roles are accepted EXCEPT the assault rifle (it must be different from the harpoon rifle and the riveter, so it is NOT the controlled burst first proposed); the gravity gun is **both** (C: a real one, lift-and-throw AND pull / punt / turn a shot back); the chainsaw has **unlimited fuel with a stall**; **the Range first** (nothing is placed on any map); the mallet is fixed in the same batch. "We may want to convert all the different ammo to just Ammo packs": NOT done (see 12.4).

### 12.1 The four (keys 1-6 are what they were; 7, 8, 9 are new; every number is a first guess, in `src/engine/defs.js`)
| key | id | name | the one idea | what it is |
|---|---|---|---|---|
| 7 | `carbine` | Harbour carbine | PRECISION | hitscan, ~7.7 rounds/s, 11 a round, NO bloom, 60 m; a round in the HEAD zone (the top 26% of the body's drawn height) does 2.4x and staggers; a node has no head. Ammo `round` (180). |
| 8 | `linethrower` | Rocket line-thrower | BLAST | a fast, nearly flat rocket (21 m/s), splash 4.4 m, 120 + 55, +70 on the body it strikes, double on a bell node, plate does not turn it (splash never does), knock 2.2 m, hurts YOU inside 65% of the blast (0.6x), 1.5 s a rocket, `rocket` (12). |
| 9 | `fork` | Vael tuning-fork | GRAVITY | no ammunition. HOLD AIM: a movable prop (crate, barrel, sack) is drawn in and held 2.3 m ahead, else a creature is dragged to melee range and stunned. FIRE with a prop held THROWS it (25 m/s: 42 / 34 / 20 at full speed, plate ignored, a crate breaks on the first body, a barrel on the second, a sack on the third; a wall at speed breaks it). FIRE with nothing held PUNTS: carries the creatures in front ~3 m (a wall or another body is struck for 26 x its speed; elites move 35% and take no impact; bosses and nodes are immune), launches props, turns a toll-shot back on its tolled-by. |
| 6 (cycle) | `chainsaw` | Shipwright's chainsaw | HELD FIRE | melee kind. HOLD FIRE: 0.4 s to rev, then every 0.1 s it cuts EVERY body in a 2.1 m / 1.0 rad cone for 5, drags you in at 1.3 m/s, slows you 35%; LOUD (wakes sleepers within 18 m); no guard. Cutting builds heat (5.5 s of cutting stalls it for 1.8 s, 0.5/s cooling at rest); plate and bells kick it back (extra heat), so the Warden facing you stalls it at once and its back does not. Key V is a short chop. |

### 12.2 How it is built (so a later session can find it)
- sim: `src/engine/gravity.js` (movable props `w.phys`, the beam, throw, punt, pull, shoves, blasts moving props) and `src/engine/saw.js`; both are called from `world.js` only when a map has `movable` props or the weapon is in hand, and create their state lazily: **a world without them is byte-for-byte the world it was** (proof: `route-fingerprint.mjs check` identical on all 261 runs; `tests/weapons-pt22.test.js`). The carbine's head zone and the rocket's direct hit / node multiplier are small branches in `fireHitscan` / `explode`.
- a map marks a prop movable with `movable: true` (crate, barrel, sack only; `mapformat` validates it); such props are NOT in `map.props` (collision, nav, the merged level mesh) but in `map.movables` and `w.phys`. A static prop stays static. NOTE for placement: the nav field is built from the STATIC props only, so a movable crate does not block a creature's path-finding (creatures walk round a resting one by steering).
- slots: `SLOT_KEYS` (defs.js) is the key order (`melee` is index 5 = key 6); `WEAPON_ORDER` is the eight guns; `MELEE_ORDER` ends with the chainsaw. The wheel has nine segments in key order.
- view: `models_carbine.js`, `models_rocket.js` (rig, the rocket in flight), `models_fork.js`, `makeChainsaw` in `models_melee.js`; the rocket's smoke / light, the tractor beam, the punt's ring, movable props drawn one by one, the saw's chain (two interleaved sets of teeth that swap every frame, a blur) are in `view.js`. 20 new sounds in `synth.js`. The mallet's head is turned so an end face leads the blow.
- Range: a second range south of the hub (through the opening below the spawn): the saw yard, the rocket yard, the gravity yard, a carbine lane along the south wall; movable props come back after 4 s (`rangePhys`); a displaced sponge walks back to its post.

### 12.3 NOT verified, and why
Nothing was run in a browser (the owner's mouse rule): the rigs were drawn only by the node rasteriser (composition, no ink or grain), the sounds were never heard or measured by `audio-qa`, the feel of every number is unplayed, the view code (rocket mesh, beam, props, wheel icons, HUD) was only loaded, not rendered. The bots do not know the new weapons (nothing places them).

### 12.4 Open decisions for the owner
1. **Ammo.** "Convert all the different ammo to just Ammo packs": it touches every ammunition pickup on 18 maps, the Locker's caps, the bots, the ammo-slack gates and the route evidence, so I did NOT start it. Recommendation: ONE pickup "Ammo" (small / large) that tops up EVERY gun you carry by a share of that gun's cap (so the per-gun counters, the heavy guns' scarcity and the HUD stay), done in the placement pass (the evidence is stale anyway).
2. **Placement** of the eight found weapons (the four melee ones are still unplaced too): one pass, so the bots and the evidence are redone once. The discussion's draft: the mallet on Lamplighter Hill, the chainsaw in the Rail Yard's tool locker (a secret) with a mainline copy later, the line-thrower after the first Warden (Signal House or Ferry Terminal), the carbine in Episodes 3-4, the fork as a deep Vael find.
3. The carbine's identity (head zone) is my choice after "different from the rifle and the riveter"; the alternatives were a recoil-climbing auto and a marking round. Say if you want another.
4. Water and the saw (it could drown), a gravity-gun readout on the HUD (what it can grab), corpses as throwables, explosive barrels: none built.
