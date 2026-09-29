// DEV-ONLY test interface (window.__GAME_TEST__). Loaded via `if (import.meta.env.DEV) import(...)` in main.js, so production
// builds contain none of it. Actions travel through the real input layer + fixed step; the only state writers are the
// clearly-labelled setup_* helpers.
import { Bot } from '../engine/bot.js';
import { hashWorld, spawnEnemy } from '../engine/world.js';

const ROUTES = Object.fromEntries(Object.entries(import.meta.glob('../../routes/*.json', { eager: true, import: 'default' })).map(([p, v]) => [p.split('/').pop().replace('.route.json', ''), v]));

function pcm(f32) {
  let peak = 0, sum = 0, nan = 0; const n = f32.length, i16 = new Int16Array(n);
  for (let i = 0; i < n; i++) { const v = f32[i]; if (!Number.isFinite(v)) { nan++; continue; } peak = Math.max(peak, Math.abs(v)); sum += v * v; i16[i] = Math.max(-1, Math.min(1, v)) * 32767; }
  let s = ''; const u8 = new Uint8Array(i16.buffer); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return { peak, rms: Math.sqrt(sum / n), nan, samples: n, b64: btoa(s) };
}

export function installTestHook(app) {
  const { g, MAPS, store, audio, ui } = app;
  let bot = null;
  const snap = () => {
    const w = g.world, p = w?.player;
    return {
      mode: g.mode, mapId: g.mapId, difficulty: g.difficulty, seed: g.seed, tick: w?.tick ?? null, status: w?.status ?? null, hash: w ? hashWorld(w) : null,
      fov: g.view?.cam.fov ?? null, player: p && { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch, ads: p.ads, sprint: p.sprint, sprinting: p.sprinting, hp: p.hp, armor: p.armor, ammo: p.ammo, keys: p.keys, weapon: p.weapon, cooldown: p.cooldown },
      messagesSeen: w?.messagesSeen ?? null, explored: w ? w.explored.reduce((a, b) => a + b, 0) : null, stats: w?.stats ?? null, endStats: w?.endStats ?? null, secretsFound: w?.secretsFound ?? null,
      enemies: w?.enemies.map((e) => ({ id: e.id, x: e.x, z: e.z, hp: e.hp, state: e.state })) ?? null, pickups: w?.pickups.length ?? null,
      doors: w?.doors.map((d) => ({ cx: d.cx, cz: d.cz, open: d.open, target: d.target })) ?? null,
      lockFailed: g.lockFailed, settings: g.settings, audio: { state: audio.state, played: audio.stats.played, dropped: audio.stats.dropped, last: audio.stats.log.slice(-12).map((x) => x.id) },
    };
  };
  const render = (dt = 0) => { if (g.view && g.world) g.view.render(g.world, 1, dt); };
  window.__GAME_TEST__ = {
    ready: true,
    routes: Object.keys(ROUTES),
    state: snap,
    drainEvents() { const e = g.events; g.events = []; return e; },
    // -- semantic actions (same path as the keyboard) --
    newGame(difficulty = 'normal', seed = 1, { realtime = false } = {}) { app.startLevel({ difficulty, seed }); g.lockFailed = true; g.manual = !realtime; return snap(); },
    realtime(on) { g.manual = !on; },
    press: (a) => g.input.press(a), release: (a) => g.input.release(a), addYaw: (r) => g.input.addYaw(r), addPitch: (r) => g.input.addPitch(r),
    tick(n = 1) { for (let i = 0; i < n; i++) { app.stepOnce(); if (g.mode !== 'playing') break; } render(); return snap(); },
    render, pause: app.pause, resume: app.resume,
    save: () => app.quickSave(), load: () => app.quickLoad(),
    setSetting(k, v) { g.settings[k] = v; if (k === 'outline' || k === 'paint') g.view?.setLook(g.settings); },
    // -- route bot: same InputState as a human --
    startBot(name) { bot = new Bot(g.world, g.input, typeof name === 'string' ? ROUTES[name] : name); return { ops: bot.route.length }; },
    stepBot(n = 60) { for (let i = 0; i < n && bot && !bot.done && !bot.failed && g.mode === 'playing'; i++) { bot.tick(); app.stepOnce(); } render(); return { done: bot?.done ?? null, failed: bot?.failed ?? null, op: bot?.i ?? null, ...snap() }; },
    // -- low-level setup (state writers; tests only) --
    setup_teleport(x, z, yaw) { g.world.player.x = x; g.world.player.z = z; if (yaw != null) g.world.player.yaw = yaw; g.view.beforeStep(g.world); },
    setup_spawnEnemy(kind, x, z, yaw = Math.PI, state = 'idle') { const e = spawnEnemy(g.world, kind, x, z, yaw); e.state = state; return e.id; },
    setup_enemy(id, fields) { Object.assign(g.world.enemies.find((e) => e.id === id), fields); },
    setup_addPickup(kind, x, z) { g.world.pickups.push({ id: g.world.nextId++, kind, x, z }); },
    setup_openDoors() { for (const d of g.world.doors) { d.open = 1; d.target = 1; } },
    /** hide the title card / queued transmissions / tips, so screenshots show what a player sees after the intro */
    clearOverlays() { ui.clearOverlays(); },
    /** wake every sleeping enemy (worst-case render/CPU sampling: everything animating and chasing) */
    setup_wakeAll() { for (const e of g.world.enemies) if (e.state === 'idle') { e.state = 'chase'; e.lastX = g.world.player.x; e.lastZ = g.world.player.z; e.lost = 0; } },
    setup_clearEnemies() { for (const e of g.world.enemies) e.state = 'dead'; },
    setup_player(fields) { Object.assign(g.world.player, fields); },
    // -- diagnostics --
    perf() { const t = [...g.frameTimes].sort((a, b) => a - b); const n = t.length; return { frames: n, avgMs: n ? t.reduce((a, b) => a + b, 0) / n : 0, p95Ms: t[Math.floor(n * 0.95)] ?? 0, worstMs: t[n - 1] ?? 0 }; },
    /** render ONE full frame (world + weapon + post) and report its true draw-call/triangle totals (info auto-reset is off for the duration) */
    measureFrame() { const i = app.renderer.info; i.autoReset = false; i.reset(); render(0.016); const r = { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0 }; i.autoReset = true; return r; },
    gl: () => ({ ...app.renderer.info.memory, calls: app.renderer.info.render.calls, triangles: app.renderer.info.render.triangles, programs: app.renderer.info.programs?.length ?? 0 }),
    saveSlot: (slot) => store.read(slot),
    // -- audio QA (browser only): render a recipe offline and return 16-bit PCM as base64 --
    async audioRender(id, seconds = 3) {
      const { renderSfx } = await import('../audio/synth.js'); const { rate, samples, duration } = await renderSfx(id, { seconds });
      return { rate, duration, ...pcm(samples) };
    },
    async audioMusic(seconds = 12, intensity = 0.8) { const { renderMusic } = await import('../audio/music.js'); const { rate, samples } = await renderMusic({ seconds, intensity }); return { rate, ...pcm(samples) }; },
    automap: async () => { const { automapModel } = await import('../engine/automap.js'); const m = automapModel(g.world); return { exploredCount: m.exploredCount, doors: m.doors.length, exits: m.exits.length, kinds: [...new Set(m.cells.map((c) => c.kind))] }; },
    mapOpen: () => g.mapOpen,
    audioUnlock: () => audio.unlock(), audioLog: (n = 40) => audio.stats.log.slice(-n),
    sfxIds: async () => Object.keys((await import('../audio/synth.js')).SFX),
  };
}
