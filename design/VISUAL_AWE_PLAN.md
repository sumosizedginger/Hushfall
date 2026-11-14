# HUSHFALL: the visual plan (written 2026-11-13)

Work orders for making the game's typical frame as good as its best frame. Written for the next builder (Opus). The owner asked for an unsugared verdict on the look and then for this plan.

**How to start:** the owner says "do session A2 of design/VISUAL_AWE_PLAN.md". Read sections 1 to 3, then that session.

**The standing rules of `design/OPUS_HANDOFF.md` section 1 apply in full** (no browser job without a named yes, never kill by image name, commit locally and never push, low usage, shell hazards, honest reporting, stop after three honest attempts). They are not repeated here.

---

## 1. The verdict this plan answers

Two frames would get an investor's meeting: the title screen and the opening of Marrow Quay. The typical frame would lose it. The gap between the best frame and the typical one is the problem.

What the Quay has and the weak frames lack:

| | Marrow Quay (works) | Lamplighter Hill, Marrow Nave, Hollow Stair (do not) |
|---|---|---|
| Light | A low sun, a lamp lighting brick, a pool on the deck | Even light from everywhere, nothing dark, nothing glowing |
| Skyline | A tower and a crane in silhouette | Nothing above the walls |
| Depth | The far quay sits in haze against the sky | Far things as crisp as near things |
| Colour | Orange against violet | Grey on grey, brown on brown, navy on navy |
| Shape | Boats, posts, a roofline | Boxes on a grid |
| A view | You start looking down the length of it | You start facing a wall or a hallway |

The fix is light, haze, a landmark and a reveal on every level. It is not more texture or trim work.

## 2. Measured facts (2026-11-13)

**How the renderer lights a level now** (read from the code):
- One hemisphere light and one directional "sun" per place, from a row of `LOOKS` in `src/engine/defs.js` (`hemi`, `sun` with a direction, `lamp`, `exposure`, `grade`, `shade`).
- No shadow maps at all. Nothing casts a shadow.
- Lamps are point lights; only the nearest 8 are on (`src/render/lightbudget.js`).
- `src/render/shading.js` bakes a little vertex shading into the level mesh (a dark foot, corner occlusion, patches).
- Fog exists: `THREE.FogExp2` from each map's `atmosphere.fog` and `fogDensity` (median 0.01, range 0.003 to 0.03). It is one flat colour and thin.
- The final pass (`src/render/post.js`) has the depth buffer (`tDepth`, `uNear`, `uFar`), so distance effects can be done there.
- Scenery exists: `map.scenery` entries are non-colliding landmarks that may sit far outside the playable grid (`src/render/levelmesh.js` about line 786; kinds in `SCENERY`; models in `src/render/models_c2.js`). **45 of 68 maps have none.**

**Picture numbers** from current frames (the scene only: gun, corner map and objective box masked out). "Spread" is the gap between the darkest 5% and brightest 5% of the picture on a 0 to 255 scale.

| Frame | Spread | Dark share (<40) | Bright share (>180) | Coloured share |
|---|---|---|---|---|
| Marrow Quay start (the reference) | 177 | 17% | 8% | 87% |
| Nerve Cathedral rim | 136 | 53% | 0% | 68% |
| Marrow Nave | 161 | 39% | 4% | 67% |
| Undercantor Halls | 115 | 27% | 0% | 37% |
| Customs Hall | 109 | 36% | 1% | 23% |
| Bell Tower courtyard | 97 | 29% | 0% | 80% |
| Pulse Foundry | 96 | 39% | 1% | 91% |
| Drowned Chandlery shop | 71 | 65% | 0% | 37% |
| Hollow Stair | 61 | 66% | 1% | 65% |

The plain reading: outside the Quay, almost nothing in the picture is bright. Most frames have a bright share of 0 to 1%. A picture with no bright part has no focal point.

**A warning about these numbers.** Lamplighter Hill's terrace scores a spread of 173 and a bright share of 11%, because of a pale grey sky, and it is the worst frame of the set. The numbers are a floor that catches flat pictures. They do not prove a good one. Every session ends with frames for the owner's eye.

## 3. Rules for this work

**Do not change:**
- The 480 default width, the ink outlines, the value banding, the painted atlases, red ink on hostiles.
- Anything in `src/engine`. This whole plan is drawing only. If `fp-par.mjs check` shows any route changed after a `src/render` change, undo it.
- Hit volumes, routes, creature placement, door and key logic.
- The art rule: everything is made by code (p5 recipes, Three.js meshes). No outside or hand-painted art.

**The scenery rule (new, and what makes big shapes safe):** drawn-only geometry may be any size where the player can never stand and it can never hide a creature from the player:
- above 3.2 m over any walkable cell, or
- over wall cells, or
- outside the playable grid.
Below 3.2 m over walkable floor, the existing 24 cm rule of `tests/look-polish.test.js` stays. Add a test that holds every new scenery piece to this.

**Evidence:** every session here touches `src/render` or `assets/baked`, so all 68 maps go stale. That is expected. There is ONE regeneration, at the end (session A9). A session that only adds `scenery` to a map stales only that map.

**Browser windows.** Looks cannot be judged in node. This plan needs three named yeses from the owner, asked for plainly:
- **Window 1** (after A1): a baseline shoot, about 10 minutes.
- **Window 2** (after A2 to A5): the mid check, about 15 minutes, plus a short frame-rate probe.
- **Window 3** (A9): the final shoot, the frame-rate probe and the regeneration (90 to 170 minutes).
Between windows, build in node and say plainly what has not been seen.

**Frame rate.** Every effect here joins the quality governor's effects rung (`GameView.setEffects`, `src/game/quality.js`) so a weak machine can drop it. Window 2 and 3 run `tools/dev/probe-prof.mjs` with `GPU=1 HUNT=1` on Glass Steppe (C2M02) and one roofed map: the average must stay at 60.

**Low usage.** Judge by the numbers of section 2 first. Open at most six frames a session.

---

## 4. The sessions

### A1. The yardstick (node only; stales nothing)

**Goal:** a way to score a frame and a named "hero view" for every map, so every later session has a before and an after.

1. **`tools/dev/frame-score.mjs <png...>`** (pngjs only). For each 1920 x 1080 frame, sample every third pixel, skip the gun (x over 52% and y over 58%), the corner map (x over 88%, y under 20%), the objective box (x under 32%, y under 12%) and the bottom 10%. Print: luma at the 5th, 50th and 95th percentile, spread, share under 40, share over 180, mean saturation, share of coloured pixels (saturation over 0.2), and the share of coloured pixels held by the two commonest of twelve hue bins. `--json` for a file. Check it reproduces the table in section 2 from the frames in `D:\Doom_release\polish\s5-after`.
2. **A hero view per map.** Each `maps-src/<ID>.views.json` (67 exist) gets one view named `hero`: the place a player first sees the level's big idea. Pick it from the route: the first cell after the start with the longest open sight line (write a small node tool that walks the main route and scores each cell by the area visible from it within a 70 degree cone; print the top three per map and choose). For Marrow Quay the hero is the start.
3. **`tests/hero-views.test.js`:** every shipped map has a `hero` view, and its position is a walkable cell.
4. **Window 1 (needs a yes):** shoot every hero view once (`tools/dev/shoot-map.mjs <ID> hero` with `SHOOT_OUT`, `GPU=1`, through `low.ps1`) into `D:\Doom_release\awe\before`, run `frame-score.mjs --json` on the set, and keep the JSON beside it. This is the baseline. Make a contact sheet (`tools/dev/label-sheet.mjs`) for the owner.

**Done when:** the baseline JSON and the sheet exist, and the report lists the ten lowest-spread maps.

---

### A2. Darkness and pools of light indoors (node only; stales everything)

**The problem:** roofed rooms are lit evenly, and only 8 lamps are ever on.

1. **Bake every lamp into the level mesh.** In `src/render/shading.js` add a pass that, for each vertex of the level mesh under a roof, sums the light of ALL the map's lamps (inverse-square with each lamp's range, blocked by wall cells: a straight grid walk from lamp to vertex is enough) and writes it into the vertex colour, warm-tinted. This is static, costs nothing per frame, and removes the 8-lamp limit for the walls and floors. The real point lights stay for creatures and the gun.
2. **Lower the general light under a roof.** For roofed cells only, scale the hemisphere's contribution down (start at 0.45 of its present value) so a room is dark where no lamp reaches. Do it in the vertex colour bake, not by changing the light, so open-sky cells are untouched.
3. **Numbers live in `LOOKS`** as a new block per look: `indoor: { ambient, lampGain, lampWarm }`, with a default so every existing look keeps working. `tests/look.test.js` holds each look to having sane values.
4. **Do not make it unplayable.** A floor the player must walk on never bakes darker than 22% of its texture. The hand lantern maps (`atmosphere.dark`) are left exactly as they are.
5. Tests: a node test builds two maps' meshes and asserts a vertex 1 m from a lamp is at least three times brighter than one 12 m from any lamp, and that no walkable floor vertex is under the 22% floor. `tests/frame-loop.test.js` green. Routes identical.

**Expected in window 2:** indoor hero frames gain spread (target 130 or more) and a bright share of 2% or more.

---

### A3. Sun shadows outdoors (node only; stales everything)

**The problem:** under open sky nothing casts a shadow, so buildings look pasted on the ground.

1. Turn on Three.js shadow mapping for the sun only: `renderer.shadowMap.enabled`, `sun.castShadow`, the level mesh and scenery cast and receive, creatures cast (they keep their contact shadow blob as well).
2. **Static.** `renderer.shadowMap.autoUpdate = false`; set `needsUpdate` once when the level loads and again when a door, lift or car moves (throttle to at most 10 updates a second). The sun does not move.
3. The shadow camera is an orthographic box fitted to the map's open-sky bounds. One 2048 map; if a map is wider than 200 m, fit the box to a 120 m square that follows the player in 16 m steps (snap it, so the shadow edges do not crawl).
4. Use hard shadows (`BasicShadowMap` or PCF with radius 0): at 480 pixels a soft edge turns to mush, and a hard edge suits the ink style.
5. Each look's `sun` direction is already data. Check every outdoor look has a sun low enough to throw long shadows (elevation between 20 and 50 degrees); retune the ones that point nearly straight down.
6. Join the effects rung: shadows off is the first thing a weak machine drops.
7. The weapon scene and roofed cells are unaffected (a roof already blocks the sun in the shadow map, which is also what makes a doorway to the outside read as bright: good).

**Risk:** shadow acne on the grid's flat faces. Use `normalBias` first, then `bias`. If it cannot be made clean in three attempts, stop and say so (rule 10 of the handoff).

---

### A4. Haze and distance (node only; stales everything)

**The problem:** far things are as crisp and saturated as near things, so large spaces look small.

1. In `src/render/post.js`, add a depth haze after the scene colour and before the ink: `colour = mix(colour, hazeColour, hazeAmount(depth))`, where the amount rises from 0 at `near` to `max` at `far`. The ink lines fade with it (multiply the ink strength by `1 - amount`), which is what makes distant things recede.
2. **The haze colour is the sky's horizon colour for that place,** not a flat fog colour. Add `haze: { color, near, far, max }` to each `LOOKS` row. Defaults: near 14 m, far 70 m, max 0.55 outdoors; near 10 m, far 40 m, max 0.3 under a roof. The Quay's present look is the model: do not make it hazier than it is.
3. **Height haze** for pits and shafts: an extra term that thickens below a per-look height (`haze.floorY`, `haze.floorMax`). The Hollow Stair, the Resonance Loom's pit and the Pulse Foundry are the first users.
4. Keep `scene.fog` as it is for now (it also hides the far clip). After window 2, if the two fight, lower `fogDensity` on the maps where they do.
5. `src/render/tonecurve.js` has a node twin of the shader's tone curve; follow that pattern: a pure `hazeAt(depth, look)` in a small module, the GLSL built from the same numbers, a test that reads the shader back.

---

### A5. Things that glow (node only; stales everything)

**The problem:** the bright share is 0 to 1% in most frames. Nothing is the brightest thing in the picture.

1. **A small glow pass in `post.js`:** pixels over a threshold spread a soft halo (a two-pass blur at a quarter of the internal width is enough at 480). Lamps, windows, the sky's brightest band, muzzle flashes and creature eyes all benefit. Strength per look (`glow: { threshold, strength }`), off under reduced motion only if it flickers, and on the effects rung.
2. **Light shafts.** Where a roofed cell borders an open-sky cell (a doorway, a broken roof, a window), draw a long additive quad from the opening down along the sun's direction, fading out. It is static geometry built once per level in a new `src/render/shafts.js`, under the scenery rule (it is light, not a solid, but keep it from covering the centre of a doorway: fade to nothing below 1.6 m in walkable cells).
3. **Enemies carry their own light.** Each ordinary creature gets one small unlit emissive part (the bell's mouth, an eye, a throat) that is exempt from the far two-tone pass in `src/render/entityflag.js`, so a creature at 30 m is a readable dot of its own colour. Use the existing eye state colours (`src/render/eyes.js`).
4. Tests: the glow shader is read back against its numbers; a node test counts shafts on two maps and holds them to the scenery rule.

**Window 2 (needs a yes) comes here.** Shoot the hero set again into `D:\Doom_release\awe\mid`, score it, and probe the frame rate. Report a before and after table for the ten worst maps and send the owner six frames: three most improved, three least. Tune numbers once, then go on.

---

### A6. A skyline for every level (node only; stales only the maps touched)

**The problem:** 45 of 68 maps have no scenery at all. The Quay's tower is why its frame works.

1. **A kit of large pieces,** in a new `src/render/models_skyline.js`, built from the existing atlases (no bake needed for the first pass): a bell tower, a gantry crane, a chimney stack, a row of roofs, a ship's hull and masts, a rib arch, a hanging bell on chains, a broken wall with a window, a far cliff face. Each takes a height and a seed. Register them in `SCENERY`.
2. **Human places (Campaign 1 Episodes 1 and 2)** get harbour pieces; **the ship and the Gate (Episodes 3 and 4)** get ribs, pipes and arches; **Campaign 2** uses and extends what `models_c2.js` already has (spires, city faces, hive towers, root columns).
3. **Placement rule:** every map with open sky gets at least one piece that is visible from its hero view and stands against the sky (taller than the nearest wall as seen from there), and two or three smaller ones elsewhere. Every roofed map gets overhead pieces in its tallest room (beams, chains, hanging bells), all above 3.2 m.
4. A node tool `tools/dev/skyline-check.mjs <ID>`: from the hero view's position and facing, is at least one scenery piece inside the view cone and above the wall line? `tests/hero-views.test.js` grows a rule: every open-sky map passes it.
5. Scenery is added in the map source (`maps-src/<ID>.level.mjs`, a block `AWE scenery ... end AWE` after everything else) or, for Marrow Quay, in its JSON. It is not an entity, so it cannot flip a creature's steering side; prove it anyway: `route-fingerprint.mjs save` before, `check` after, per map.
6. Do ten maps a session, worst baseline scores first.

---

### A7. The five worst reveals (node only; stales those maps)

**The problem:** the set pieces do not show what their briefs describe.

Do these five by hand, one or two a session. For each: change only what is drawn or, where a ceiling must rise, the roof height (`lid`) of cells no route's arc passes through; run the map's gates (`fun-gates.mjs`) and its fingerprint after.

| Map | What the brief says | What the frame shows | What to do |
|---|---|---|---|
| C1E3M04 Marrow Nave | A torn-open nave under an ash sky, galleries, a dais | A brown hallway | Hero view at the point the roof ends; rib arches overhead running to the dais; shafts through the torn roof; the Mother's dais lit as the brightest thing |
| C1E4M07 Hollow Stair | A drum round a void shaft, four landings | A navy wall and steps | Hero view at the rim looking across and down the shaft; height haze in the shaft; the white ring below as the bright thing; a different wall band on each landing |
| C1E1M05 Lamplighter Hill | A hill of terraces with a funicular | A grey yard with a crate hut | A dusk sky in place of grey; the lamp at the top of the hill as a landmark visible from every terrace; roofs stepping up the hill as scenery; the big blue slab broken into a wall with a cap and a lamp |
| C1E4M08 Gate Warden | An oval hall under a 14 m dome | A slot between tiled walls | Walls in three bands (see A8) so the tiles stop reading as bathroom tile; the hero view from the rim where the dome and the Warden are both in frame |
| C1E1M08 Bell Tower | The episode finale | Spread of 97, no bright part | The bell itself lit and visible from the courtyard; a shaft down the tower |

Then pick the next five from the lowest scores of window 2.

---

### A8. Walls in three bands, and colour on purpose (node only; stales everything)

1. **Three bands.** Any wall taller than 4 m is drawn as a base (the bottom 0.9 m, darker and rougher), a body, and a cap (the top 0.6 m, a lighter course). Do it in the level material's shader (`src/render/surface.js`, which already knows a wall's height above its floor) as a tint and a line, not as new textures. Tall walls also stop stretching one tile: cap the texture's vertical repeat so a tile is never more than 2 m tall.
2. **Two colours per place.** For every look, compute from the window 2 frames the two commonest hues and the coloured share. Any look under 50% coloured, or with no warm-against-cool pair, gets its `grade` and its lamp colour retuned so that the place's general light is one temperature and its lamps are the other (cool room, warm lamps, or the reverse). The Quay and the Nerve Cathedral are the models. Record the pair chosen for each look in a comment on its row.
3. **Skies.** Any sky that is a flat grey (`sky_overcast`, `sky_bleach`) gets a recipe change in `tools/baker`: a lit band at the horizon and darker cloud above. This is a bake (window 3).

---

### A9. WINDOW 3: bake, final shoot, frame rate, regeneration (needs the owner's yeses)

Ask for all of it at once and run only what is granted.

1. Bake the changed skies and anything else changed in `tools/baker` (SwiftShader, not `GPU=1`), then `node tools/dev/refresh-manifest.mjs`.
2. Shoot the hero set into `D:\Doom_release\awe\after`; score it; make the before / after sheet.
3. `probe-prof.mjs` on C2M02 and one roofed map: average 60.
4. One 20 second frame capture on two maps (`tools/dev/store-trailer.mjs`'s capture path) so the owner can judge motion: are there embers, dust in the shafts, swinging lamps? If the world is still, that is the next plan, not this one.
5. Commit, confirm `git status` is clean, then `GPU=1 npm run regen`. AGENT_VERIFIED must read 68 of 68.
6. Reshoot the store pictures and the title: the title is a different style from the game. Do NOT repaint the title; bring the store frames up to it by shooting the new hero views.

---

## 5. What "done" means

For every map's hero frame, all of these floors hold (scored by `frame-score.mjs`):

| Measure | Floor | Why |
|---|---|---|
| Spread | 130 or more | The picture has real darks and real lights |
| Bright share (over 180) | between 2% and 15% | Something is the brightest thing, and it is not the whole sky |
| Dark share (under 40) | between 12% and 55% | Darkness exists but the level is playable |
| Coloured share | 50% or more, unless the place is meant to be colourless (the Quiet Room, the Choirless Chamber) | The place has a colour |
| A landmark | `skyline-check` passes on every open-sky map | There is something to look at |

Then the part no number covers: the owner looks at the before / after sheet and says which maps still look like boxes. Those go round again.

## 6. Progress

- [ ] A1 the yardstick (window 1): node part DONE 2026-11-13 (d7cdd98); the baseline shoot is NOT taken
- [x] A2 darkness and pools of light indoors (381af5d; unseen)
- [x] A3 sun shadows outdoors (bb8f313; unseen, never drawn by a GPU)
- [x] A4 haze and distance (71843c1; the shader is NOT yet compiled by a GPU)
- [ ] A5 things that glow (window 2): the glow pass DONE (71843c1); light shafts and creature beacons NOT done
- [ ] A6 a skyline for every level (list the maps done)
- [ ] A7 the five worst reveals (list the maps done)
- [ ] A8 walls in three bands, colour on purpose
- [ ] A9 window 3: bake, final shoot, frame rate, regeneration

## 7. What is uncertain

- Every number in sections 4 and 5 is a first guess from eight frames. Window 2 exists to correct them.
- A3 is the riskiest item: shadow maps on a grid of flat faces can look dirty, and they cost frame rate. If it fails, A2, A4 and A5 still carry most of the gain.
- A2's baked lamp light is per vertex on a 2 m grid, so pools will be soft and blocky. If that reads badly, subdivide floor quads near lamps before giving up.
- Nothing here has been seen. The author judged stills only and has not seen the game move.
