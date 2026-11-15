# The visual plan: handoff to the next builder (written 2026-11-14)

Read this first, then `design/VISUAL_AWE_PLAN.md` for the full plan. The rules of `design/OPUS_HANDOFF.md` section 1 apply (no browser job without a named yes, never kill by image name, commit locally and never push, low usage, no backticks or regexes in shell strings: use the Write and Edit tools).

## 1. Where it stands

Branch `master` in `D:\Doom`, clean, local commits only (nothing pushed since 07db983). `npm test` was 1693 of 1693 at 9efadf5; the single tests touched since then pass. Every map's browser evidence is STALE (`src/render`, `src/engine/defs.js` and one map changed): one `npm run regen` at the very end, on the owner's named yes.

| Part | State | Where |
|---|---|---|
| A1 scoring tool, hero views | done | `tools/dev/frame-score.mjs`, `tools/dev/hero-views.mjs`, `maps-src/hero-views.json`, `tools/dev/shoot-hero.mjs` |
| A2 lamps baked, indoor darkness | done, seen, tuned once | `src/render/lampbake.js` (`LAMP_BAKE`, `dimStrength`) |
| A3 sun shadows | done, seen (Marrow Quay: clean hard shadows) | `src/render/sunshadow.js` |
| A4 haze, A5 glow | done, seen, haze eased once (NOT reshot since) | `src/render/haze.js`, `src/render/post.js` |
| A5 light shafts | done, NOT knowingly seen in a frame | `src/render/shafts.js` |
| A6 skyline | done automatically for 35 maps, seen on Lamplighter Hill | `src/render/skyline.js` |
| A7 reveals | 1 of 5: Lamplighter Hill done and seen | see section 3 |
| A8 wall bands and colour | part 1 (bands) BUILT 2026-11-14, node only, boot check pending; part 2 (two colours per look) and part 3 (grey skies, a bake) not started | `src/render/surface.js` (a shader change: boot check after) |
| A9 final shoot, regeneration | NOT started | |

Pictures (outside git): `D:\Doom_release\awe\before` (68 hero frames from the code before A2), `awe\mid` (68 after A2 to A6), `awe\a7b\C1E1M05.png` (Lamplighter Hill after), with `before.json` and `mid.json` scores.

## 2. What the first real frames taught (do not relearn this)

1. **The engine-wide passes made a small difference.** Medians over 68 maps, before to after: spread 129 to 135, bright share 0.7% to 0.9%. Maps meeting every floor went 11 to 8. Light, haze and a skyline do not close the gap by themselves.
2. **The one hand-built map made a large difference.** Lamplighter Hill went from the worst frame of the set (a grey sky, a fence filling a third of the picture) to meeting every floor (spread 159, bright 4.8%, coloured 88%), with three changes: a better sky and light, one landmark, and a view chosen by hand. **That is the recipe. Do it map by map.**
3. **The automatic hero view is poor.** It maximises visible floor, so it often stands in a doorway beside a wall or looks along a terrace. Set the view by hand (`"by": "hand"` in `maps-src/hero-views.json`; the picker never overwrites those).
4. **A dark frame is not always your doing.** The Cantor's Throat is 98% dark in the BEFORE set too. Check `before.json` before blaming a change.
5. **The haze costs contrast.** It took the Hollow Stair's spread from 121 to 80. It was eased afterwards (`HAZE` in `haze.js`); if a reshoot still shows a loss, lower `out.max` again or give that look its own `haze: { out: { max } }` in `LOOKS`.
6. **Software rendering is too slow now.** Shadows and the glow make SwiftShader crawl. Every Chrome job needs `GPU=1`.
7. **No node test can compile a shader.** `tests/haze.test.js` checks the text only. After ANY change to GLSL (`post.js`, `haze.js`, `surface.js`, `entityflag.js`), ask for the boot check before anything else: `GPU=1` through `low.ps1`, `tools/dev/probe-boot.mjs C1E1M01 C1E1M02 C1E4M07 HIVE`. It must report `"failed": 0`, `"errors": []` and `pointer-lock requests: 0`.

## 3. The recipe for one map (A7), as done on Lamplighter Hill

Commits 0e24646 and bc4784a are the worked example. Steps:

1. **Look at the map's current frame** (`D:\Doom_release\awe\mid\<ID>.png`) and its numbers (`mid.json`). Decide what is wrong in plain words: no focal point, one colour, a wall in the way, nothing on the horizon.
2. **Save the route fingerprint first:** `node tools/dev/route-fingerprint.mjs save <scratchpad>/fp-<ID>.json <ID>`.
3. **Change only what is drawn:**
   - The sky and fog: `atmosphere: { sky, fog, fogDensity, look }` in `maps-src/<ID>.level.mjs`. Skies on disk: anselm, ash, bleach, deep, dusk, gate, gate_dim, hive, night, orbit, overcast, root.
   - The light: the map's row in `LOOKS` (`src/engine/defs.js`): `hemi` [sky colour, ground colour, strength], `sun` [colour, strength, direction pointing FROM the ground TO the sun], `lamp`, `grade` (shadow tint, light tint, saturation). Check which other maps share the row before editing it (search the `maps` folder for the look's name); if several do, add a new row and name it in this map.
   - A landmark: `scenery: [{ kind, at: [x, z], y, scale, yaw }]` in the source. `at` is in cells and may be outside the grid. Kinds: tower, boat, crane, gantry, arch, spire, rib, cityface, hangrock, heartmass, hivetower, ganglion, reactor, rails, crystaltower, rootcolumn, shaft. `{ kind: 'tower', beacon: true }` gives a warm lamp in place of the Vael bell's teal glow.
   - Keep authored scenery at ONE or TWO pieces: at three, the automatic skyline ring switches off for that map (`SKYLINE.authored` in `skyline.js`). If a map needs more, raise that number or make the count ignore pieces above the grid.
4. **Compile:** `node tools/mapkit/compile.mjs <ID>`. Check `git diff --stat -- maps/<ID>.json` shows only a few lines (atmosphere and scenery). Do not raise the map's `version` for a drawn-only change (it would throw away the owner's mid-level save).
5. **Prove play is untouched:** `node tools/dev/route-fingerprint.mjs check <scratchpad>/fp-<ID>.json <ID>` must say every run is identical. Then `node tools/dev/fun-gates.mjs <ID>` (PASS and STRICT PASS).
6. **Choose the view by hand.** Decide what the picture is OF (the landmark, the boss, the drop) and stand where the route first sees it. Write `{ "x", "z", "yaw", "pitch", "by": "hand" }` into `maps-src/hero-views.json` (cells, shipped frame; yaw 0 looks north, -1.571 east, 1.571 west, 3.1416 south; a pitch of 0.1 to 0.15 looks up at a skyline, negative looks down a shaft). `node --test tests/hero-views.test.js` must pass.
7. **Run:** `node --test tests/frame-loop.test.js tests/look.test.js tests/skyline.test.js tests/code-health.test.js`.
8. **Commit**, then ask the owner plainly for one shot: `GPU=1` through `low.ps1`, `tools/dev/shoot-hero.mjs <outDir> <ID>` (about 30 seconds), then `node tools/dev/frame-score.mjs <outDir>`. Open the frame. Adjust at most twice. Send the owner the before and after pictures.

Batch the asks: do two or three maps in node, then ask for ONE shoot of all of them.

## 4. The four maps left of the first five, with what I saw in their frames

**C1E3M04 Marrow Nave** (100 x 60, ash sky, look `choir`; start 6,30; the Weeping Mother on her dais at 70,29; hero now 15.5,29.5 facing east).
- Seen: a wide flat floor, low green walls far away on both sides, a brown sky, nothing tall. It reads as a car park, not a nave.
- Do: rib arches standing over the nave (kind `rib`, measure `makeRib` in `src/render/models_c2.js` first and scale so the arch clears 4 m over the floor), two or three of them between the start and the dais, so the eye runs down them to her. Light the dais: a low sun from the EAST behind it (`sun` direction with a positive x) puts her in silhouette against the brightest part of the sky; or a warm lamp colour on the dais props. Keep the hero view on the centre line facing east with a small upward pitch.
- Note the three-piece limit in step 3.

**C1E4M07 The Hollow Stair** (66 x 66, sky `gate`, look `stair`, 634 open-sky-below cells in the middle).
- Seen: the view is on a landing facing a wall of repeating windows; the shaft, which is the whole idea of the level, is a thin white band at the left.
- Do: a hand view at the rim of the shaft looking ACROSS and DOWN it (pitch about -0.25), from the first landing the route reaches. The white ring of `sky_gate_below` should be the bright thing in the frame. If the haze below the deck washes it out, set `haze: { belowMax: 0.25 }` on the `stair` look. No scenery needed.

**C1E1M08 Bell Tower of St. Orrin** (54 x 62, night, look `moon`; the Cantor at 28,25; the exit at 28,15).
- Seen: a raised orange deck, a blue night sky, small enemies on the horizon. There is NO TOWER in the picture of the level named after one (the map has no scenery at all).
- Do: the bell tower as a landmark north of the grid (`{ kind: 'tower', at: [28, -7], scale: 1.8 }`, the ordinary teal bell glow is right here), and a hand view from the courtyard looking north at it with an upward pitch. The moon look is all blue: give the lamps a warm colour so there is a second hue.

**C1E4M08 Gate Warden** (72 x 60, sky `gate`, look `gate`; the Warden at 59,30).
- Seen: from under a low dark roof, the arena framed between two pillars, the Warden a small red figure in the distance. The framing is good; the picture is grey on grey and the boss is tiny.
- Do: a hand view closer, at the rim (about x 40, z 30, facing east, pitch 0.08) where the Warden's arch fills a quarter of the height. The `gate` look should be pale stone and GOLD: warm the lamp colour and the light tint of its grade. This map's walls are the "bathroom tile" case: that is A8, not A7.

After these four, take the next five from the lowest spreads in `mid.json` that are not dark by design (check `before.json`).

## 5. A8, when A7's first five are done

In `src/render/surface.js`, for walls taller than 4 m: a darker base (the bottom 0.9 m), a lighter cap (the top 0.6 m), and a cap on the texture's vertical repeat so one tile is never more than 2 m tall. It is a shader change: follow the pattern of `calmGLSL` there, add a test that reads the shader text, then the boot check (section 2, point 7) before anything else.

## 6. Known loose ends

- The haze was eased after the full shoot and has not been seen since.
- The light shafts have not been knowingly seen in any frame. If the first frame that shows one looks wrong (a hard bright wedge), lower `SHAFTS.strength` in `shafts.js`.
- Lamplighter Hill's foreground is all in shade and its beacon lamp is dim at distance (the haze). Good enough; do not spend another shot on it.
- Static props are not darkened by the lamp bake (only walls, floors, ceilings and trims), so a crate in a dark room may look too bright. Their materials are shared and cached, which is why they were left.
- `tools/dev/low.ps1` fails to write its log if the log's folder does not exist: create the output folder first.
- The plan's progress list in `design/VISUAL_AWE_PLAN.md` section 6 is current; tick it as you go and add a dated entry at the top of `PRODUCTION_LOG.md` after each session.
