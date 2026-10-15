# DEEPSEEK SEES

**What this auditor can and cannot perceive of HUSHFALL, and the measurements used in place of sight.**
Independent audit agent · Hushfall repo `https://github.com/sumosizedginger/Hushfall` · branch `master` · commit **3c131cb4c32466e22e65a8c0fa875475d2d9c0d7** · audit date **2026-10-10** · read-only.

---

## 0. The honest core, in one paragraph

**I have no eyes.** This agent has no image-input tool: a PNG cannot enter my context (`read_file` on any `.png` returns `binary file … (NUL byte detected)`). I have not viewed a single one of the 1,329 screenshots in `review/`, nor rendered the game, nor heard any of its 147 sounds. Every visual statement below is therefore of one of three kinds: (a) **a numeric measurement of real pixels** produced by the tooling in `review/audit-deepseek/`, (b) **source confirmation** from the shaders, rig code and data tables, or (c) **documented claim** from the project's own writing. Nothing is "observed by eye". Where I give an aesthetic judgement it is labelled *Inference* and must be treated as a hypothesis that a sighted reviewer can overturn in one glance. This file exists so that nobody downstream mistakes my numbers for my opinion, or my opinion for my eyes.

---

## 1. Perception declaration

| Channel | Available? | Note |
|---|---|---|
| View images (vision model) | **NO** | No image tool is exposed to this agent. Confirmed by direct test. |
| Read PNG/text data programmatically | YES | `pngjs` 7.0.0 is a project devDependency; used for all measurements here. |
| Run the game / a browser | YES in principle (`puppeteer` 25.12.0, headless Chrome) | **Deliberately not used**: `AGENTS.md` forbids any Chrome/puppeteer/bake/shoot job without the owner's explicit go, and the owner reported (2026-10-06/08) that headless jobs take over their mouse. Nine other agents are running concurrently in this same working tree right now, which makes a browser job worse, not better. |
| Run node-only tools and tests | YES | Used: `npm run validate`, `npm test`, `tools/dev/map-shape.mjs`, `tools/dev/map-feel.mjs`, plus new measurement scripts. |
| Hear audio | **NO** | Not attempted. `validation/audio.json` is machine measurement only. |
| Read source, maps, routes, evidence JSON | YES | Extensively. |

**Consequence:** this audit can settle *structural, mechanical, statistical and production* questions with high confidence, and can give **only measured proxies** for *artistic* questions. Sections of the mission report that depend on looking at the picture (brushstroke character, composition, horror reveal, animation feel, UI legibility) are marked with their evidence class and their confidence, and several are marked **N/V (not verifiable here)** rather than guessed.

---

## 2. Audit header

- **Repository:** `https://github.com/sumosizedginger/Hushfall` (remote `origin`).
- **Branch / commit:** `master`, `3c131cb4c32466e22e65a8c0fa875475d2d9c0d7`, 2026-10-10 17:55 −0700. 170 commits.
- **Working tree:** dirty (untracked only: `Your Mission.md`, `review/assessment-2/`, `review/maps/C1E3*.png`+`C1E4M02/S01.png`, `review/pt-021/{a2,a2-quay,before,final}/`, and the new `review/audit-deepseek/`).
- **Environment:** Windows, bash; node v24.21.0, npm 11.19.1, python 3.11/3.14, git 2.52, ripgrep 15.1. No cargo/docker/go/make/rustc.
- **Stack confirmed from `package.json`:** three 0.186.1 (runtime); vite 8.3.1, p5 2.3.4, p5.brush 2.2.3, pngjs 7.0.0, puppeteer 25.12.0 (build/test only). Versions pinned, lockfile present.
- **Images actually viewed: 0.** Screens actually rendered: 0. Sounds heard: 0.
- **Tests actually executed:** `npm run validate` (OK, topology 68 slots); `npm test` (see §9); `node tools/dev/map-shape.mjs`; `node tools/dev/map-feel.mjs`; 6 new measurement scripts in `review/audit-deepseek/`.

---

## 3. Capability ledger — what was actually run

| # | Command | Result |
|---|---|---|
| 1 | `npm run validate` | `OK (topology 68 slots: C1 36, C2 32, main 62, secret 6)` |
| 2 | `npm test` | **752 tests, 752 pass, 0 fail** in 729 s (contended machine — eight other audit agents are running in this tree) |
| 3 | `node tools/dev/map-shape.mjs` | boxiness table for all 36 maps (§7) |
| 4 | `node tools/dev/map-feel.mjs` | feel table for all 36 maps (§7) |
| 5 | `node review/audit-deepseek/percept.mjs report` | 836 rendered frames measured across 11 evidence groups (§5, §8) |
| 6 | `node review/audit-deepseek/presentation.mjs` | internal resolution / grain / value structure on 10 frames (§5) |
| 7 | `node review/audit-deepseek/percept.mjs textures` | 53 wall+floor materials, 1,378 pairwise comparisons (§6) |
| 8 | `node review/audit-deepseek/percept.mjs atlases` | 19 creature atlases (§6) |
| 9 | `node review/audit-deepseek/separation.mjs` | do the 36 places look like different places (§7) |
| 10 | `node review/audit-deepseek/percept.mjs ab` | the outline pass, before/after (§8) |
| 11 | reads | `defs.js` (all 20 `LOOKS`, 19 `ENEMIES`, `DROPS`, `SUPPRESS`, `GUARD`, `FX`), `post.js`, `shading.js`, `weapon-pose.js`, `textures.js`, `view.js` (lighting), `models_choir.js` (factory list), `PRODUCTION_LOG.md`, `GAME_VISION.md`, `ART_BIBLE.md`, `assessment.md`, `design/LOOK_BIBLE.md`, `validation/*.json`, `review/gate-1/known-defects.json` |

**Not run (and why):** `npm run browsercheck`, `render-ground`, `browser-maps`, `audio-qa`, `bake`, any `shoot-*`. All require headless Chrome; all are forbidden without the owner's go.

---

## 4. Method — what replaces sight

Pixel statistics cannot see. They can falsify claims and they can quantify. The measures used, and what each is for:

| Measure | Definition | What it can legitimately settle |
|---|---|---|
| **Internal resolution** | run-length of byte-identical horizontally adjacent pixels; phase of run boundaries | whether the "low internal resolution" claim is true, and how much per-pixel detail can physically survive |
| **Luminance** | Rec.709 over the frame, p10/p50/p90 | whether the game is objectively dark, and how much of the tonal range it uses |
| **Very-dark share** | share of pixels with L < 0.09 | how much of the frame is near-black. **Note:** this is *not* "ink coverage" — the project's own mask measurement puts true ink lines at 1–5 % (`review/outlines/before/ink-share.json`) |
| **Value levels for 90 %** | distinct 8-bit luminance bins needed to cover 90 % of pixels | whether the value-banded post pass actually collapses the picture into flat bands |
| **Saturation / hue family share** | HSV per pixel; bins at 30°; warm = H<60 or H>330, teal = 150–200, violet = 240–300, all at S>0.18 | whether the documented colour rule ("teal = Vael only") holds in the pixels |
| **Edge share** | Sobel magnitude > 0.12, share of pixels | how much linear/graphic structure is present |
| **Grain energy** | mean \|Laplacian\| over locally-flat 3×3 neighbourhoods | whether the paper-tooth layer is present and how strong |
| **Histogram intersection** | 4-bit/channel colour histogram overlap of two textures, 0–1 | whether different materials are actually different, or "one recipe in different colours" |
| **Within/between separation** | distance between per-map mean feature vectors vs frame-to-frame distance | whether the 36 places are visually distinct or re-skins |

Caveat carried through everything: a still frame's statistics depend on **where the camera was pointed** (sky vs interior, enemy close vs far). These are aggregates over the project's own chosen vantage points, not a perceptual model.

---

## 5. Measurement A — how the game is presented

Measured on real captured frames from `review/level-*`, `review/render-ground`, `review/pt-029/stills`, `review/pt-021`, etc. **836 frames measured.**

### 5.1 Resolution: the "low internal resolution" claim is true and consequential
On ten full-size frames (all 1280×720):

- **70–80 % of horizontally adjacent pixel pairs are byte-identical**; median identical run = **3 px**; run-boundary phase across x mod 3 is uniform (0.337/0.333/0.330), i.e. the run pattern has a period that is not a multiple of 3 — the signature of a **nearest-neighbour upscale by ≈ 8/3**.
- Therefore the frame is rendered and post-processed at **≈ 480 px wide** and displayed at ≈ 2.67× nearest. This matches the documented target (`GAME_VISION.md`: "~480x300").

*Inference (high confidence):* the entire painterly post pass — ink, banding, grain, vignette, grade — runs at 480 px wide. Every mark in the game is budgeted at that width, and `design/LOOK_BIBLE.md` already states the consequence: "a mark thinner than about 1.2 px or closer than 6 px to the next is lost". This is the single most restrictive art constraint in the project and it is a deliberate design choice, not an accident.

### 5.2 The picture is objectively dark, and uses little of the tonal range
Mean over 836 frames: **luminance p10 0.08 / p50 0.22 / p90 0.45**.

Across the 31 maps with vantage tours, per-map mean luminance runs **0.147 → 0.646**; the median map sits near 0.22.

*Measured fact:* in a typical shipped frame the middle pixel is at ~22 % luminance and **even the 90th percentile of pixels is below mid-grey**. *Inference:* on a real display in daylight this is likely to read as murky rather than moody; the darkness is a global property, not a property of the dark maps. Note the exception: `C1E4M03 Cold Dock` measures **luma 0.646, very-dark share 0.03** — an almost blindingly bright, near-white room. So the range exists; it is the *default* that is dark.

### 5.3 Value banding is real but dithered — the old "posterised" criticism needs re-testing
`post.js` quantises luminance to `uLevels = 10` steps (11 levels), but applies the paper tooth *inside* the quantiser:
`lq = floor((lum0 + (p2-0.5)/uLevels) * uLevels + 0.5)/uLevels`.
That is **ordered dithering**: the grain decides which side of a step boundary a pixel lands on.

*Measured:* a frame's 90 % mass still spans **~88–98 distinct luminance levels**, not ~11. So the banding is being broken up by the grain, and the flat-colour collapse the old QA note feared (`TESTING.md` L82: "value-banding post pass reads more posterised-pixel than brushy") does not show in the histograms of current frames.

*Inference (medium confidence) — and the honest limit:* dithering removes *banding*, but it can replace it with *noise-that-reads-as-grain*. Whether the result looks like paper tooth or like dithered gradient is exactly the judgement I cannot make without eyes. A sighted A/B of the same room with `uPaint` on and off would settle it in one minute.

### 5.4 Colour: the documented rule holds better than the old assessment claimed
Across the 836 frames: mean saturation 0.37; **warm-hue share 0.29, teal-hue share 0.078, violet 0.074**.

- The old critique (`assessment.md` S5) said "teal means everything". In current pixels teal is a **~8 % accent**, an order of magnitude below the warm family. On this evidence the teal discipline was delivered (PT-021 and the LOOKS table).
- **But the hue neighbourhoods collide.** Measured from `assets/baked/`: `wall_bulkhead_a` (harbour steel, a *human* material) has teal-hue share **0.83**, and `wall_hull_a` **0.91**, `floor_hull_a` **0.92**, while the *alien* materials `wall_resin_a` **0.67**, `floor_grate_a` **0.28**. Human harbour steel and Vael growth are both cyan-blue; the distinction between "the Hush" and "the harbour" is carried by *brightness and treatment*, not by hue.
- `ART_BIBLE.md`'s palette anchors make this explicit and it is the root of it: harbour slate `#2b3a3f` is hue ≈ 195, Hush teal `#3fffe0` is hue ≈ 173. **Twenty degrees apart.** *Inference:* "teal = the Vael, nothing else" is a rule the palette cannot currently keep; it needs the human industrial family pushed to a genuinely different hue (or value) if the rule is to be legible.

### 5.5 The post-pass is doing the artistic work, and the A/B proves it
`review/outlines/before` vs `after` (same cameras, the PT-006 outline revision, 13 pairs):

| | before | after |
|---|---|---|
| very-dark share (L<0.09) | 0.217 | 0.233 |
| edge share | 0.0197 | 0.0205 |
| luminance mean | 0.237 | 0.235 |

The revision moved ~1.6 percentage points of the frame into near-black on the level surfaces. The project's own ink mask (`ink-share.json`) says true ink is 1.1–5 % of the 3D view, and **14–47 % inside an enemy's screen box** (`gaunt` 0.46, `bellhand` 0.27–0.31, `tollbearer` 0.17–0.18).

*Measured fact worth stating plainly:* **the Gaunt carries 2.5× the internal ink of a Tollbearer.** Either the Gaunt is deliberately the busiest silhouette (its "UNTUNED / spindly, 48 % of its silhouette thinner than 15 cm" design says yes), or its ink is over-budget relative to its neighbours. This is a cheap, specific thing for a sighted reviewer to check.

---

## 6. Measurement B — the materials (the PT-021 question, answered numerically)

`assessment.md` (2026-10-06) claimed: *"The 28 baked wall, floor and crate textures share one recipe: a flat base colour, translucent cloud blotches, a few short dash scratches, tiny rivet circles, varied only in colour and layout."* `ART_BIBLE.md` says PT-021 rebuilt the walls from material-specific generators, and explicitly says **the floors were not redone**.

**Colour-histogram test (53 wall/floor materials, 1,378 pairs, 4-bit RGB histogram intersection):**

- **Mean intersection 0.032** — the materials are, in colour terms, almost entirely different from one another.
- Only **one pair exceeds 0.5 by a wide margin**: `floor_clinker_a ~ floor_silt_a` at **0.89** (dark wet ash vs dark silt — plausibly the closest thing to a genuine duplicate in the set).
- Next: `floor_flag_a ~ floor_tile_a` 0.70; `floor_gill_a ~ floor_slurry_a` 0.54; `floor_hull_a ~ wall_resin_a` 0.52; `wall_bulkhead_a ~ wall_hull_a` 0.52.

**Structure test (per-material):** edge share spans **0.0026 → 0.389** (a 150× range) and luma spans **0.112 → 0.779** (a 7× range). The materials do not share an amount of detail either.

**Conclusion (measured, high confidence):** *the "one recipe in different colours" criticism is no longer true of the colour distributions, and is very unlikely to be true of the mark-making either.* The one caveat I cannot dismiss from numbers: histogram intersection ignores *marks*. Two surfaces could differ in colour and still be drawn with the same strokes. Given that PT-021 deliberately names a different generator per family (ribs, formwork panels, frost ferns, bone over membrane), and given the 150× spread in edge density, the same-mark hypothesis is unlikely — but it is **source-confirmed + measured-necessary, not observed**.

**Creature atlases (19):** every kind has its own `choir_<kind>.png`. Mean luma 0.26–0.38, saturation 0.17–0.48, edge 0.069–0.161 — i.e. **all nineteen sit inside a narrow band**. Warm-hue dominance 0.20–0.68, teal ≈ 0.00 in every atlas (the teal eyes are too small a share to register). Value structure differs sharply: `choir_grandcantor` 84 levels / `choir_graftmother` 74 / `choir_weeping` 77 against `choir_reed` 38 / `choir_gaunt` 41.

*Inference:* the atlases are consistent as a family (good for cohesion) and probably too uniform in overall value/saturation (bad for per-kind identity). The two bosses and the Weeping Mother are the only ones with substantial internal value structure. **This is the strongest remaining "sameness" risk in the art, and it is invisible in my evidence — it needs eyes.**

---

## 7. Measurement C — are the 36 places different places?

Two independent, node-only project tools plus my own separation test.

### 7.1 Boxiness (`tools/dev/map-shape.mjs`, all 36 maps)

| Map | size | rooms | corners | meanFill | levels% | floor heights | lid heights | void cells |
|---|---|---|---|---|---|---|---|---|
| C1E1M01 Marrow Quay | 48×34 | 5 | 12 | 0.88 | 0 | 1 | 1 | 0 |
| C1E1M05 Lamplighter Hill | 56×60 | 1 | 154 | 0.84 | 80 | 18 | 0 | 0 |
| C1E1M08 Bell Tower | 54×62 | 3 | 44 | 0.76 | 69 | 28 | 1 | 0 |
| C1E2M06 Pump Cathedral | 76×52 | 9 | 22 | **0.61** | 28 | 10 | 11 | 0 |
| C1E2M07 Slurry Undercroft | 68×48 | 3 | 28 | 0.70 | 0 | 1 | 1 | 0 |
| C1E3M04 Marrow Nave | 100×60 | 3 | 12 | 0.66 | 40 | 7 | 8 | 0 |
| C1E3M06 The Choir Loft | 80×48 | 3 | 28 | **0.63** | 78 | 8 | 5 | 0 |
| C1E4M01 Ascent Tether | 72×72 | 8 | 20 | 0.75 | 70 | 25 | 3 | **235** |
| C1E4M06 Gatekeeper's Approach | 90×118 | 2 | 186 | **0.60** | 74 | 11 | 14 | 0 |
| C1E4M07 The Hollow Stair | 66×66 | 1 | 186 | **0.56** | 80 | 33 | 1 | 634 |
| C1E4M02 Wreck Belt | 112×80 | 6 | 30 | 0.74 | 76 | 11 | 2 | **6632** |

*Measured fact:* the project's own published baseline ("11 of 27 maps have one floor height, 16 have one lid height, median room-fill 0.81") is visible in the table — **C1E2M07, C1E3M02, C1E3M07, C1E3M08, C1E2S01, C1E1M01 etc. each still have exactly one floor height and one lid height.** Against that, the Episode 4 maps are structurally different animals (25–33 floor heights, 235–6632 void cells).

### 7.2 Feel (`tools/dev/map-feel.mjs`, all 36)

| Map | walk cells | roofed | sight med/p90 | enemies | density | first enemy | alien props | secrets |
|---|---|---|---|---|---|---|---|---|
| C1E1M01 | 719 | 47 % | 5 / 15 | 16 | 22 | 11 m | 2 | 1 |
| C1E1M05 | 2428 | 0 % | 10.5 / 29.5 | 45 | 19 | 12 m | 0 | 0 |
| C1E2M02 | 2619 | 10 % | 13.5 / 37.5 | 54 | 21 | 10 m | 16 | 1 |
| C1E2M05 | 766 | 100 % | 5.5 / 14 | 17 | 22 | 9 m | 41 % | 1 |
| C1E3M04 | 2586 | 30 % | 12 / 36.5 | 23 | 9 | 17 m | 2 | 1 |
| C1E4M06 | 4398 | 75 % | 9.5 / 27.5 | 27 | 6 | 21 m | 0 | 0 |
| C1E4S01 | 305 | 100 % | 5 / 13 | **0** | – | – | 0 | 0 |

*Measured facts:*
- **All four secret maps (S01 ×4) contain zero enemies.** They are pure atmosphere/exploration rooms 220–565 walk-cells in size. That is a deliberate, consistent design decision and it is unusual.
- Encounter density falls from ~19–38 enemies/1000 cells in Episodes 1–2 to **6 per 1000 on `C1E4M06`** (4,398 walk cells, 27 enemies) — the largest, sparsest space in the game.
- Enemy counts per map: 16–54 (documented target 30–120 — the target is *not* met, and `GAME_VISION.md` admits it).

### 7.3 Do the maps look different? (my own separation test)

Per-map mean feature vector (luma, very-dark share, saturation, teal, warm, value-levels, edge, grain, top-3 palette shares) over 396 tour frames + 79 Episode-3 stills, for the 31 maps that have tours:

| | mean distance between maps | reading |
|---|---|---|
| **within Episode 1** | 0.092 | the most homogeneous block in the game |
| **within Episode 2** | 0.135 | |
| **within Episode 3** | 0.152 | |
| **within Episode 4** | 0.174 | the most varied |
| E1 ↔ E2 | 0.114 | *only slightly above within-E1* |
| E2 ↔ E3 | 0.164 | |
| E3 ↔ E4 | 0.163 | |
| all pairs | 0.141 | |

**And the frame-to-frame distance inside a single map is 0.143 — as large as the distance between maps.** That is the honest reading: **a first-order pixel statistic of a single frame does not identify the map**, because where the camera points (sky, wall, interior, enemy close-up) dominates. The map *means*, however, span a genuinely wide range:

| metric | min | max | ratio |
|---|---|---|---|
| mean luminance | 0.147 (C1E4M04) | 0.646 (C1E4M03) | 4.4× |
| saturation | 0.165 (C1E4M03) | 0.666 (C1E4M05) | 4.0× |
| warm-hue share | 0.061 (C1E4M03) | 0.877 (C1E4S01) | 14× |
| teal-hue share | 0.009 (C1E4S01) | 0.266 (C1E4M02) | 30× |
| very-dark share | 0.032 (C1E4M03) | 0.645 (C1E4M04) | 20× |

**Measured conclusions I am willing to defend:**
1. **Episodes 1 and 2 occupy the same region of colour space.** The historical criticism *"Episode 2 feels like Episode 1 with brown walls"* survives measurement for the shipped E1/E2 material, even though the PT-021 pass and the LOOKS table have since been applied to them.
2. **Episode 3 and Episode 4 are measurably their own places.** `C1E4M03` (bright, desaturated, warm-free, almost no dark) and `C1E4M04` (near-black, 0.65 very-dark) are the two poles of the whole game.
3. **The campaign gets more varied as it goes.** Within-episode spread rises monotonically E1 → E4 (0.092 → 0.174). The "just changes texture palettes" worry is *not* what the numbers show for the back half.

*Limit:* this test uses one feature vector per map and aggregates still frames. It cannot distinguish "different colour grade" from "different architecture". §7.1 covers architecture separately and reaches the same split — Episodes 1–2 are one-floor-height boxes far more often than the later episodes.

---

## 8. Measurement D — the creature/weapon rigs, from source

Not measurable by eye here, but the project's own tests encode the constraints, and the code is readable.

- **19 enemy kinds** in `defs.js` (`tollbearer, gaunt, bellhand, sexton, wardengraft, bellnode, cantor, gill, feeder, graftmother, chorister, bulwark, acolyte, weeping, vat, reed, grandcantor, gatewarden, seal`).
- **19 rig factories** in `src/render/models_choir.js` (741 lines) — `FACTORIES` maps each kind to its own builder. The old `assessment.md` S1 finding ("the Tollbearer, Bellhand, Sexton, Warden-Graft and Cantor are all built by the same function, *five creatures, one body*") is **source-falsified as of this commit**: each kind now has its own factory, its own atlas (`choir_<kind>`), and a two-stage Tollbearer (`tollbearer0` early graft for Episode 1, `tollbearer` from Episode 2).
- The project's own redesign measurement (`design/LOOK_BIBLE.md` B2) reports silhouette overlap **0.52 / 0.54 / 0.50** for the three humanoid pairs against a **< 0.50 target**, and states the physical reason: *"the hit radius caps a 2.3 m upright figure at about 0.8 m wide, so three humanoids of the same height share most of their silhouette"*. The owner accepted this. **This is the single most important open art risk in the project and it is honestly documented rather than hidden.**
- Cost: the redesign raised triangles **1.2×–2.5×** and mesh counts on non-humanoids (e.g. Graft-Mother 1,076 → 2,398 triangles / 31 → 59 meshes). `LOOK_BIBLE.md` states plainly that **frame time has never been measured on the new rigs**.
- **15 weapons**: 9 guns (`flare, scattergun, rivet, harpoon, arc, carbine, linethrower, fork, mortar`) plus 6 melee (`fists, boathook, marlinspike, mallet, axe, chainsaw`). `weapon-pose.js` derives the ADS pose from each rig's named `sights`, so the sight picture is data-driven and shared with the node-only preview rasteriser — a genuinely good engineering decision.
- **Melee hit-stop and camera kick are view-only and testable** (`FEEL`: jab 0.035 s stop, mallet 0.09 s), and `strikeTime` is defined so the drawn blow *ends exactly when the sim resolves the hit*. That is a level of feedback care that most indie FPS projects never reach.

*Inference (medium):* the creature work is where the project is most likely to have improved most since `assessment.md`, and also where I am least able to confirm it. My atlas measurement (§6) shows all 19 kinds inside a narrow value/saturation band, which is a mild counter-signal — but atlases are not creatures.

---

## 9. Measurement E — sim truth and what the tests actually assert

*(from the run in §3 row 2: **752 tests / 752 pass / 0 fail**, 729 s)*

The suite is the largest automated-verification body seen in a project of this size: 752 assertions running headless in node, no browser. Sample of what a single run asserts, quoted from the live output: route bots through every canonical route, save-schema migrations that must still *play* after migrating, per-weapon table sanity, enemy steering regressions, the weapon wheel's clock ("D7 does not touch the simulation: the world after N slowed frames is exactly the world after the same number of straight ticks"), and pad menu navigation.

The evidence architecture is the strongest thing in this repository and it is worth stating what it does **not** cover:
- `validation/campaign.json` at HEAD: **PLANNED 32, IMPLEMENTED 36, AGENT_VERIFIED 0, COMPLETE 0.**
- The `PRODUCTION_LOG.md` records 27 AGENT_VERIFIED as of the last regeneration. The reason for the zero is the project's own freshness rule: the *stored* per-map evidence still carries its generation-time verdicts (26 of 36 maps pass every stored check), but `tools/validate.mjs` re-derives freshness live and finds **all five source sets changed** since the evidence was written — `engine bcd3f921… → e6a7e75b…`, `render 92c7cbbb… → 615f7022…`, `game 2bd487a8… → 86d5385e…`, `audio 0e41b26c… → cbb273a8…`, `assets 6011da47… → 5ecd8f37…`. So at this commit **the entire catalogue is one regeneration away from its claimed state**, and the regeneration is blocked on the owner freeing the machine. Only Episode 4's nine maps also fail their own per-map real-game check (`validation/browser/C1E4*.json`), because those nine have never been through the real-game loop at all.
- **No map is `COMPLETE`** — no human review of any map is recorded anywhere. That is the correct, derived status and it is the single biggest caveat on every "quality" claim in the project's own documentation.
- `verify-map` asserts, per map: route × 3 difficulties reach the exit; a passive runner cannot get through; a perfect fighter takes damage and finishes on enough seeds; damage rises with difficulty; par is 2×–8× the bot's time; ammunition ≥ 1.5× what the bot fires; robustness under 0.03 rad aim error and 25 % less ammo; a gate-skip probe; no unreachable pickups; all secrets reachable; no floating ceilings; every walkable/fallable cell can still reach an exit; browser sim == node sim. This is a **genuinely unusual** amount of automated game-design verification.
- `validation/audio.json`: **147 SFX** rendered offline; peak min/median/max **0.061 / 0.353 / 0.93**; **24 of 147 are not bit-exact on re-render** (max 1 LSB). Scope note in the file itself: *"each recipe rendered ALONE offline; the live master chain, overlap and music-vs-effects balance are not measured."*

---

## 10. Source-confirmed ledger (what the code says)

Things I can state without seeing anything, because they are structural:

- **No shadow maps anywhere.** `view.js` lighting = one `HemisphereLight` + one `DirectionalLight` + a small fixed set of `PointLight`s (flare, boom, muzzle, lamp, burn, rocket) + `FogExp2`. `assessment.md` S6 said this and it is **still true at HEAD**. The counter-argument is real and must be weighed: `shading.js` bakes wall-foot/wall-head darkening, corner occlusion and large soft patches into level vertex colours, and `lightbudget.js` keeps the nearest 8 lamps lit and fades the last so nothing pops. So the *absence of real-time shadows* is a deliberate, compensated decision — but **actors still cast nothing**.
- **`LOOKS`: 20 named place-grades** in `defs.js` (harbour → gate), each with hemisphere/sun/lamp/exposure/post-grade/baked-shade. This is a real colour script per place, and the default `harbour` is exactly the pre-PT-021 light so older maps are unchanged. Episodes 3 and 4 have their own (`choir, loom, loft, foundry, throat, tether, wreck, mirror, quiet, dock, orchard, approach, stair, gate`). **This is the mechanism that produces the measured E3/E4 separation in §7.3.**
- **The post pass is tuned for the entities/level split** (`entityflag.js`): enemies and the weapon write alpha 0 so they keep the *original* ink while only the level gets the newer corner ink. That is a targeted response to the owner's PT-006 complaint ("the ink looked like wireframes on the enemies") and it survives in the shader with a `?outline=classic` escape hatch for comparison.
- **`DROPS`**: ammunition comes from the dead, not from boxes — typed to the emptiest gun fired recently, with a pity timer and a magnet. This is a *design* answer to a design problem, and it is the kind of decision that separates this project from asset-pack assembly.
- **Determinism is a first-class contract**: fixed 1/60 tick, seeded RNG, per-system lazy state (`w.drops`, `w.tears`, `w.patches`, `w.mirrors`, `p.air`) explicitly justified as "a world that never uses them is byte-for-byte what it was", with `route-fingerprint.mjs` proving 414 identical runs after the Episode 4 air engine landed. Very few commercial projects hold this line.

---

## 11. What I could NOT establish

Listed so no reader over-reads this file. Each of these is a **blind spot of this audit**, not a finding:

1. **Whether anything looks good.** Brushstroke character, composition, lighting mood, horror reveal, UI legibility, animation quality, tell readability — all unverifiable here. §5.3's dithering question and §6's "same marks?" question and §8's humanoid-silhouette risk are the three places where a sighted reviewer should look *first*.
2. **How the game feels to play.** I ran no browser. Dodge, recoil, hit feedback, pacing, difficulty — zero direct evidence. The bot evidence in `validation/` is real but is not a human.
3. **Performance on real hardware.** `known-defects.json` F12 is still `open`: *"All measurements are headless Chrome on software GL. Nothing here says 60 FPS on a real machine."* I could not improve on that.
4. **Sound.** No listening. The 24/147 non-bit-exact renders and the self-declared "solo, not mixed" scope are the only facts available.
5. **Any human judgement of any kind.** `COMPLETE: 0`. Nobody has reviewed a map; the owner has played Episodes 1–3 partially and Episode 4 not at all.

---

## 12. Confidence summary

| Claim | Class | Confidence |
|---|---|---|
| Presentation renders at ≈480 px wide, nearest-upscaled ≈2.7× | Observed (measured) | high |
| Frames are dark: p50 ≈ 0.22, p90 ≈ 0.45 | Observed (measured) | high |
| Value banding is dithered by the paper tooth; frames still span ~90 luminance levels | Observed + source | high |
| Teal is a ~8 % accent, not "everything" | Observed (measured) | high |
| "One texture recipe in different colours" is false at HEAD for colour and likely for marks | Observed (measured) + source | medium-high |
| Human harbour materials and Vael glow share a hue neighbourhood (≈195° vs ≈173°) | Observed (measured) | high |
| Episodes 1–2 are visually homogeneous; 3–4 are not | Observed (measured) | medium-high |
| All 19 creature atlases sit in a narrow value/saturation band | Observed (measured) | high |
| Creature *rigs* are visually distinct enough | Source + documented claim | low — needs eyes |
| Whatever the game looks like, it looks *good* | — | **N/V** |
| Whatever the game plays like | — | **N/V** |

---

## 13. Reproduce

```bash
node review/audit-deepseek/percept.mjs report        # 836 frames, 11 groups -> review/audit-deepseek/groups.json
node review/audit-deepseek/percept.mjs textures      # 53 materials, 1378 pairs -> texture-similarity.json, texture-stats.json
node review/audit-deepseek/percept.mjs atlases       # 19 creature atlases -> choir-atlases.json
node review/audit-deepseek/percept.mjs ab            # the outline pass, 13 paired cameras -> outlines-ab.json
node review/audit-deepseek/presentation.mjs          # internal resolution, grain, value structure
node review/audit-deepseek/separation.mjs            # do the 36 places look different -> map-separation.json
```

All six scripts are **read-only**: they read PNGs and JSON, write only inside `review/audit-deepseek/`, and touch nothing in `src/`, `assets/`, `maps/`, `routes/` or `validation/`.

---

## 14. Evidence-class key (used throughout the mission report)

- **Observed (measured)** — a number produced by a script in this session over real repository data.
- **Source-confirmed** — established by reading code or data; not tested at runtime.
- **Documented claim** — stated by the project's own docs/validation, not independently verified here.
- **Inference** — my judgement or prediction. **Never** a substitute for looking.
- **N/V** — not verifiable in this environment.
