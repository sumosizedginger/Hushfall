# The store pictures (PT-071, R23)

Made from the game itself on the owner's own graphics card (an RTX 3060 Ti class card through ANGLE / D3D11, headless Chrome), never composed by hand. They live OUTSIDE the repository (pictures never enter git): `D:\Doom_release\store\`. This file says how they were made, so they can be made again when the name, the look or the build changes.

## What exists

| file | what |
|---|---|
| `store\shots\01-quay.png` to `06-harmonic-gardens.png` | 1920 x 1080 gameplay frames at the highest render width (800): Marrow Quay, the Marrow Nave, the Hollow Stair, the Root Bell, the Pulse Foundry, the Harmonic Gardens. HUD on, as a player sees it |
| `store\title\key-art-1920x1080.png` | the title screen with its menu hidden: the painted harbour, the lamp, the bell tower and the name |
| `store\shots\07-boss-cantor.png` to `11-boss-root-bell.png` | the five bosses at about eight metres in their arenas (the Cantor, the Grand Cantor, the Gate Warden, the Hive Cantor, the Root Bell), awake and mid-tell: the player is put at a vantage the node side proved has a clear line to the boss, with every gun and 80% of its ammunition so the HUD strip is whole (FREEZE F16) |
| `store\shots\12-fire-flare.png` to `17-fire-carbine.png` | six guns firing at a boss (the flare cannon, the scattergun, the arc lamp, the line-thrower, the harpoon, the carbine), muzzle flash on the third tick |
| `store\shots\18-map-nerve-cathedral.png`, `19-map-hollow-stair.png`, `20-journal-items.png` | the Journal's MAP tab (the full-screen automap with its numbered message pins over the dimmed world) two thirds of the way through two maps, and its Items page |
| `store\trailer\hushfall-trailer-1080p.mp4` | a 52 second trailer, 1080p, 30 frames a second, H.264 and AAC, 46 MB (FREEZE F17): the title picture, five clips of the real game (Marrow Quay, the Marrow Nave, the Pulse Foundry, a vent launch over the Hollow Stair, the Gate Warden under fire), an end card with three true lines from the copy. The sound is the game's own: see below |
| `store\title\banner-1280x320.png`, `capsule-630x500.png` (itch.io's cover size), `square-512.png` | crops of the same page at the sizes a store asks for |

The frames are the capture tool's frames chosen by eye for readability and variety (a quay, a nave, a stair, a boss, a foundry, a garden: the places, not only the fights). **A frame is chosen only if no stale card or leftover is on screen**; the first run of this job found a real bug that way (the last pickup card of the session replayed after a cinematic; fixed and held by `tests/pickup-cards.test.js`).

## How to make them again

```bash
GPU=1 VW=1920 VH=1080 WIDTH=800 TICKCAP=24000 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/audit-capture.mjs <outDir> maps C1E1M01=lite C1E3M04=lite C1E4M07=lite C2M21=lite C2M14=lite C2M29=lite
powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-title.mjs D:/Doom_release/store/title
```

(`GPU=1` uses the machine's own card; `VW` / `VH` are the page size, `WIDTH` the game's render width with the automatic quality fallback off; `=lite` is four route frames a map. One job at a time, idle priority, two cores, the pointer lock refused and counted.)

## The trailer (FREEZE F17, 2026-10-25), and how it was made

`node tools/dev/store-trailer.mjs` plays each clip frame by frame on the real GPU (two sim ticks a frame, 30 a second) and writes the PNG frames AND the sim's events beside them; WHERE a clip starts is found in node (the sim is deterministic and the page's equals it): the first awake enemy within range with the gun cooling, the player put on a vent's launch plate, or a vantage in front of the boss. `node tools/dev/store-trailer-mix.mjs` cuts the clips together with half-second crossfades, a caption each, and makes the SOUND from the game itself: every event goes through the game's own event-to-sound mapping (`src/audio/events.js`), is placed where it happened by the game's pan rule and an inverse-distance fall-off like the engine's panner, and is laid over the two rendered score excerpts (`music_calm`, `music_combat` from `npm run audio-qa`'s `review/audio`); mixed in node to a float wav, compressed and loudness-normalised (-16 LUFS) by ffmpeg. No sound is recorded, sampled or stock.

```bash
GPU=1 VW=1920 VH=1080 WIDTH=800 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-trailer.mjs D:/Doom_release/store/work/trailer
powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-trailer-mix.mjs D:/Doom_release/store/work/trailer D:/Doom_release/store/trailer/hushfall-trailer-1080p.mp4      # --reuse remakes only the sound
GPU=1 VW=1920 VH=1080 WIDTH=800 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-bosses.mjs D:/Doom_release/store/work/bosses       # the boss and gun-firing frames
GPU=1 VW=1920 VH=1080 WIDTH=800 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-map.mjs D:/Doom_release/store/work/maps          # the Map tab and Journal frames
```

It is a first cut, said plainly: the score excerpts are 14 seconds each and are looped with equal-power crossfades, not composed to the picture; there is no voice (the game has none); the cuts are on a timer, not on the beat. The captions and the end card say only what `FACTS.md` counts (68 maps, 15 weapons, 21 kinds of creature) and what the copy says (painted by code, synthesised, plays in the browser). Nobody has watched it but the builder.

## What is not done, and what the page must not claim

- **A finished trailer.** The one above is a cut of the game's own footage and sound for a store page; a trailer with a composed score, a voice-over of the cold open or a designed title sequence would be the owner's (or a hired) work.
- **Final key art.** The title screen is a faithful picture of the game, not a designed capsule. The painted scene is 320 x 200 and is shown at a larger size with hard pixels on purpose; a store capsule at 4x that size may want a re-bake at a higher resolution (`tools/baker/recipes_*.js`, `ui_title_art`).
- **The name.** Every picture carries the working title. It is changed in one place (the page) and the pictures are made again.
- **Anyone's likeness.** There is none: the game has no photographs and no voices.
