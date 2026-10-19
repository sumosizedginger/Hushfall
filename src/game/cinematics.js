// STORY CINEMATICS (PT-063, R13 of the Director's Plan, workstream L): a SEQUENCER. Pure data in, data out, so a node test can hold it without a browser. A scene is a camera path (keyframes eased between), subtitles, and a short list of declared
// actions (a sound cue, a shake, a light level, a fade) at given times. The shell (main.js, mode 'cinematic') advances the clock with the WALL clock while the simulation stands still, hands the view the camera pose each frame, shows the subtitle, and plays the cues.
// Rules this file keeps (tests/cinematics.test.js holds them):
//  - nothing here touches the simulation. A scene's declared actions (`SCENE_ACTIONS`: a sound, a shake) are presentation only, and only the shell applies them; skipping a scene applies every action that has not run yet, so a skipped scene and a watched one leave the same state (the world's).
//  - the position of every point is a SPEC resolved against the world when the scene starts (`resolveScene`): a literal cell, `player`, `enemy:<kind>` (the first creature of that kind, alive or dead), `exit`, `spawn`. The scene data therefore never needs a number the author cannot see.
//  - a scene is a plain object and its progress is a plain object (`{ id, t, done, fired }`), so a save in the middle of a scene (the shell writes none, but the test does) round-trips through JSON.
//  - the clock is real time: the sim is never slowed for a scene (decided 2026-10-15, PT-051), it simply is not stepped while one plays.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/** the declared actions a scene may carry (anything else fails `sceneErrors`) */
export const SCENE_ACTIONS = ['cue', 'shake'];                                          // a sound by its synth name, a camera shake: presentation only, so the world a scene leaves is the world it found (the sim is not stepped and not written)
export const MAX_SCENE_SECONDS = 70;

/** easing between two keyframes: 'smooth' (default), 'linear', 'in' (a slow start), 'out' (a slow stop) */
const EASE = { smooth, linear: (t) => t, in: (t) => t * t, out: (t) => 1 - (1 - t) * (1 - t) };

/** a point spec in cell units: [cx, cz, up] (up = metres above the floor there) or a name; returns { x, z, up } in METRES of the map, or null when the spec cannot be resolved */
export function resolvePoint(spec, w, cell = w.map.cell ?? 1) {
  if (Array.isArray(spec)) return { x: (spec[0] + 0.5) * cell, z: (spec[1] + 0.5) * cell, up: spec[2] ?? 1.6 };
  if (typeof spec !== 'string') return null;
  const [head, arg, up] = spec.split(':');
  if (head === 'player') return { x: w.player.x, z: w.player.z, up: arg != null ? Number(arg) : 1.6 };
  if (head === 'enemy') { const e = w.enemies.find((q) => q.kind === arg); return e ? { x: e.x, z: e.z, up: up != null ? Number(up) : 1.4 } : null; }
  if (head === 'ahead') { const m = Number(arg), yaw = w.player.yaw ?? 0; return { x: w.player.x - Math.sin(yaw) * m, z: w.player.z - Math.cos(yaw) * m, up: up != null ? Number(up) : 1.6 }; }                  // m metres in front of the player (negative = behind), the way the player's camera faces (yaw 0 looks toward -z)
  if (head === 'exit') { const x = w.map.exits?.[0]; if (!x) return null; const c = x.at ?? [x.x, x.z]; return { x: (c[0] + 0.5) * cell, z: (c[1] + 0.5) * cell, up: arg != null ? Number(arg) : 1.6 }; }
  return null;
}

/** the scene with every point resolved against the world: keyframes get { x, z, y, lx, lz, ly } in metres, y being the floor under the point (`floor(x, z)`, the engine's `floorAt`) plus its `up`; a keyframe whose point cannot be resolved takes the player's place, so a scene never throws */
export function resolveScene(scene, w, floor = () => 0) {
  const cell = w.map.cell ?? 1, fall = { x: w.player.x, z: w.player.z, up: 1.6 };
  const keys = scene.keys.map((k) => {
    const e = resolvePoint(k.eye, w, cell) ?? fall, l = resolvePoint(k.look, w, cell) ?? { x: e.x, z: e.z - 1, up: e.up };
    const off = k.offset ?? [0, 0, 0];                                                                                   // a metres offset on the eye, for "a little behind the player" or "above the creature"
    return { t: k.t, ease: k.ease ?? 'smooth', x: e.x + off[0], z: e.z + off[1], y: floor(e.x, e.z) + e.up + off[2], lx: l.x, lz: l.z, ly: floor(l.x, l.z) + l.up, fov: k.fov ?? null };
  });
  return { ...scene, keys };
}

/** the camera at scene time t: eye (x, y, z) in metres, the yaw and pitch the view turns to, the fov (null = leave it). Yaw 0 looks toward -z, as the game's camera does. */
export function cameraAt(resolved, t) {
  const ks = resolved.keys; if (!ks.length) return null;
  const tt = clamp(t, ks[0].t, ks[ks.length - 1].t); let i = 0; while (i < ks.length - 2 && tt > ks[i + 1].t) i++;
  const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)], span = Math.max(1e-6, b.t - a.t), u = (EASE[b.ease] ?? smooth)(clamp((tt - a.t) / span, 0, 1));
  const x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u), y = lerp(a.y, b.y, u), lx = lerp(a.lx, b.lx, u), lz = lerp(a.lz, b.lz, u), ly = lerp(a.ly, b.ly, u);
  const dx = lx - x, dz = lz - z, flat = Math.hypot(dx, dz);
  const yaw = flat > 1e-6 ? Math.atan2(-dx, -dz) : 0, pitch = Math.atan2(ly - y, Math.max(0.05, flat));
  return { x, y, z, yaw, pitch, fov: a.fov != null && b.fov != null ? lerp(a.fov, b.fov, u) : (b.fov ?? a.fov) };
}

/** the whole progress of one scene: a plain object */
export const startScene = (scene) => ({ id: scene.id, t: 0, done: false, fired: [], skipped: false });

/** the subtitle showing at time t: { who, text, k } with k 0..1 the typing progress of the line, or null */
export function subtitleAt(scene, t) {
  for (const s of scene.lines ?? []) if (t >= s.t && t < s.t + s.dur) return { who: s.who ?? '', text: s.text, k: clamp((t - s.t) / Math.min(1.6, s.dur * 0.5), 0, 1) };
  return null;
}

/** the screen fade at time t: 0 clear .. 1 black. A scene's `fade` is a list of { t, to, dur } ramps; before the first it is `from` (default 1: a scene fades in from black) */
export function fadeAt(scene, t) {
  let v = scene.fadeFrom ?? 1; for (const f of scene.fade ?? []) { if (t < f.t) break; v = f.dur > 0 ? lerp(v, f.to, clamp((t - f.t) / f.dur, 0, 1)) : f.to; if (t < f.t + f.dur) break; v = f.to; }
  return clamp(v, 0, 1);
}

/** the declared actions that fall due while the clock goes from `from` to `to` and have not run (a skip passes the scene's end) */
const dueActions = (scene, st, to) => (scene.actions ?? []).map((a, i) => [a, i]).filter(([a, i]) => a.t <= to && !st.fired.includes(i));

/** advance the scene `dt` seconds; returns { state, run } with `run` the declared actions to apply now. Never moves past the end; `done` once the end is reached. */
export function advanceScene(scene, st, dt) {
  if (st.done) return { state: st, run: [] };
  const t = Math.min(scene.length, st.t + Math.max(0, dt)), due = dueActions(scene, st, t);
  return { state: { ...st, t, done: t >= scene.length, fired: [...st.fired, ...due.map(([, i]) => i)] }, run: due.map(([a]) => a) };
}

/** skip: run every action that has not run, jump to the end. The world a skipped scene leaves is the world a watched one leaves, because the actions are the only thing a scene does. */
export function skipScene(scene, st) {
  if (st.done) return { state: st, run: [] };
  const due = dueActions(scene, st, Infinity);
  return { state: { ...st, t: scene.length, done: true, skipped: true, fired: [...st.fired, ...due.map(([, i]) => i)] }, run: due.map(([a]) => a) };
}

/** the problems of a scene definition (an empty list = fine); the test runs it over every scene */
export function sceneErrors(scene) {
  const out = [], tag = scene?.id ?? '(no id)';
  if (!scene || !/^[a-z0-9-]{2,32}$/.test(scene.id ?? '')) out.push(`${tag}: id must be 2-32 lower-case letters, digits or dashes`);
  if (!(scene.length >= 8 && scene.length <= MAX_SCENE_SECONDS)) out.push(`${tag}: length ${scene.length} is outside 8..${MAX_SCENE_SECONDS} seconds`);
  if (!Array.isArray(scene.keys) || scene.keys.length < 2) out.push(`${tag}: needs at least two camera keyframes`);
  else {
    let last = -1; for (const k of scene.keys) { if (!(k.t >= 0 && k.t <= scene.length)) out.push(`${tag}: keyframe at ${k.t} is outside the scene`); if (k.t <= last) out.push(`${tag}: keyframes must ascend in time (${k.t} after ${last})`); last = k.t; if (!k.eye || !k.look) out.push(`${tag}: a keyframe needs eye and look`); if (k.ease && !EASE[k.ease]) out.push(`${tag}: unknown ease ${k.ease}`); }
    if (scene.keys[0].t !== 0) out.push(`${tag}: the first keyframe must be at 0`);
    if (scene.keys[scene.keys.length - 1].t < scene.length - 0.001) out.push(`${tag}: the last keyframe must be at the end (${scene.length})`);
  }
  let lt = -1; for (const s of scene.lines ?? []) {
    if (!(s.dur >= 1.5)) out.push(`${tag}: a line at ${s.t} shows ${s.dur} s, under 1.5`); if (s.t + s.dur > scene.length + 0.001) out.push(`${tag}: a line at ${s.t} runs past the end`); if (s.t < lt) out.push(`${tag}: lines must not overlap or go back (${s.t})`); lt = s.t + s.dur;
    const readable = s.text.length / 17; if (s.dur + 0.001 < readable) out.push(`${tag}: a line of ${s.text.length} characters needs ${readable.toFixed(1)} s to read, it shows ${s.dur} s`);    // 17 characters a second: a slow reader's speed
    if (s.text.length > 150) out.push(`${tag}: a line of ${s.text.length} characters (150 at most)`);
  }
  for (const a of scene.actions ?? []) { const k = Object.keys(a).filter((x) => x !== 't'); if (k.length !== 1 || !SCENE_ACTIONS.includes(k[0])) out.push(`${tag}: an action at ${a.t} must carry exactly one of ${SCENE_ACTIONS.join(', ')}`); if (!(a.t >= 0 && a.t <= scene.length)) out.push(`${tag}: an action at ${a.t} is outside the scene`); }
  for (const f of scene.fade ?? []) if (!(f.t >= 0 && f.to >= 0 && f.to <= 1 && f.dur >= 0)) out.push(`${tag}: a fade ramp is malformed`);
  return out;
}

/** has this scene been seen? `progress.seen` is a plain list of scene ids the shell keeps (lazy: absent until the first scene). A scene plays once by default; the Record replays any seen one. */
export const hasSeen = (progress, id) => (progress?.cinematicsSeen ?? []).includes(id);
export const markSeen = (progress, id) => ({ ...progress, cinematicsSeen: [...new Set([...(progress?.cinematicsSeen ?? []), id])] });
