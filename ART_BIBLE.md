# ART BIBLE (Gate 0 draft)

## Direction (updated 2026-09-29: all world content is 3D)
World = real 3D Three.js meshes (levels, enemies, weapon view-models, props), code-authored low-poly, part-rigged. p5.brush bakes painted UV texture atlases for them; a post pass adds ink outline, paper grain and low-res nearest upscaling. Existing sprite recipes are concept references, to be replaced by atlas recipes.

Painterly, hand-painted, 1990s-shooter structure: low internal render resolution with nearest-neighbour upscaling of the final frame. Assets keep visible brush character (washes, ink outlines, salt/rust grime) but with crisp alpha edges and solid bodies. User-approved 2026-09-29: painterly over strict pixel art.

## Palette anchors (per-map palettes are constrained subsets)
Harbour slate `#2b3a3f #34474c #3a4e52` · rust `#7a4a2b #5c3620 #8c5a30` · oilskin yellow `#c9a227 #b8951f #8a6d18` · bell bronze `#b8722e #d9a04c #e0aa5a` · Hush teal `#3fffe0 #3fd6c0` · spore violet `#5b3f7a` · ink `#0d0f14 #10181a` · dusk sky `#1a1233 #48246a #c0587a #e8946a`.
Rule: teal is reserved for Vael/Hush signalling (eyes, veins, energy). Yellow oilskin = human/Tide-Warden identity.

## Source resolutions
Wall/floor/ceiling tiles 256x256 (seamless, wrapped drawing) · enemy sprites 128x128 · weapon views 256x160 · UI illustrations 320x200. Final frame nearest-neighbour; textures use `NearestFilter`, no mipmap blur on sprites.

## Transparency
Sprites bake on black AND white (same seed); alpha is recovered by difference matting in `tools/bake.mjs`, then hardened with `alphaCurve` (default [0.12, 0.4]) for solid bodies and crisp edges. Known artefact: coloured speckle on low-coverage edge pixels (see known defects).

## Pipeline facts (verified)
- Versions: p5 2.3.4, p5.brush 2.2.3 (p5-integrated build, `import * as brush from 'p5.brush'`), three 0.186.1, vite, puppeteer (Chrome 154, SwiftShader software GL), pngjs.
- Pattern: `new p5(sketch)`; inside sketch `brush.instance(p)` before setup; `createCanvas(w,h,WEBGL)`; `pixelDensity(1)`; then `brush.seed(seed)` and `brush.noiseSeed(seed)` explicitly (the p5 `randomSeed` hook does not reach brush in ESM instance mode; without it output is non-deterministic).
- Brush coordinates are canvas-centred; recipes author in top-left px via `wrap()`.
- One p5 instance per page (brush binds GL state to the first instance).
- Brush does not draw into a transparent canvas -> matting workaround.
- Brush fill washes are translucent by default; use `blob()` helper (fillTexture 0.2, bleed 0.1) and alpha hardening for solid sprites.

## Asset seeds (recipes in `tools/baker/recipes.js`)
| asset | source | seed |
|---|---|---|
| wall_bulkhead_a | 256x256 | 1101 |
| enemy_tollbearer_idle | 128x128 | 2201 |
| weapon_flarecannon | 256x160 | 3301 |
| ui_title_art | 320x200 | 4401 |

## Commands
`npm run bake` (all) · `node tools/bake.mjs <id>` · `node tools/preview.mjs` · `node tools/dev/determinism.mjs <id>` · `node tools/dev/clean-regen.mjs`.

## Asset seeds, 3D set (2026-09-29; recipes in `tools/baker/recipes3d.js`)
| asset | size | seed | use |
|---|---|---|---|
| tollbearer_atlas | 256 (4x4 cells) | 5101 | Tollbearer + Gaunt Runner skin/coat/bronze/jaw cells |
| flarecannon_atlas | 256 (4x4) | 5201 | flare cannon + scattergun (brass, steel, leather, oilskin, wood) |
| floor_planks_a | 256 tile | 5301 | interior floor, pier planks (tinted), ceilings |
| crate_wood_a | 256 | 5401 | crates, barrels, beams, stalls |
| pod_organic_a | 256 tile | 5501 | cradle pods |
| sky_dusk | 512x256 | 5601 | sky dome |
| paper_grain | 128 tile | 5701 | post-pass paper tooth |
| door_hatch_a | 256 | 5801 | doors + exit gate |
| props_atlas | 256 (4x4) | 5901 | pickups |
| water_dusk | 256 tile | 6101 | harbour water (scrolled slowly) |
| cobble_wet_a | 256 tile | 6201 | plaza cobble |
| brick_warm_a | 256 tile | 6301 | brick buildings |
| awning_stripe_a | 128 | 6401 | fish-stall awnings |
| boat_hull_a | 256 tile | 6501 | moored boats |
| tower_stone_a | 256 tile | 6601 | bell tower |
Tile skins in the map grid: `#` slate bulkhead, `B` warm brick, `.` interior planks, `:` cobble, `p` pier planks, `~` water. Full-width `brush.rect` fills can crash p5.brush's scatter: use `g.solid` (native p5) for opaque bases.


## Asset seeds, Gate 2 set (2026-09-30; recipes in `tools/baker/recipes_g2.js`, all opaque and tiling)
| asset | size | seed | use |
|---|---|---|---|
| wall_timber_a | 256 tile | 7101 | weathered vertical siding: fishing sheds, cellars (`T`) |
| wall_plaster_a | 256 tile | 7201 | cream plaster over a green wainscot: Customs Hall, dormitory (`P`; per-face vertical UVs, clamped) |
| wall_concrete_a | 256 tile | 7301 | poured concrete: ferry hull, signal house (`C`) |
| wall_iron_a | 256 tile | 7401 | riveted iron plate: ferry, funicular shaft, gantries (`I`) |
| wall_resin_a | 256 tile | 7501 | Vael resin, teal-violet, veined and faintly luminous (`R`) |
| floor_tile_a | 256 tile | 7601 | black-and-cream checker (`t`) |
| floor_grate_a | 256 tile | 7701 | iron grating over black water (`g`) |
| floor_carpet_a | 256 tile | 7801 | worn red-brown runner (`c`) |
| floor_flag_a | 256 tile | 7901 | indoor flagstones (`f`) |
| floor_silt_a | 256 tile | 8001 | wet silt: outdoor gutters (`m`) and indoor cellar floors (`n`) |
| floor_slate_a | 256 tile | 8101 | outdoor slate flags: hill terraces (`s`) |
| sky_night | 512x256 | 8201 | the Hush by night: indigo, faint teal aurora |
| sky_overcast | 512x256 | 8301 | low fog-bound cloud, grey-lilac |

Code-authored (no texture): the Sexton (stooped, hooded, staff-bell), the Warden-Graft (plate: pauldrons, chest plate, mask, shield arm), the Cantor (robed, bell crown, chest bell) and the bell nodes are extra meshes on the Tollbearer rig (`models.js`, `models_g2.js`); set dressing (cart, sack, rope, table, shelf, lantern, cradle, bell node, switch panel) and the Riveter driver (`models_rivet.js`) are geometry wearing the existing atlases. Effects are drawn from sim state: channel beams and node links (thin teal cylinders), the Cantor's shield (teal wire icosahedron), tone-pulse rings (expanding flat rings).

Lighting: `atmosphere.ambient` (0.05-1.5, default 1) scales the hemisphere and sun light; a dark level (Signal House, 0.3) is carried by lantern pools and brightens through the `lights` action. Skies in use: `dusk` (ferry quay), `night`, `overcast` (hill).


## Asset seeds, Episode 2 set: The Salt Works (2026-10-05; recipes in `tools/baker/recipes_e2.js`, all opaque and tiling; Gate 3 pilot, `design/GATE3.md`)
| asset | size | seed | use |
|---|---|---|---|
| wall_saltbrick_a | 256 tile | 9101 | salt-caked brick, pale with rust weeping from the joints: boundary walls, gatehouse, kiln stacks (`L`) |
| wall_corrugated_a | 256 tile | 9102 | rusted corrugated sheet with copper-green bloom: pump houses, kennels, the guardhouse, fences (`K`) |
| floor_saltcrust_a | 256 tile | 9201 | cracked salt crust over rust stains and shallow brine: the open pans (`l`, outdoor) |
| wall_kiln_a | 256 tile | 9103 | sooted kiln brick, black with live orange seams burnt through the mortar: Kiln Row (`Y`) |
| wall_rime_a | 256 tile | 9104 | frosted steel plate, riveted seams, ice growing from the joints: the Rime Vault (`Z`) |
| floor_track_a | 256 tile | 9202 | rail ballast with two rails and timber sleepers running east-west: the Rail Yard (`b` outdoor, `q` roofed) |
| floor_clinker_a | 256 tile | 9203 | kiln clinker and ash cracked with embers (jagged polylines, dark then ember orange): Kiln Row (`k`) |
| floor_slurry_a | 256 tile | 9204 | dark wet slurry with an oily sheen and bubbles: the Slurry Undercroft (`v`) |
| floor_rime_a | 256 tile | 9205 | frosted steel deck plate: the Rime Vault (`r`) |
| floor_ember_a | 256 tile | 9206 | the ember bed: bright glowing bed with dark crust plates and cracks; drawn UNLIT as the overlay of floor effect `h`, one tile per metre (`levelmesh.js`) |

Adding a skin is now: a recipe (new seed in this table), ONE row in `WALL_SKINS`/`FLOOR_SKINS` in `src/engine/defs.js`, and `node tools/bake.mjs <asset ids>`. The level builder's floor characters and the texture list in `src/render/textures.js` are derived from those tables (a floor-character string in the builder and a hand-kept name list used to need edits too). Known p5.brush limit (again): narrow or full-size brush rects crash its scatter; flat opaque areas use `g.solid`.

## Asset seeds, the PT-021 material pass (2026-10-08; recipes in `tools/baker/recipes_pt21.js`, which SUPERSEDES the earlier recipe of the same id: `all.js` spreads it last; seeds unchanged)
The outside critique (PT-021) was right that the surfaces were "one recipe in different colours": every earlier wall used the same ingredients (translucent blooms, short white dashes, black dash scratches, dots). The new walls are built from what each material does, big shapes and strong value steps first (the game renders about 480 px wide and bands the value, so fine lines vanish at distance), small marks last, and NO ingredient shared across families:
| asset | what it is now |
|---|---|
| wall_corrugated_a (9102) | galvanised sheet: ribs shaded trough / flank / crest / flank, two overlapped sheets, bolts with rust weeping from them, salt crust rising from the foot |
| wall_plaster_a (7201) | cream plaster over a green wainscot: a rising-damp tide mark, patches fallen away to the brick (courses and all), cracks, a chair rail |
| wall_timber_a (7101) | silvered boards: grain, knots with a swirl, nail rows with rust runs, dark gaps, salt and damp at the foot |
| wall_iron_a (7401) | riveted plate: a weld bead, a lit top and a shaded lower edge, rivets (shadow, dome, glint) with rust running from them, a faded hazard band |
| wall_concrete_a (7301) | poured concrete: form panels of different greys, board marks, aggregate, tie holes with rust weeping, spalls with rebar, efflorescence, soot at the head, green at the foot |
| wall_saltbrick_a (9101) | pale salt-caked brick: the crust thickest at the foot, crystalline patches, rust from the joints |
| wall_kiln_a (9301) | black fire-cracked brick with glowing mortar and a dusting of ash |
| wall_rime_a (9302) | frosted steel: frost ferns growing from the corners and the seams |
| wall_resin_a (7501) | the Vael's growth: bone ribs over a dark wet membrane with veins and sacs (it was a violet sheet of lightning) |
| wall_bulkhead_a (1101) | harbour steel: teal plates, the tide line, barnacles below it, algae at the foot |
| sky_bleach (8401), sky_ash (8402) | new skies for the salt works (a white-grey glare with a yellow-green haze) and the kilns (smoke with a dull glow); every painted sky is made seamless at load |
| decals_atlas (9701), guns_atlas (9801) | the marks (4 x 4 cells, transparent: blood and ichor splats, pock, drip, pools, scorch, smear, scrapes, damp, soot) and the guns' own materials (4 x 4 opaque cells: walnut, blued steel, brass, copper, enamel, perforated sheet, rubber, oak, iron, rope, lantern brass, glass, coil, porcelain, leather, gunmetal) |
| ui_title_art (4401) | redone: the harbour at dusk, a bell tower with one lit window, the sun's road, a lamp on the quay, rings of teal sound |
`BAKE_PREVIEW=<dir> node tools/bake.mjs <ids>` writes the PNGs to a folder and touches neither `assets/baked` nor the manifest (recipe iteration). Floors and the brick, stone and wood props are NOT redone (the floors are still the earlier recipes).

## Not yet done
Texel-density rules, per-episode palettes, UI/HUD rules, sprite direction sets (8-way vs billboard), animation frame counts, runtime Three.js material verification.
