// THE STORY SCENES (PT-063, R13, workstream L): the in-engine cinematics, as data for src/game/cinematics.js. Each is played by the game's own renderer from a camera path, with the simulation standing still, at a moment a map's trigger names with `{ cinematic: '<id>' }`.
// Points are SPECS resolved when the scene starts (cinematics.js `resolvePoint`): a literal cell [cx, cz, up], `player[:up]`, `ahead:<metres>[:up]` (in front of the player; negative = behind), `enemy:<kind>[:up]`, `exit[:up]`. A scene's eye stays at or near the player's own position wherever it can, so the camera
// is never inside a wall, and a scene ends (or can end) on the player's own view, so the cut back to play does not jump.
// The text obeys design/LORE.md section 5 (one fact a line, concrete, no stock phrases; tools/dev/prose-lint.mjs reads it through tests/cinematics.test.js). Eight scenes were planned: the title's cold open and the epilogue with credits are PAINTED sequences (a bake, a named yes) and are not here.
export const SCENES = [
  { id: 'gate-open', map: 'C1E4M08', length: 26, title: 'The Gate opens',
    keys: [
      { t: 0, eye: 'player', look: 'enemy:gatewarden:6' },
      { t: 12, eye: 'player', offset: [0, 0, 1.2], look: 'enemy:gatewarden:9' },
      { t: 26, eye: 'player', offset: [0, 0, 5], look: 'exit:2' },
    ],
    lines: [
      { t: 2.5, dur: 4.5, who: '', text: 'The rings behind the arch go out, one at a time.' },
      { t: 15, dur: 5.5, who: '', text: 'The door it was holding is already moving.' },
    ],
    actions: [{ t: 0.4, cue: 'gate_chord' }, { t: 9, shake: 1.4 }],
    fade: [{ t: 0, to: 0, dur: 1.2 }, { t: 23.5, to: 1, dur: 2.5 }] },
  { id: 'threshold', map: 'C2M01', length: 20, title: 'Threshold Beach',
    keys: [
      { t: 0, eye: 'player', offset: [0, 0, -1.3], look: 'ahead:30:9' },
      { t: 9, eye: 'player', offset: [0, 0, -0.4], look: 'ahead:30:3', ease: 'out' },
      { t: 20, eye: 'player', look: 'ahead:30:1.6' },
    ],
    lines: [
      { t: 2, dur: 5.5, who: '', text: 'Salt on the wind. A lake with no far shore.' },
      { t: 10, dur: 6, who: '', text: 'Ahead, two rows of boat crews stand facing the water.' },
    ],
    actions: [{ t: 0.3, cue: 'toll' }],
    fade: [{ t: 0, to: 0, dur: 2.5 }] },
  { id: 'deep-gate', map: 'C2M09', length: 18, title: 'The Sounding Deep',
    keys: [
      { t: 0, eye: 'ahead:-4:1.6', look: 'ahead:14:3.2' },
      { t: 10, eye: 'ahead:-1.5:1.6', look: 'ahead:14:2.4', ease: 'linear' },
      { t: 18, eye: 'player', look: 'ahead:14:1.6' },
    ],
    lines: [
      { t: 2.5, dur: 5, who: '', text: 'No light here that the Vael did not light.' },
      { t: 9.5, dur: 6, who: '', text: 'The stair is wide enough for two carts side by side.' },
    ],
    actions: [{ t: 0.3, cue: 'bell_strike' }],
    fade: [{ t: 0, to: 0, dur: 3 }] },
  { id: 'hive-cantor', map: 'C2M24', length: 28, title: 'Choir of One',
    keys: [
      { t: 0, eye: 'player', look: 'enemy:hivecantor:4' },
      { t: 12, eye: 'player', offset: [0, 0, 0.8], look: 'enemy:hivecantor:6' },
      { t: 20, eye: 'player', offset: [0, 0, 1.4], look: 'enemy:hivecantor:7' },
      { t: 28, eye: 'player', look: 'ahead:20:1.6' },
    ],
    lines: [
      { t: 2, dur: 5.5, who: '', text: 'It is keeping time for the whole Hive, and it has not looked round.' },
      { t: 13, dur: 6.5, who: '', text: 'The plate on its podium reads: short by 2,595.' },
    ],
    actions: [{ t: 0.3, cue: 'toll' }, { t: 14, shake: 0.8 }],
    fade: [{ t: 0, to: 0, dur: 1 }] },
  { id: 'bell-stops', map: 'C2M29', length: 24, title: 'The Bell stops',
    keys: [
      { t: 0, eye: 'player', look: 'enemy:rootbell:5' },
      { t: 12, eye: 'player', offset: [0, 0, 0.4], look: 'enemy:rootbell:12', ease: 'linear' },
      { t: 24, eye: 'player', offset: [0, 0, 0.2], look: 'ahead:20:1.6' },
    ],
    lines: [
      { t: 2, dur: 5.5, who: '', text: 'It hangs whole. Every sound has gone out of the place.' },
      { t: 12, dur: 6.5, who: 'INES', text: 'Signal House, the Bell has stopped. I am going up to the Gate.' },
    ],
    actions: [{ t: 0.3, shake: 1.2 }],
    fade: [{ t: 0, to: 0, dur: 1.5 }, { t: 22, to: 1, dur: 2 }] },
  { id: 'the-gate', map: 'C2M30', length: 22, title: 'The Unrung Gate',
    keys: [
      { t: 0, eye: 'player', look: 'exit:6' },
      { t: 12, eye: 'player', offset: [0, 0, 0.5], look: 'exit:3', ease: 'linear' },
      { t: 22, eye: 'player', look: 'exit:1.6' },
    ],
    lines: [],
    actions: [],
    fade: [{ t: 0, to: 0, dur: 2 }] },
];
export const SCENE = Object.fromEntries(SCENES.map((s) => [s.id, s]));
