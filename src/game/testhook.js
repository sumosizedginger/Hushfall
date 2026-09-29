// DEV-ONLY test interface (window.__GAME_TEST__). Loaded via `if (import.meta.env.DEV) import(...)` in main.js, so production
// builds contain none of it. Actions travel through the real input layer + fixed step; the only state writers are the
// clearly-labelled setup_* helpers.
import { Bot } from '../engine/bot.js';
import { hashWorld } from '../engine/world.js';

const ROUTES = Object.fromEntries(Object.entries(import.meta.glob('../../routes/*.json', { eager: true, import: 'default' })).map(([p, v]) => [p.split('/').pop().replace('.route.json', ''), v]));

export function installTestHook(app) {
  const { g, MAPS, store } = app;
  let bot = null;
  const snap = () => {
    const w = g.world, p = w?.player;
    return {
      mode: g.mode, mapId: g.mapId, difficulty: g.difficulty, seed: g.seed, tick: w?.tick ?? null, status: w?.status ?? null, hash: w ? hashWorld(w) : null,
      player: p && { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch, hp: p.hp, armor: p.armor, ammo: p.ammo, keys: p.keys, weapon: p.weapon, cooldown: p.cooldown },
      stats: w?.stats ?? null, endStats: w?.endStats ?? null, secretsFound: w?.secretsFound ?? null,
      enemies: w?.enemies.map((e) => ({ id: e.id, x: e.x, z: e.z, hp: e.hp, state: e.state })) ?? null, pickups: w?.pickups.length ?? null,
      doors: w?.doors.map((d) => ({ cx: d.cx, cz: d.cz, open: d.open, target: d.target })) ?? null,
      lockFailed: g.lockFailed, settings: g.settings,
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
    setup_player(fields) { Object.assign(g.world.player, fields); },
    // -- diagnostics --
    perf() { const t = [...g.frameTimes].sort((a, b) => a - b); const n = t.length; return { frames: n, avgMs: n ? t.reduce((a, b) => a + b, 0) / n : 0, p95Ms: t[Math.floor(n * 0.95)] ?? 0, worstMs: t[n - 1] ?? 0 }; },
    gl: () => ({ ...app.renderer.info.memory, calls: app.renderer.info.render.calls, triangles: app.renderer.info.render.triangles, programs: app.renderer.info.programs?.length ?? 0 }),
    saveSlot: (slot) => store.read(slot),
  };
}
