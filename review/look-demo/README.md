# Look demo: painted 3D

Run: `npm run look`, open http://localhost:5173/look.html (click to capture mouse; if pointer lock is unavailable, drag to look).
Controls: WASD move, mouse look, click fire, 1-5 camera viewpoints, O ink outline, P paint pass, [ ] internal resolution, R reset, H hide HUD.
Screenshots: `npm run shoot` regenerates review/look-demo/*.png (drives the real demo through a dev-only `window.__LOOK__` hook).

What it is: real 3D level, code-authored low-poly Tollbearer (part-rigged, procedural walk / attack / death), 3D flare-cannon view-model, 3D props and sky dome. Every texture is baked by p5.js + p5.brush. The post pass adds low-res nearest upscale, depth-based ink outline, paper grain and luminance value-banding.
What it is not: the game. No map format, saves, audio, or balance. Sim runs at a fixed 60 Hz but is throwaway.
