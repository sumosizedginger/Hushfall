# HUSHFALL — game vision

## Premise
A low, patient tone begins over the fog-bound harbour town of Port Marrow: **the Hush**. Those who hear it stop running. The **Vael** — a fungal-crystalline choir-civilisation whose dying world can no longer sing — harvest human nervous systems as living tuning forks. Captured humans are hung in **cradles** and **grafted** with bronze bell-chitin, becoming **Tollbearers**: docile, hollow-eyed servitors who carry the Song and hunt the rest.
Protagonist: **Ines Calder**, Tide-Warden (harbour pilot), immune to the Hush because of a childhood ear injury — she cannot hear the tone, only its consequences.

## Motive and strategy
The Vael need a Song loud enough to open a permanent **Gate** to a living world. Every human mind is a note. Strategy: seed the Hush, herd survivors, graft them, then use the grafted as both army and instrument.
Ending (provisional): the Root Bell can be silenced, not destroyed — Ines rings the counter-tone and closes the Gate, choosing to stay behind on the Vael side to keep it closed.

## Pillars
1. **Fast readable combat**: distinct silhouettes and attack tells; movement is the defence.
2. **Environment tells the story**: the harbour town tells you what happened before anyone speaks.
3. **Painterly grit**: hand-painted, salt-and-rust, low internal resolution, bell-bronze and hush-teal accents.
4. **Authored spaces**: every map has a thesis; no cloned mazes.

## Campaign arc
- **C1 E1 Port Marrow** (harbour) · **E2 The Salt Works** (industrial processing) · **E3 The Choir Ships** (alien vessels) · **E4 The Hollow Sky** (orbit, the Gate).
- **C2 The Long Descent** (30 maps): A Threshold · B The Sounding Deep · C The Hive-Song · D The Root Bell.
- Secret maps (6): C1E1S01, C1E2S01, C1E3S01, C1E4S01, C2S01, C2S02. Entrance/return topology in `CAMPAIGN_MANIFEST.json`.

## Infection / transformation
Hush (audible tone) -> docility -> herding -> **cradle** (suspended, neural taps) -> **Graft** (bell-chitin seeded at shoulder) -> **Tollbearer**. Bells resonate: nearby Tollbearers act together; silencing a Bell staggers the pack.

## Weapon taxonomy (PROVISIONAL targets: planned 8, implemented 0, verified 0)
Melee/tool sidearm · **Flare cannon** (slow heavy projectile, splash, area denial by burning light) · Sawn pump gun (close burst) · Rapid rivet driver (sustained, low stagger) · Harpoon rifle (piercing, slow reload) · Charge-arc lamp (charge, chain) · Bell-breaker mortar (arc, splash) · Counter-tone emitter (late, alternate behaviour).

## Enemy taxonomy (PROVISIONAL: standard 6, elite 4, boss 8, set-piece 3; implemented 0)
Standard: Tollbearer (shambler) · Gaunt Runner (pursuit) · Bellhand (ranged tolling stun-shot) · Sexton (support, resurrects) · Chorister (suppression, flanking) · Drone-Gill (flyer).
Elite: Warden-Graft, Cantor Acolyte, Bulwark Shell, Weeping Mother.
Bosses: Cantor (E1), Graft-Mother (E2), Grand Cantor (E3), Gate Warden (E4), Sub-Cantor, Hive Cantor, Root Bell, plus one TBD.

## Production targets (PROVISIONAL — revise with evidence)
Art: wall/floor textures 256x256 source, sprites 128x128, weapon views 256x160, UI illustrations 320x200; painterly, nearest-neighbour final frame at low internal resolution (~480x300).
Performance: 60 FPS mainstream desktop browser, one map live at a time.
Map size: ~10-25 min per main map at first play; enemy placements 30-120 depending on thesis. Secrets vary by map.

## Major technical risks
1. p5.brush output determinism and painterly-vs-crisp sprite quality (see ART_BIBLE).
2. Authoring 68 distinct maps: needs a map format + reachability checker (decide in Gate 1).
3. Quality is not machine-testable: human review cadence.
4. Bake time (~10 s per page under software GL).

## Dated design changes
- 2026-09-29: User approved painterly look over strict pixel art; palette-lock/quantise step dropped.
- 2026-09-29: **Everything in the world is real 3D** (levels, enemies, weapon view-models, props); no billboard sprites. The p5.js/p5.brush look is delivered as painted texture atlases on code-authored low-poly Three.js meshes plus a painterly post pass (ink outline, paper grain, low-res nearest upscale). Affects: enemy/weapon recipes become UV-atlas recipes; sprite 8-direction sets dropped; models are code-authored and part-rig animated. Migration: `enemy_tollbearer_idle` / `weapon_flarecannon` PNGs are concept references only until replaced by atlases.
- 2026-09-29: **Controls pass (user request):** base walk raised 5.6 -> 6.4 m/s; added hold-Sprint (Shift, x1.55 forward only, cancelled by aiming, blocks firing until 0.18 s after release) and hold-Aim-down-sights (right mouse: FOV 70 -> 46, weapon centred with iron sights, hip cone 0.035 rad -> 0.003 rad, move speed x0.55, sensitivity follows zoom). Both have optional toggle mode. Affects: every weapon must define `spread`; save schema v2 (migration from v1); settings gain aimToggle/sprintToggle.
- 2026-09-29: **Look APPROVED by user** after the painted-3D look demo (review/look-demo/). Direction locked: real 3D world, p5.brush-painted atlases/textures, ink-outline + paper-grain + value-banded low-res post pass. Open polish items (not direction changes): reduce banding vs brush texture, organic enemy shapes, painted lighting.
