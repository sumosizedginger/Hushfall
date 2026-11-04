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

- **The world's own colours are not changed by the palette setting**: the art is painted in a deliberate limited palette; what carries meaning (outlines, tells) has a palette, and every state is told by shape, motion and sound as well (a ring, a shadow on the floor, a tell before every blow); a full alternative palette would be a second art pass.
- **No screen-reader support for the 3D game**, as for any real-time shooter; the menus are ordinary buttons and labels.
- **No subtitles for the music**: it carries no information.
- **No remappable mouse buttons beyond the binding list** (all of them are in it).
- **Not tested by a person who needs these**: that is the first thing a real tester should do; every number here is a first guess.

## For the next change

A new sim event with a sound must be captioned in `src/game/captions.js` (or listed in `NO_CAPTION` with the reason): `tests/captions.test.js` fails until it is. A new HUD text element should sit inside the `zoom` rule list in `index.html` (`#comms,#toasts,...`).

## The Game Accessibility Guidelines, basic and intermediate (PT-083 X6)

Each line is ticked with where it lives, or carries a reason. It is held by `tests/accessibility-pt083.test.js` as far as a test can hold it; nobody who needs these has tried them yet.

| guideline | status |
|---|---|
| Controls can be remapped | yes: every action on the keyboard and the pad, quick save and load included. Enter, Space and Esc always work in menus as well |
| No essential held inputs | yes: toggles for aim, sprint, fire and guard |
| Sensitivity adjustable | yes: mouse, the sights' own, stick look speed, dead zone, curve |
| Invert look | yes: mouse and pad |
| Text size | yes: three steps for the HUD; three for captions and subtitles |
| Contrast behind text | yes: every HUD reading is on a dark plate; a plate behind captions by default |
| Subtitles for all speech | yes: every message is text; the story scenes are subtitled |
| Captions for sounds that matter | yes: optional, with a direction |
| Colour is not the only cue | yes: `STATE_CUES` in `src/render/palette.js` lists each state and what else tells it |
| Colour-blind options | yes: three palettes for what carries meaning |
| Reduce motion | yes: bob, shake, the widening of the view, kicks and sway |
| Reduce flashes | yes: a setting of its own |
| Difficulty options | yes: three, described in numbers on the button |
| Pause anywhere | yes: Esc, and the Journal pauses; story scenes can be skipped |
| Save often | yes: automatic checkpoints, quick save, and an auto save at every level |
| Tutorial | yes: the training yard, optional, and one-line hints the first time something matters |
| Volume controls | yes: master, effects, music |
| Field of view | yes: labelled in degrees |
| Screen-reader support | no: the 3D game is real-time; the menus are ordinary buttons and labels |
| One-handed play | not designed for: rebinding and the toggles help, but aiming needs a hand on the mouse or stick |
