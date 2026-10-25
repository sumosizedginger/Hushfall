# HUSHFALL desktop wrapper (prototype, FREEZE F18)

One window around the production build, for the day the game ships on a store that wants a program and not a web page. It is **not** part of the web build, the web zip or the game's tests of the page; it is a separate package here so the game's own `package.json` and lockfile stay free of it.

What it does and does not do:

- Serves `dist/` through a custom scheme (`hushfall://app/`) because a module script will not load from `file://`. `appfiles.cjs` is the only code that decides which files may be read (no climbing out of the folder, no dot files); `tests/desktop.test.js` holds it.
- Keeps the page exactly as it ships: `contextIsolation`, no `nodeIntegration`, `sandbox`, no new windows (an `https` link opens in the user's browser), no navigation away from its own scheme. The page has no bridge to Node and needs none: saves, settings and the play log stay in the page's own storage (here: the app's profile folder).
- Allows pointer lock and fullscreen, nothing else. F11 or Alt+Enter toggles fullscreen.
- `--smoke` loads the game in a hidden window, waits for the title screen and exits 0 (or 1): nothing opens on the screen, the mouse is never touched.

Run it:

```bash
npm run build                    # in the repository root: writes dist/
cd tools/desktop
npm ci                           # installs the pinned Electron (about 200 MB, kept out of git)
npm run smoke                    # hidden window, exits 0 when the title screen shows
npm start                        # the game in a window
```

`--root=<folder>` serves another build (a tester's, or the folder inside a store zip).

Not done, on purpose, and what each would take:

- Installers and signing (electron-builder or a store's own packager; a code-signing certificate is the owner's to buy).
- A Steam build (the Steamworks SDK, the app id, achievements: Steam's overlay needs a native addon this prototype does not carry).
- Auto-update, crash reporting, a native menu, a tray icon.
- A save folder the player can find: the page stores in its profile (`%APPDATA%/hushfall-desktop` on Windows); an export/import button in the game would be the web build's job.
- Controller support is the page's (the Gamepad API works in Electron the same as in Chrome).

Licence: Electron is MIT; its bundled Chromium carries its own notices (`LICENSES.chromium.html` ships in the package). A store release that includes it must ship those notices (`THIRD_PARTY_NOTICES.md` in the repository root lists what the web build carries; add Electron's when this wrapper is shipped).
