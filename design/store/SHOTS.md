# The store pictures (PT-071, R23)

Made from the game itself on the owner's own graphics card (an RTX 3060 Ti class card through ANGLE / D3D11, headless Chrome), never composed by hand. They live OUTSIDE the repository (pictures never enter git): `D:\Doom_release\store\`. This file says how they were made, so they can be made again when the name, the look or the build changes.

## What exists

| file | what |
|---|---|
| `store\shots\01-quay.png` to `06-harmonic-gardens.png` | 1920 x 1080 gameplay frames at the highest render width (800): Marrow Quay, the Marrow Nave, the Hollow Stair, the Root Bell, the Pulse Foundry, the Harmonic Gardens. HUD on, as a player sees it |
| `store\title\key-art-1920x1080.png` | the title screen with its menu hidden: the painted harbour, the lamp, the bell tower and the name |
| `store\title\banner-1280x320.png`, `capsule-630x500.png` (itch.io's cover size), `square-512.png` | crops of the same page at the sizes a store asks for |

The frames are the capture tool's frames chosen by eye for readability and variety (a quay, a nave, a stair, a boss, a foundry, a garden: the places, not only the fights). **A frame is chosen only if no stale card or leftover is on screen**; the first run of this job found a real bug that way (the last pickup card of the session replayed after a cinematic; fixed and held by `tests/pickup-cards.test.js`).

## How to make them again

```bash
GPU=1 VW=1920 VH=1080 WIDTH=800 TICKCAP=24000 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/audit-capture.mjs <outDir> maps C1E1M01=lite C1E3M04=lite C1E4M07=lite C2M21=lite C2M14=lite C2M29=lite
powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-title.mjs D:/Doom_release/store/title
```

(`GPU=1` uses the machine's own card; `VW` / `VH` are the page size, `WIDTH` the game's render width with the automatic quality fallback off; `=lite` is four route frames a map. One job at a time, idle priority, two cores, the pointer lock refused and counted.)

## What is not done, and what the page must not claim

- **A trailer.** A silent gameplay clip could be cut from frames of this kind (`ffmpeg` is installed), but a trailer without the game's sound is a poor one and the sound is synthesised in the browser: it needs a screen recorder that also records the page's audio. The owner's call.
- **Final key art.** The title screen is a faithful picture of the game, not a designed capsule. The painted scene is 320 x 200 and is shown at a larger size with hard pixels on purpose; a store capsule at 4x that size may want a re-bake at a higher resolution (`tools/baker/recipes_*.js`, `ui_title_art`).
- **The name.** Every picture carries the working title. It is changed in one place (the page) and the pictures are made again.
- **Anyone's likeness.** There is none: the game has no photographs and no voices.
