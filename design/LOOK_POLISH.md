# The look polish (2026-10-26)

The owner, after the critical review (`design/CRITICAL_REVIEW.md`): "it has been played, you have good controls and movement, gameplay needs work but we want to polish the look before considering AI for the enemies", then "Everything else is good, so lets go. Let me know when you have completed 1-10, show me your style and your art and your taste and what you think would be enjoyable to a human game player."

The style is **chunky painted**: the world keeps its low internal resolution (480 px wide by default) and its ink, but every surface is painted with few, bold, high-contrast marks that survive that resolution; every plank, brick, plate and stone is lit from above and shadowed below so it reads as a solid thing; colour has a temperature (warm lamps, cool shadows); and the one object you look at all game, the gun in your hands, is drawn crisp at the screen's own resolution.

Every change is **drawn only**: the simulation, its routes, its collisions, sight lines and shots are untouched. The one change in `src/engine` (item 10) adds where a blow came from to the `hurt` event's payload; 108 route runs were proved identical with `route-fingerprint.mjs`.

## The ten items, as built

| # | Item | What a player sees | Where |
|---|------|--------------------|-------|
| 1 | The held weapon | The gun is drawn into its own target at the screen's resolution (crisp, with its own clean outline), smaller and lower right so it frames the fight, with a slow breath at the hip. Its 16 materials are repainted at twice the resolution (walnut, blued steel, brass, enamel, louvred steel...), round parts have 20 sides, the sleeves are dark oilskin and the hands weathered leather. | `post.js` (weapon target and composite), `weapon-pose.js` (`HIP`, `HIP_SCALE`, breath), `gunkit.js` (`smooth`, tints), `tools/baker/paint2d.js`, `tools/baker/recipes_polish.js` (`guns_atlas`) |
| 2 | Surfaces | The twelve commonest materials of Episode One are repainted (the steel bulkhead is the default wall of every map), ceilings have their own boards (they wore the floor's planks), and every wall and floor varies in large soft patches in world space, warmer here and cooler there, darker at a wall's foot. | `tools/baker/recipes_polish2.js`, `src/render/surface.js`, `levelmesh.js` |
| 3 | Room shapes | A skirting at the foot of every wall in a roofed room and a cornice under its ceiling; outdoors a stone plinth and a coping; pilasters with a base and a capital on long plain walls; a frame (two jambs and a lintel) round every door on both sides. | `src/render/trims.js` |
| 4 | Colour | Each place's shadow and light tints pushed 1.5 times further from neutral, so its light has a temperature; the surface pass drifts warm and cool across a room. | `post.js` (`GRADE_K`), `surface.js` |
| 5 | Light | Stronger pools and darker between: the place's general light (hemisphere 0.84, sun 0.88) a little lower, its lamps 1.32 brighter; a pool of light painted on the floor under every lamp, lantern and lamppost; a lamp in the head of every doorway (warm when open, the key's colour when locked) with its light spilled on the floor in front; a halo round every lever. | `view.js` (`POLISH_LIGHT`), `trims.js` |
| 6 | Creatures | A hostile creature's outline is inked blood red, a peaceful one (the Vael folk) keeps black; every lit creature has a cold rim of the place's sky colour where its body turns from the eye, weaker in dark places. | `entityflag.js` (`PEACE_ALPHA`, `RIM`), `post.js` |
| 7 | Hit feel | Your shot lights the room for a moment (a light in the world, not only on the gun), the muzzle flash is painted fire (a banded glow, a flame cone, petals turned at random each shot, a white core) instead of two opaque balls, and a burst of light shows where a shot lands on a body. | `view.js` (`fireLight`, `addPop`), `gunkit.js` (`muzzleFlash`) |
| 8 | Reading | (commit 503b186) The reading text is a condensed sans one size up, every HUD reading sits on a dark plate, messages sit top left under the objective. | `index.html`, `ui.js` |
| 9 | Plates | The title and the cold open's last plate are painted at 1280 x 720 and shown smoothed; the title keeps the menu's left two fifths calm. The four epilogue plates followed the same day, the same stories in the same hand (the Gate's doorway, the coast from the lighthouse, the Unrung Gate with the lamp dark and lit). | `tools/baker/recipes_plates.js`, `recipes_endplates.js`, `index.html` `.hires`, `main.js` |
| 10 | Hit direction | (commit 503b186) A blow shows a red glow on the edge of the picture on the attacker's side, sized by the hit, never in the middle; the all-round flush is weaker when the direction shows. Before this, the flash was a uniform ring with no direction (the `hurt` event carried only the amount). | `hitdir.js`, `post.js`, `world.js` (payload only) |

**Episode One first, then everywhere.** The materials, the surface pass, the trims, the light, the colour and the creature ink are shared, so they reach all 68 maps at once; the frames below check four later places as well.

## The numbers (27 frames, before against after, `tools/dev/polish-shots.mjs`, 1920 x 1080 on the machine's own GPU)

| | before | after |
|--|--|--|
| mean luma of the 3D picture | 62.4 | 64.7 |
| share of clipped pixels (230 and over) | 0.1% | 0.1% |
| share of black (25 and under) | 26.9% | 27.4% |
| local contrast (the structure that survives the chunky pixels) | 9.0 | 11.6 (+29%) |
| warm/cool spread (the standard deviation of red minus blue) | 31.2 | 38.3 (+23%) |

The light balance moved: the office of the Lantern Office (C1E1M04) is brighter under its lamp and darker at its walls; the Customs Hall gallery (C1E1M02) is darker overall. The one frame that went too dark (the cabin door of C1E1M06, black share 17% to 42%, from the new iron) was fixed by lightening `wall_iron_a`.

## What is NOT done, on purpose

- **Layered fog** in the post pass was in the plan; it is not built, and after the owner's verdict on the first four levels ("the visuals look fuckin' amazing") it stays out: a height fog changes the light of every map and every additive glow at once, the riskiest way to disturb a look that has just been approved. Each place's own distance fog is unchanged.
- **Stronger attack tells** came with the enemy actions (`design/ENEMY_ACTIONS.md`): a glint grows at a creature's head through every windup.
- **Painted faces** stay as decided in F10.
- **How it plays.** Nothing here has been played by a person; the stills show appearance, not feel. The muzzle light, the impact burst and the breath are judged in motion only by playing.

## How to see it again

`GPU=1 VW=1920 VH=1080 powershell -File tools/dev/low.ps1 <log> tools/dev/polish-shots.mjs <outDir>` (one Chrome job, idle priority, two cores; `ONLY=<regex>` takes a few frames). The before set and every after set are outside the repository in `D:\Doom_release\polish\` (pictures never enter git).
