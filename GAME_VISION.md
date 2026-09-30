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

## Weapon taxonomy (PROVISIONAL targets: planned 8, implemented 3, verified 0 by a human; 3 by automated tests + browser checks)
Implemented 2026-09-30 (Gate 2): **Riveter driver** (slot 3): hitscan, 7 damage at ~12 rounds/s, accuracy blooms the longer you hold the trigger; the workhorse when shells and flares run dry, the answer to crowds of weak targets. Ammunition is per-weapon (rivets max 200).
Implemented 2026-09-29: **Flare cannon** (slow arcing projectile, splash, self-damage, area denial) and **Tidewarden scattergun** (hitscan, 9 pellets, falloff, no splash: close-range punch). They force different decisions: the flare rewards distance and leading targets, the scattergun rewards closing in.
Melee/tool sidearm · **Flare cannon** (slow heavy projectile, splash, area denial by burning light) · Sawn pump gun (close burst) · Rapid rivet driver (sustained, low stagger) · Harpoon rifle (piercing, slow reload) · Charge-arc lamp (charge, chain) · Bell-breaker mortar (arc, splash) · Counter-tone emitter (late, alternate behaviour).

## Enemy taxonomy (PROVISIONAL: standard 6, elite 4, boss 8, set-piece 3; implemented 2026-09-30: standard 4, elite 1, boss 1)
Implemented in Gate 2: **Bellhand** (ranged toll-shot, dodgeable), **Sexton** (support: channels over a corpse for 2.2 s and raises it at half health, twice at most; keeps away; hurting it interrupts the rite), **Warden-Graft** (elite: front plate takes 34% from direct hits, splash ignores it; a straight charge after a lowered-shoulder tell that stuns it for 2.6 s if it hits a wall or pillar), **Cantor** + six **bell nodes** (boss: 5% damage while any node rings; sever a node and it staggers; tone pulses are expanding rings that stone stops and that pass beneath a player standing 1 m higher; summons Gaunts; once the ring is broken it fans toll-shots).
Implemented 2026-09-29: **Tollbearer** (slow, tough, readable arm-raise tell, bell that tolls) and **Gaunt Runner** (fast, fragile, crouch-then-dash tell that a strafe defeats; punishes standing still). Enemies steer around obstacles.
Standard: Tollbearer (shambler) · Gaunt Runner (pursuit) · Bellhand (ranged tolling stun-shot) · Sexton (support, resurrects) · Chorister (suppression, flanking) · Drone-Gill (flyer).
Elite: Warden-Graft, Cantor Acolyte, Bulwark Shell, Weeping Mother.
Bosses: Cantor (E1), Graft-Mother (E2), Grand Cantor (E3), Gate Warden (E4), Sub-Cantor, Hive Cantor, Root Bell, plus one TBD.

## Production targets (PROVISIONAL — revise with evidence)
Art: wall/floor textures 256x256 source, sprites 128x128, weapon views 256x160, UI illustrations 320x200; painterly, nearest-neighbour final frame at low internal resolution (~480x300).
Performance: 60 FPS mainstream desktop browser, one map live at a time.
Map size (TARGET, not yet achieved): ~10-25 min per main map at first play; enemy placements 30-120 depending on thesis. Secrets vary by map. Measured at Gate 2 (bots, not people): the nine Episode 1 maps hold 16-45 enemies and a perfect bot needs about 70-180 s per main map on normal; every par is a placeholder (2x-8x the bot). Whether a human needs the 10-25 min target is unknown and was NOT demonstrated: the maps are bigger and more varied than Marrow Quay, but nobody has timed a person. Inventory rule (audit A16/R07): each map starts at full health, with the previous map's ammunition and weapons floored at that map's authored loadout, so authored scarcity is a floor on what a campaign player has, not a ceiling.

## Audio identity (implemented 2026-09-29, all procedural)
Bronze bells are the alien voice: each awake Tollbearer tolls faintly and out of tune with its neighbours; the score is a low D-phrygian drone with sparse FM Bell motifs and, under tension, a pulse. The Hush is a faint beating sine pair that swells near alien growth (pods) and rings in the secret sting. Human/industrial sounds are dry and low (planks, iron, oilskin). Combat sounds are short and heavy so tells (wheeze, toll) stay readable.

## Major technical risks
1. p5.brush output determinism and painterly-vs-crisp sprite quality (see ART_BIBLE).
2. Authoring 68 distinct maps: needs a map format + reachability checker (decide in Gate 1).
3. Quality is not machine-testable: human review cadence.
4. Bake time (~10 s per page under software GL).

## Dated design changes
- 2026-09-30: **Gate 1 direction approved by the user** ("APPROVE DIRECTION we have the power to do anything, please be braver"). Gate 2 opened; design instruction: be braver (verticality, moving floors, ambushes, elites, a real boss, hazards, a distinct thesis per map). Episode 1 briefs: `design/EPISODE1.md`.
- 2026-09-30: **Episode 1 Port Marrow built** (C1E1M01-M08 + secret S01). Kit added: terrain heights/ceilings/stairs, moving floors, wall switches (some demand items), trigger scripts, ambush closets, wading/toxic hazards, locked and sealed doors, dark levels that brighten, key labels (the Signal House calls keys fuses). Roster and Riveter above. Maps: M02 Customs Hall (keys, closets, gallery), M03 Fishmarket Rows (switches, Bellhand packs, gutters), M04 Drowned Chandlery (wading, toxic pools, secret exit to S01), M05 Lamplighter Hill (five terraces, funicular car, Sextons, summit beacon), M06 Ferry Terminal (Warden-Graft, bow-ramp slab that a winch drops, waves), M07 Signal House (dark, scarce ammo, three fuses, first Vael transmission), M08 Bell Tower of St. Orrin (spiral ascent, sealed chamber, Cantor). Tone pulses, the shield, node links and the boss bar are drawn from sim state.
- 2026-09-29: User approved painterly look over strict pixel art; palette-lock/quantise step dropped.
- 2026-09-29: **Everything in the world is real 3D** (levels, enemies, weapon view-models, props); no billboard sprites. The p5.js/p5.brush look is delivered as painted texture atlases on code-authored low-poly Three.js meshes plus a painterly post pass (ink outline, paper grain, low-res nearest upscale). Affects: enemy/weapon recipes become UV-atlas recipes; sprite 8-direction sets dropped; models are code-authored and part-rig animated. Migration: `enemy_tollbearer_idle` / `weapon_flarecannon` PNGs are concept references only until replaced by atlases.
- 2026-09-29: **Controls pass (user request):** base walk raised 5.6 -> 6.4 m/s; added hold-Sprint (Shift, x1.55 forward only, cancelled by aiming, blocks firing until 0.18 s after release) and hold-Aim-down-sights (right mouse: FOV 70 -> 46, weapon centred with iron sights, hip cone 0.035 rad -> 0.003 rad, move speed x0.55, sensitivity follows zoom). Both have optional toggle mode. Affects: every weapon must define `spread`; save schema v2 (migration from v1); settings gain aimToggle/sprintToggle.
- 2026-09-29: **Look APPROVED by user** after the painted-3D look demo (review/look-demo/). Direction locked: real 3D world, p5.brush-painted atlases/textures, ink-outline + paper-grain + value-banded low-res post pass. Open polish items (not direction changes): reduce banding vs brush texture, organic enemy shapes, painted lighting.
- 2026-09-29: (Gate 1 audit repair) a third enemy, the **Bellhand**: a converted bellman with a bronze hand-bell; holds ~9 m away and tolls a slow teal shot after a readable arm-raise (dodge by strafing). Tollbearers are faster (1.8 m/s), Gaunts 4.2 m/s. The Marrow Quay secret (net-loft) now holds two armour vests and shells, has a faint lamplight tell at the panel seam, and a hint in the pilot's log.
