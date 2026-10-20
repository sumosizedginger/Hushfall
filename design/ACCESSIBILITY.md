# Accessibility and first run (PT-071, R20 of the road)

What the game does today, where it lives, how it is held by tests, and what it does not do. All of it is shell or render side: the simulation is untouched (the route fingerprints do not move).

## What exists

| need | what the game does | where | held by |
|---|---|---|---|
| hear what the sound says | **Sound captions** (Settings): the sounds that matter as words with a direction ("Bellhand fires, left"; eight directions and "close"); threats last 5 s and are never pushed out by news; up to three lines | `src/game/captions.js`, `ui.captions`, `#captions` | `tests/captions.test.js`: every event the audio layer handles is captioned or listed with its reason, so a new sound cannot slip by |
| read the HUD | **Text size** (Settings): Normal, Large (125%), Larger (150%) for the messages, toasts, objective, tips, captions, pickup cards and the side readouts | `body.ui-large` / `ui-larger`, CSS `zoom` | `tests/accessibility.test.js` |
| flashing and shaking | **Reduce flashing and shaking** (Settings): no camera shake, the hurt flash capped at 35% of its strength, the muzzle light at 40% | `GameView.setLook({ reducedMotion })`, `view.comfort` | `tests/accessibility.test.js` |
| tell the keys apart without colour | each key chip in the HUD carries the first two letters of its own name on that map (Br brass, Ir iron, Be bell: three keys that are never the same two letters) | `ui.hud`, `#hud-keys i::after` | `tests/accessibility.test.js` |
| the crosshair | style, size, colour and opacity | Settings (PT-048) | `tests/crosshair.test.js` |
| controls | every key and every pad button can be rebound; toggle instead of hold for aim and sprint; a pad works through the menus; the glyphs follow the pad | Settings, `bindings.js`, `gamepad.js` | `tests/bindings.test.js`, the pad probe |
| the pace of the game | the weapon wheel slows time only when the player says so; the clock is never slowed for text; the Journal pauses | Settings | `tests/wheel.test.js`, `tests/journal-*.test.js` |
| knowing what a difficulty is | the three buttons say what they change, in the numbers the sim uses | `src/game/difficulty.js` | `tests/accessibility.test.js` |
| the first minute | the controls reminder, and once per profile a line about the objective, the Journal and pause | `src/game/firstrun.js`, `startLevel` | `tests/accessibility.test.js` |
| the lantern's threat rings | bright cyan-white rings with a moving edge, and a caption for the tell; they are not told apart by colour | `creaturefx.js`, captions | `tests/captions.test.js` |

## What it does not do (and why)

- **No colour-blind palette** for the world: the art is painted in a deliberate limited palette and the threats are told by shape, motion and sound as well (a ring, a shadow on the floor, a tell before every blow); a full alternative palette would be a second art pass.
- **No screen-reader support for the 3D game**, as for any real-time shooter; the menus are ordinary buttons and labels.
- **No subtitles for the music**: it carries no information.
- **No remappable mouse buttons beyond the binding list** (all of them are in it).
- **Not tested by a person who needs these**: that is the first thing a real tester should do; every number here is a first guess.

## For the next change

A new sim event with a sound must be captioned in `src/game/captions.js` (or listed in `NO_CAPTION` with the reason): `tests/captions.test.js` fails until it is. A new HUD text element should sit inside the `zoom` rule list in `index.html` (`#comms,#toasts,...`).
