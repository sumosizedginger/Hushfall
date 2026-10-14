# HUSHFALL, THE VISUAL DIRECTION (PT-047, 2026-10-14)

Written by the builder after the first real capture of my own build (`design/LOOK_FIRST_REVIEW.md` has the evidence, frame by frame). The owner, 2026-10-14: "It's your game, you're developing it, I'm just testing and telling you if it's still fun. So make your choice ... provide a detailed write up on what all you need to do to get this looking visually how you want and update all the other systems we already created a plan for." The owner is away for several days: this file is written so that I can resume from it cold. **Nothing in it is built.** Every number below is a first guess to be tuned against a capture; every decision is mine and reversible (each item is its own local commit; nothing is pushed).

## 0. How to resume cold (read this first)
1. `git status`, `git log --oneline -12`; read the top of `PRODUCTION_LOG.md` (PT-047), then this file, then `design/LOOK_FIRST_REVIEW.md`.
2. The baseline is on disk (untracked, big): `review/self-audit/` (637 frames of 29 maps, 15 weapons, the UI), `review/self-audit/enemies/` (26 creature close-ups), `review/self-audit/lumstats-baseline.json` (the numbers of section 2). Copy `review/self-audit/` to `review/baseline-2026-10-14/` BEFORE the first fix, so a before/after pair is always two files with the same name.
3. The capture tools work: `tools/dev/audit-capture.mjs` (`maps <ID...> | weapons | ui`; `TICKCAP=24000` for the long maps: C2M28 needs about 15400 ticks), `tools/look/shoot-rigs.mjs close|poses|lineup`, `tools/dev/lumstats.mjs` (node only: the numbers), `tools/dev/contact-sheet.mjs` (node only). Run a Chrome job as `powershell -File D:\Doom\tools\dev\low.ps1 D:/Doom/<log> <node args>` (absolute paths; the first runs from the owner's own terminal failed on a relative path).
4. The first task is V1 (section 4). Its node-only half needs no window.
5. **The window rule, read exactly.** The owner said on 2026-10-14: "You have full permission to run whatever tests you need to in order to get a fresh look at everything". I treat that as a yes for the CAPTURE and SHOOT jobs this plan lists (audit-capture, shoot-rigs, a before/after still), one job at a time, idle priority, two cores, and not as a yes for a bake (`npm run bake`, `tools/look/bake-concepts.mjs`) or for the evidence regeneration (`npm run browsercheck`, `verify-map` real-game stage): those still wait for a named yes. If the owner did not mean that, it costs nothing to stop at the next job. The auto-mode classifier refused every one of my job calls until the owner changed a setting on 2026-10-14; if it refuses again, say so and ask for the setting, do not work round it.

## 1. What the game should look like (the direction, in seven rules)
The look approved on 2026-09-29 is a painted harbour-gothic nocturne seen through ink lines and value bands. I am keeping it. What is wrong is not the style but that the style is applied to surfaces and not to light. The seven rules every frame is held to:
1. **One light per frame.** A lit place has a bright core, a mid-tone fall-off and a dark edge. The top value band belongs to emissives (a lamp, a door of light, a muzzle flash), never to a wall or a floor.
2. **Value structure: floor under wall under sky.** The floor is the darkest large plane in an outdoor or hall frame and carries wear (gaps, cracks, wet, rubble). A creature is the second-brightest mass against it and has its own hue.
3. **Three materials a room.** A base, a trim, one accent. Not one skin on every face; not a checker to the horizon.
4. **The hand in the world.** The held gun is lit by the place it is in: dim in a catacomb, cold in a nave, warm at dusk. It never takes a quarter of the screen in a dark place.
5. **Enemies read by face and tell.** The eyes are the state: asleep, hunting, striking. The attack tell is a change of silhouette AND a change of the hot accent.
6. **Nodes and bosses are landmarks.** Everything the player must shoot to open a shield shares one cue. A boss is staged: backlit, large, with its reach drawn on the floor.
7. **The centre of the screen belongs to the fight.** HUD text, toasts and plates stay off the centre line.
Kept exactly as they are (the protect list): the ink outline and the banding, the skies, the creature palette and kit, the type, the HUD layout, the Cradle Annex as the target for a room, the Gate Warden, Cantor, Bellhand, Sexton and Bulwark as the standard for a creature.

## 2. What I measured (the evidence this plan stands on; `node tools/dev/lumstats.mjs review/self-audit/images review/self-audit/index.jsonl`)
- **The hurt flash.** 27 of 27 hurt frames over 15 maps flashed 0.56 to 1.00 for hits of 2 to 8 hit points. `hurtPlayer` (world.js:200) sets `p.hurt = 1` for any hit and the shader mixes 75% red (post.js:64). The `hurt` event already carries `amount` (the audio scales its gain by it, `src/audio/events.js:80`). It is the cheapest and most certain fix.
- **The held gun.** The cannon's own pixels (a core rectangle fully inside it on the tick-0 frames) have luma 109 to 116 (sd 1.5) in all 29 maps while the scene round it runs 26 to 167 (sd 34.7): correlation 0.22. The gun is the same brightness in a black catacomb and a white dock. Cause: `view.js:85-86` gives the weapon scene a FIXED hemisphere light (1.5) and key light (1.6); `setPlace(look)` (view.js:509) sets only the world's lights.
- **The clip is narrow, not general.** Mean top-band share (luma 230 or more) is 2.1% over 581 frames; only 12 frames pass 20% and 2 pass 35%. EXIT frames average 14.6% against 1.4% for the rest: the lit exit chamber of every map, and the finale (C2M28 plinth 39.7%, C2S02 lamp room 39.3%, the C2M10, C2M09, C2M11 exits near 30%). My earlier "the lit areas clip" was too broad; it is the exits and the ending.
- **Black is not the flaw.** 26% of the 3D picture is luma 25 or under on average (C2M26 45%, C1E2M05 43%, C2M13 43%); the Cradle Annex, the best frame, is 43% black. A dark picture with a lit core is the look. I withdrew "dark maps are black".
- **Frames I read:** about 90 of 637; the rest are listed as unread in the review doc and the numbers above cover all of them.

## 3. The decisions I make (all reversible; the owner may overrule any of them)
| # | Decision | Why |
|---|---|---|
| D1 | The default internal render width becomes **640** (480 stays in the settings as the chunky option). Flipped only after an A/B pair of stills (V5) shows a creature at one metre improve and the ink keep its character. `RESOLUTIONS` already has 640; `post.js:92` already scales the crease thresholds by 480/w. A one-time settings bump moves existing saves to 640 once. | At 1 m a brute is a flat blur at 480 (C2M20 frame 15). The approved look is the ink and the bands, not the exact pixel count. |
| D2 | **No hit-volume change.** The grunts get menace from the face, the eye state, the bell and the tell, and from mass that the width rule does not count (coat hem, shoulders, bell, arms: the 85%-radius rule of `check-rigs.mjs` measures the body). If that is not enough after the owner plays the face pass, a wider hit radius is a separate step with the route fingerprints re-saved. | A hit-radius change moves every route, ammunition slack and bot gate; it must not hide inside a look change. |
| D3 | The aim-down-sights slab stays. | The owner has not complained; the harpoon and line-thrower peep rings stay the good ones. |
| D4 | **Delete the weapon-switch toast.** Pickup toasts only, in a small column top right, three at most, equal ones merged ("Rivets +40 x2"). | The bar at the bottom already shows what you hold; the stack covers the centre in every fight. |
| D5 | Title subtitle becomes "Port Marrow · the first night" (drop "Episode 1 preview"); the controls line lists every weapon key from `SLOT_KEYS` (0 included). | Both are plainly wrong in the build; `index.html:213`, `src/game/bindings.js:12`. |
| D6 | The lit-area fix is a **soft shoulder** in the tone curve, not a change of the band count; the sky flecks stay until judged in motion (V11). | The clip is 2% of frames; the flecks may be a feature in motion. |
| D7 | A boss shield is drawn as a **ring or lattice that shows what is left**, not translucent slabs. Every shield-node shares one marker. | The slabs read as glitch shards on the Root Bell (C2M29) and did on the Cantor before its fix. |
| D8 | The three weak climax creatures (Hive Cantor, Sub-Cantor, Root Bell) are redesigned concept-first (a bake job, needs a named yes). The Root Bell becomes a bell the size of the dome with the cage as its clapper. | The final bosses are props on screen. |
| D9 | **All visual work happens before the single evidence regeneration.** Any change in `src/render`, `src/game` or `assets/baked` stales the real-game evidence of all 68 maps (the source-set hashes), so regenerating before this plan is done would be done twice. | AGENTS.md "Status semantics". |

## 4. The work, in the order I will do it (V = visual phase; size by commits: S 1, M about 5, L a dozen)
Every phase ends with: `npm test` green, `tests/frame-loop.test.js` green (it runs the real frame loop of main.js over every map: run it after ANY change in `src/render`, `src/game`, `src/audio`), a before/after of the same named frames, and its own local commit.

### V1. The hurt flash (S to M; node-only first)
- **Build:** a pure module `src/render/hurtflash.js`: `flashFor(amount)` and a decay; `GameView` keeps its own `flash` (set on the `hurt` event from `amount`, decays by itself) and writes `post.uniforms.uDamage` from it instead of `p.hurt` (view.js:503). `p.hurt` stays sim state and untouched.
- **Numbers (first guess):** peak = 0.12 + 0.85 x smoothstep(0, 30, amount); decay 2.6 per second for small hits, 1.2 for large; the rim shape of post.js:64 stays; a hit that armour fully absorbs does not flash.
- **Direction (V1b, after the first part is proved):** add the attacker's `{ x, z }` to the `hurt` event (hurtPlayer takes an optional source; about ten call sites) and a `uHurtDir` so the vignette is heavier on the side the hit came from. The event payload is not hashed; prove it with `node tools/dev/route-fingerprint.mjs check` and `npm test`.
- **Test:** `tests/hurtflash.test.js` (the curve: 2 hp <= 0.2, 8 hp <= 0.35, 30 hp >= 0.9, monotonic, decays to 0).
- **Proof:** one capture job: `audit-capture` on C2M29, C2M12, C2M22, C1E1M01 (the maps with the 27 measured frames). Its hurt trigger tests `d.hurt > 0.5` (audit-capture.mjs:64), which a small hit will no longer pass: change it to fire on hit points lost and record the flash. Acceptance: every one of the 27 events at its new value.

### V2. Text and the toast column (S)
- `ui.js:26` removes `weapon_switch` from the toast table; `toasts.js` merges equal consecutive toasts; `index.html:59` moves `#toasts` to top right, three at most; `index.html:213` and `bindings.js:12` per D5; the arrival card (C2M11 frame 1) gets a dark scrim behind its two lines.
- **Test:** `tests/toasts.test.js` (merge, cap); the controls line is asserted against `SLOT_KEYS`.
- **Proof:** the existing UI capture (`audit-capture ui`) plus one map's arrival frame.

### V3. The held gun in the world's light (M)
- **Build:** `GameView.setPlace` also drives the weapon scene's hemisphere and key light from the look (scaled, with a floor so the gun is never lost: 0.35 of today's value), and a `weaponLamp` point light that follows the lantern (`p.lamp`) and the nearest lamp (the `lightbudget` result). The flare cannon, the start weapon of every map, sits lower and a little smaller (`HIP_SCALE` in `weapon-pose.js`, about 0.92 and 0.04 m lower) and its material colour is multiplied down to about 0.8: no bake needed.
- **Acceptance (measured by `lumstats`, the gun core of the tick-0 frames):** correlation of gun core and scene >= 0.8; the core never under 45 or over 150; the cannon in C2M12 (scene luma 38) visibly dimmer than in C2M19 (166).
- **Risk:** the gun must stay legible in the darkest map; the floor of 0.35 and a rim light on the lantern side.

### V4. The tone shoulder (M; exits and the finale)
- **Build:** in `post.js` main(): replace `toSRGB(rgb x uExposure)` followed by the hard quantiser with a shoulder f(x) = x(1+k)/(1+kx) on the linear colour (k about 0.6 to start; f(1) = 1, the top rolls off), more value steps in the middle (a luminance-to-step table, not a uniform ten), and a bleach to white in the last band instead of the `min(col x lq/lum, 1)` flat clamp. `uShoulder` is a uniform with a per-look override (`LOOKS.<look>.post`).
- **A node twin:** the curve as a pure JS function in `src/render/tonecurve.js` with `tests/tonecurve.test.js` (monotonic, f(0)=0, f(1)=1, the top step covers at most 12% of the input range). The GLSL is written by hand from it: say so in a comment, and never edit one without the other.
- **Acceptance (lumstats):** exit-frame top-band share from 14.6% to 6% or less; the 12 worst frames under 20%; the mean top share of all frames within +-1 point; every non-exit frame's mean luma within +-5%; the black share within +-3 points (the dark pictures must stay dark).

### V5. The render width (S, then a decision)
- **A/B job:** the same five frames (a Tollbearer at 1 m in the Annex, the C2M20 brute at 1 m, the C2M29 clapper, the title, the Quay start) at 480 and at 640, side by side by `contact-sheet`. Acceptance: the close creature gains legible detail; the ink line is still one internal pixel and the picture keeps its look; flip the default and bump the setting. The owner's own play is the final judge (D1), and `RESOLUTIONS` keeps 480.

### V6. Floors and the three-materials rule (L)
- **V6a floors, render only:** `shading.js` lifts the contrast of its baked floor patches; floor textures use a mip filter and a little anisotropy so the ruled-stripe floors (the Annex, C2M17, C2M21) stop banding at a distance (check `textures.js`: if it is `NearestFilter` that is the cause); a floor is darker than the wall beside it.
- **V6b decals, needs bakes (ask):** per-look floor decal sets in the existing `decals_atlas` and `decalplace.js` path (planks and gaps, grates, cracks, puddles, rubble, rope), then a `decals:` list on the three exemplar maps first: Marrow Quay (the first impression), Cradle Annex (the target, which only needs its walls varied), Glass Steppe (the emptiest).
- **V6c the room rule, node-only lint:** `tools/dev/materials-lint.mjs`: per room (the `map-shape.mjs` rooms), at least two wall skins, two floor skins and one accent; the Annex's vine panel on every face and the Bone Loom's single tile fail it today. It is a report first (like `map-feel`), enforced only on rebuilt maps (P4).
- **Order inside V6:** the exemplars, then C2M11, C2M12, C2M14, C2M18, C2M19, C2M21, C2M25, C2M27 (the flattest I read).
- **Acceptance:** a contact sheet of the eight worst floors before and after, judged by me; the lint's counts; no route moves (`route-fingerprint.mjs check`, a wall or floor swap never changes a tile's kind).

### V7. Fists, then the other two viewmodels (M; node-only first)
- The fists are two flat cream planks with a brick-orange block. Redraw as wrapped hands with knuckles and a sleeve, like the axe (the best viewmodel): `models_melee.js`, `gunkit.js`. Iterate with `rast-weapon.mjs --swing=jab` (no browser, composition only); one capture job at the end (`audit-capture weapons`). The arc lamp reads well in my capture (a copper coil with a teal band), so only its charge dome is checked in the job; the fork's thrown effect (a pale hexagon at the wall) is redrawn if it is still flat in the job.

### V8. Faces, eyes and the bell (L; art needs bakes, ask)
- **Eyes as state.** Every creature kit builds one teal `glow` material (`choir_kit.js:105`). Drive its colour from the pose: asleep dim teal; awake and hunting amber-white; the strike a hot white core for two frames. View passes the state in `pose(p)` (verify first what `p` carries: `p.sweep`, `p.aim`, the tell fields; add `awake` / `hunting` / `striking` from `view.js` if missing). A merged sleeper is static, which is what asleep wants.
- **Faces.** A brow and a mouth on the six common humanoids (Tollbearer, Gaunt, Bellhand's face under the hat, Chorister (a mouth open while it sings: the singing tell lifts its hands already), Zealot, Wardengraft): painted into the atlas cells (`recipes_choir.js`, a bake job per atlas; BAKE_PREVIEW writes to a folder without touching `assets/baked`) or, where a cell is too small, a dark prim.
- **The bell is the weapon.** The Tollbearer's raised arm is a good tell; add the bell joint swinging up and flaring amber with the arm.
- **Fences (must stay green):** `check-rigs.mjs` widths, `tests/hit-volume-fair.test.js`, `tests/silhouettes.test.js` (the CEILING ratchet: no pair gets worse), the entity alpha-0 contract (`entityflag.js`), `tests/rig-grounding.test.js`.
- **Acceptance:** `shoot-rigs poses` sheets for the six: the three eye states are different at a glance at 8 m; the face is at least 6 x 6 internal pixels at 640 wide at 8 m; silhouettes unchanged.

### V9. One cue for every node, and the shields (M)
- Every `node: true` creature (bell node, vat, reed, seal, root anchor, the Sub-Cantor's forks) gets the same marker: a thin ring of white-cyan light round its vulnerable point, pulsing while it holds a shield (`hivefx.js`, `shield.js`). The shield on a boss becomes a ring or lattice that thins as nodes fall, drawn from the nodes to the boss; the Root Bell's four chains snap as anchors die. Remove the translucent slabs.
- **Acceptance:** a lineup sheet of all node kinds with the cue; the Root Bell and Cantor boss frames (C2M29, C1E1M08) without slabs; `tests/render-pt45.test.js`-style node test that the marker exists on every node kind.

### V10. Boss presence and the climax creatures (L; concept bake, ask)
- **Concept first:** `tools/look/bake-concepts.mjs` studies for the Hive Cantor (a face, a gesture; a pale cross with arms out reads as a scarecrow), the Sub-Cantor (a horn on a cone) and the Root Bell (the bell itself). I pick one of each from the sheets; the owner sees them when they return.
- **Staging, every boss map:** a light behind the boss at the reveal so its silhouette reads (a lamp in the arena's far wall), a ground ring for its reach (the pulse ring decal), its scale held at or above 18% of the frame height at the reveal for the finale bosses, the boss bar and the toast column clear of it (V2). `tools/look/readability.mjs` for contrast.
- **Acceptance:** the reveal frame of C2M16, C2M24, C2M29, C1E4M08 and C1E3M08 judged side by side with the baseline.

### V11. The sky in motion (S)
- One capture job: ten frames 0.1 s apart in C2M09 and C2M14 (the flecks). If the flecks shimmer between frames they are noise: remove or lock them; if they drift, keep them (D6).

### V12. The sign-off capture (M)
- The whole capture again (`audit-capture maps` on the 29 maps (C1E1M01, C1E1M02, C1E1M08, C1E2M05, C2M02, C2M09 to C2M30, C2S01, C2S02), `weapons`, `ui`, `shoot-rigs close`), `lumstats` against the baseline, contact sheets, and a new section in `LOOK_FIRST_REVIEW.md`: what changed, what did not, the ten worst frames left. Then, and only then, the evidence regeneration (D9).

## 5. Where it sits in the Director's Plan (`design/ROADMAP.md` section 0.8; the published page, revision 4)
- P0 is DONE (the Gemini run came back as a scripted capture; my own capture ran).
- **V1 to V5 come first**, before P1, because they change what every later capture looks like. P1 (Measure) and P2 (Bot v2) are node-only and can interleave with the Chrome verification of V1 to V5.
- V6 (the exemplar maps' floors), V7 and V8 (faces) come before P3 (Weapons) and P4 (Exemplars), so the exemplar maps are judged in the new look.
- V9 and V10 merge into P7 (Enemies and bosses) because they are the same work and need the owner's play of the bosses.
- V11 and V12 REPLACE the look half of P9; P9's audio half stays.
- The evidence regeneration (S3) happens ONCE, after V12 and after any change of maps, never between.

## 6. The browser ledger (jobs that need a window; all idle priority, two cores, one at a time)
| Job | For | Kind | Length (guess) | Needs a named yes |
|---|---|---|---|---|
| J1 | V1 before/after (4 maps) | capture | 3 min | no (10-14 yes) |
| J2 | V2 UI + one arrival | capture | 1 min | no |
| J3 | V3 gun light (29 tick-0 frames) | capture | 4 min | no |
| J4 | V4 exits and finale (12 maps) | capture | 6 min | no |
| J5 | V5 480 against 640 | capture | 1 min | no |
| J6 | V6a floors (8 maps) | capture | 5 min | no |
| J7 | V6b decals | **bake** | 10 min or more | **yes** |
| J8 | V7 fists, weapons sheet | capture | 3 min | no |
| J9 | V8 face atlases | **bake** | 10 min or more | **yes** |
| J10 | V8, V9 poses and lineup | shoot-rigs | 3 min | no |
| J11 | V10 concepts | **bake** | 10 min | **yes** |
| J12 | V10 boss reveals | capture | 4 min | no |
| J13 | V11 sky motion | capture | 1 min | no |
| J14 | V12 sign-off | capture | 25 min | no |
| J15 | the evidence regeneration | **regeneration** | 30 min or more | **yes** |

## 7. What can go wrong
- **A render change hides a bug in a map.** Every phase runs the frame-loop test over every shipped map and the dev maps, and every floor or wall swap is proved route-neutral by `route-fingerprint.mjs`.
- **The tone shoulder washes the dark maps.** The acceptance holds the black share within 3 points and every non-exit frame's mean within 5%.
- **A lit gun disappears in the dark.** The 0.35 floor and the lantern rim.
- **Faces fight the hit-volume rules.** A face is paint and a prim inside the rig; the fences are listed in V8 and run on every change.
- **The default 640 hurts frame rate on a weak GPU.** The owner plays on their own machine; the setting stays; the performance step of the Director's Plan (workstream H) owns the fallback.
- **I judge from stills of a bot's route.** The bot is not a person and a still is not motion: every V phase ends with the owner's own play, and their "it is still fun" outranks any number here.
- **A baked change needs a bake and a bake is slow under software GL.** `BAKE_PREVIEW=<dir> node tools/bake.mjs <ids>` bakes without touching `assets/baked`; one page per bake job.

## 8. What I need from the owner, when they are back
Nothing blocks the node-only parts. To go further I need: (a) a yes for the three bake jobs (J7, J9, J11) and for the evidence regeneration (J15); (b) their play of V1 to V5 (the first things they will notice: the hurt flash, the toasts, the lit gun, the exits, the sharper creatures) and a word on 480 against 640; (c) a veto on any decision of section 3. Nothing is pushed without their word.
