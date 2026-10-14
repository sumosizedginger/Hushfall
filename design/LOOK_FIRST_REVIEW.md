# Look first: review of the Gemini run and the Grok notes (2026-10-13)

Source: `gemini-playthrough/` (46 PNGs, `play_report.json`, an empty `index.csv`; NOT committed, 46 large PNGs) and the text of a Grok review. Every frame but 037 was read. Gemini's chat text and Grok's text are CLAIMS; this note keeps only what a frame or the source confirms.

## What the Gemini run is (and is not)
- NOT a person playing. `tools/dev/playthrough-critic.mjs` (written by Gemini, untracked) drives the dev hook: `newGame`, `setup_teleport`, `setup_player` (hp 100000 for the melee frame), `startBot` and `stepBot(n)`; a frame is whatever the route bot's camera shows after n ticks. Headless Chrome on SwiftShader at 1280x720 (the prompt asked for a real GPU window).
- 7 of the 18 Tier 1 maps (Range, C1E1M01, C1E1M02, C1E1M08, C1E2M05, C2M02, C2M30). No boss frame (071 and 072 are named "boss arena" and "cantor shield" and show a door and a corridor), no automap (054 is 053 again), no hurt frame outside the Range, no per-map notes, no SUMMARY, `index.csv` empty. Nothing of Acts B, C, D except the ending walk.
- Gemini's weapon numbers: walk 5.70 / sprint 9.53 / "1.67x" are wrong. They were measured over 0.5 s from a standstill while the player was still accelerating. `PLAYER.speed` is 6.4 m/s, `sprintMult` 1.55 (9.92). Its advice to make ADS tighten the scattergun cone is already true (`spread` hip 0.075, ads 0.038).

## Confirmed (frame and/or source)
| # | Finding | Evidence | Fix (kind) |
|---|---|---|---|
| 1 | A hit of any size paints the rim of the screen solid red for about 0.8 s. Two points of damage hid the guns and targets. Grok and the frames agree. | Frames 024, 025, 028, 029, 032, 033, 036 (7 of 22 Range frames; "TAKEN last 2"). `hurtPlayer` sets `p.hurt = 1` for every hit, it decays at 1.2 per second (world.js), the shader mixes 75% red at full weight on the rim (post.js:64). | The view scales its own flash by the amount of the `hurt` event and caps the rim for small hits (render only; do not touch `p.hurt`, it is sim state). |
| 2 | The best images are the outdoor skies and the Cradle Annex. | 050, 052, 090, 102 (skies, ink, banding hold together); 080 to 082 (vines, pods, teal water). | Keep as the look target. |
| 3 | Flat floors carry the weakest frames: the Quay plaza, the Steppe spawn (black slabs, nothing else), the road, the teal water as horizontal stripes (82). Walls are rich, floors are a single grey. | 053, 090, 092, 082, 100. | Floor variety pass on the exemplar maps (decals, debris, puddles, two-tone dither). |
| 4 | Viewmodels: the axe is the best. The fists read as two flat cream planks and a brick; the arc lamp is a cyan low-poly dome with black wireframe edges (not painted); the fork throws a flat pale hexagon at the wall; every gun shares one gold and black palette; the flare cannon (the start weapon of every map) fills the lower right and stays as bright as day in a black corridor. | 038, 039, 028, 034, 050, 080, 100. The fists frame may be an idle pose: a still cannot say. | Fists and arc lamp redraw; scene-lit viewmodel in dark places; a smaller start gun. |
| 5 | Every ADS covers the lower middle of the screen with a slab (scattergun, flare, rivet driver, carbine). The harpoon and line-thrower peep rings are the good ones. | 021, 023, 025, 031, 027, 033. | Decision for the owner: how much is ADS worth in a DOOM-like. Not changed. |
| 6 | The title still says "EPISODE 1 PREVIEW", the key card omits key 0, the dev picker shows. | 001. | One line each. |
| 7 | Six identical crate stacks in a straight row at the Customs Hall arrival (a toy-soldier barricade); an off-palette bright teal slab column in the Quay warehouse (055), unexplained. | 060, 055. | Check intent in the sources; dress the row; find what the slab is. |
| 8 | The HUD is clean and reads in every frame. | all | Keep. |

## Not confirmed, kept as open
- "You end up inside the bodies" (Grok). The collider is 0.32 (player) + 0.40 (Tollbearer) = 0.72 m eye to centre, the rig's 85%-radius is 0.44 (`check-rigs.mjs`), the near plane 0.1 m; the arms, bell and coat sit beyond the 85% radius. Plausible at the edges; no campaign frame shows it (frames 038 to 040 are teleported next to a Range target). Measure the rig's full extent before touching a collider.
- "Message box in the middle of the screen" (Grok, the Range card): the objective box is top left in every frame here; no message pop-up was captured.
- Gemini: enemies "wash out in daylight" (092 shows them high-contrast), blood does not reach walls (no frame shows a wall hit either way), the turn lag is "sublime" (one nudged sample).

## What this run cannot judge
Bosses, set pieces, the automap, damage in campaign maps, the dark maps, Act B to D rooms, any fight at close range, any motion, any sound.

## Order this implies
1. Cheap, render only, visible in every frame: findings 1, 6, and the lighting of the start gun.
2. Art: fists, arc lamp, fork effect; the floor pass on the three exemplar maps: Marrow Quay (first impression), the Cradle Annex (the best place), Glass Steppe (the emptiest).
3. One more capture, tighter than the first (list in the reply), before any level is redesigned.
4. Then P1 to P3 of the Director's Plan (node only) as written.

## Plan pass: my own look at the 17 non-Range Tier 1 maps (node-made plans only; no browser)
The self-audit's capture job (`tools/dev/audit-capture.mjs`, written, NEVER RUN: the harness refused to start it) is still owed. What I could do without a browser is read `review/maps/<ID>.png` for every Tier 1 map. A plan shows shape, not height, light or art. Legend: red Tollbearer, orange Gaunt, magenta Bellhand, purple Sexton, grey cross = prop; every Campaign 2 creature falls back to plain red in `mapview.mjs`, so the plans of Acts B to D hide their rosters (a ten-line fix to its `ENEMY` table).
- Campaign 1 has the maps with a SILHOUETTE: the Marrow Nave (a long symmetric axis, transepts, an apse), the Pump Cathedral (a ring round a flooded pool), the Hollow Stair (a ring round a void), the Gate Warden (an oval hall with a dais). Marrow Quay is a start strip, a 24 x 22 m plain plaza (the flat floor of frame 053) and three boxes. The Customs Hall is two big pillared boxes and a corridor. The Bell Tower is a box inside a ring corridor.
- The Cradle Annex, the best interior in the frames, is the simplest plan in the set: three boxes in a line (a closet, a pillar hall, a stair room). Its look comes from art, not shape.
- Campaign 2 grows in size and loses shape. The Glass Steppe (130 x 70 m) is a regular field of equal mounds and rubble blocks, two straight bands and one straight road, with the Gaunts on the bands at a ruler-even 16 m pitch. The Sounding Deep Gate is one bowl of a cave with the roster spread round it on rings. Silent Roots is one 90 x 60 m box with some 80 equal pillar blocks and four boxed rooms. Vein Rail is three box rooms and a hub. Choir of One is a box hall and a square-stepped arena. The Unrung Gate is a straight 110 m corridor of six equal bays (by design, the walk). The Last Tide and the Root Bell are circles by design.
- Only the Hive-Song Approach (an S-shaped gorge with side chambers) has a plan that looks designed rather than generated.
- What this says about the plan's laws: scale is not shape. The new level laws (12 to 20) and the eight secret kinds are aimed at exactly this; the Steppe, the Deep Gate and Silent Roots are the first three Campaign 2 maps to rework, with the Cradle Annex's art as the target for their rooms.
- Not seen and not claimed: every height, ceiling and light of these maps, every fight, every message, and any frame of Acts B to D.

## My own visual assessment (the same audit on my own game), 2026-10-13
Frames read: Gemini's 46 (current commit, SwiftShader); the Act B tours `review/level-c2m10..16` (generated 10-12, current gun); the creature sheets `review/assessment-2` (10-10, BEFORE the PT-035 coat changes); `review/pt-021/final` UI and Cradle frames (10-08); the Quay tour `review/level-c1e1m01` (2026-10-05, BEFORE the world pass and the new guns: used for sky and palette only). The harness refused my own capture job twice (`tools/dev/audit-capture.mjs`, written, never run), so NOTHING of Acts C and D has been seen except Gemini's three C2M30 frames.

Verdict: the look is a real look, and it is uneven. The skies, the ink-and-band treatment, the creature kit and the UI type are good and coherent. The ground, the light, the held gun and the boss staging are not at the same level, and the weakest frames are weak for the same reasons again and again.

Strong: the Quay dusk sky and its silhouettes (tower, crane, bollards); the Cradle Annex (vine walls, glowing pods); the catacomb walls of C2M13 (drawers with skull labels, lit gold); creature turnarounds (distinct hues and outlines: red coat, navy coat, white gown, brown brute, horn robe); the pause, intermission and death screens (serif caps, amber rules, plain tables); the HUD (readable in every frame).

Weak, ranked by how many frames it spoils:
1. FLOORS. One tone with sparse noise: Quay plaza and pier, C2M11 colonnade, C2M12 nave (a flat green-grey road to the horizon), Glass Steppe, the Annex water as scanlines. The walls carry the detail; the floor is a flat plane in most of the outdoor and corridor frames I read (I did not tally them).
2. THE HELD GUN IS NOT IN THE WORLD'S LIGHT. The cannon is the same full gold in a black catacomb, a cold blue nave, a green garden and a sunset. It pins the lower right quarter of every frame and breaks the mood of any dark one. (The stills tours start with the default cannon, so the variety of what a player holds is not judged here.)
3. LIGHT CLIPS INSTEAD OF GLOWING. C2M10: a lamp-lit pillar is one flat yellow, the figure beside it a featureless yellow-white cut-out; ten value bands and exposure 2.2 leave no mid-tone in a lit area.
4. DARK MAPS ARE BLACK, NOT DARK. C2M13: pure-black wall masses, a black cut-out creature, one unidentified red slab; only the one lit wall reads. No ambient floor, so the player cannot tell shapes in the dark.
5. THE SKY HAS CONFETTI. C2M11, C2M12, C2M14, C2M16: multicoloured pixel flecks over the dithered clouds read as noise in a still. Motion may change that; not judged.
6. BOSSES READ AS PROPS. Sub-Cantor (C2M16): a crimson mass filling the top of the frame, no face, limb or tell. Cantor (C1E1M08, 10-08 build, BEFORE the shield fix): teal streaks across the walls read as glitches; whether the fix cured that is not seen.
7. REPEATED MATERIALS AND PROPS: the Annex's vine panel on every face (wallpaper), the same stall twice on the Quay, six identical crate stacks at the Customs Hall.
8. HURT FLASH, and the title / key card text (see the first table).
Open, owner's taste: the default 480-pixel render width gives close walls and pillars chunky blotches (C2M10 pillar, Customs Hall door wall). It IS the look approved 2026-09-29; the question is whether the default should be 640.

Fix order (render only, no sim change; a Chrome job before and after each): (1) the hurt flash; (2) light the held gun by the place (the `lightbudget` / `LOOKS` lamp and hemisphere into the weapon scene); (3) a floor pass: lift the baked patches' contrast in `shading.js`, add per-look floor decals (planks, grates, puddles, rope, cracks, rubble) on the three exemplar maps first; (4) soften the lit-area clip (value bands over a brighter mid range, a lamp pool that falls off instead of cutting); (5) an ambient floor for dark maps (a rim of cool light on wall edges); (6) judge the sky flecks in motion; (7) the boss staging after (1) to (5), from real frames of each boss.
