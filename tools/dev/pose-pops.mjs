// POSE POPS (PT-078; the owner, 2026-10-31: "is there a way to smooth out the enemy actions? ... the bell monster in red that swings ... seems stiff"): how much each creature's drawn body JUMPS from one frame to the next,
// in numbers, node only (no browser, no GPU). A "pop" is a joint that turns more than POP radians in one 1/60 s frame (30 rad/s: faster than any blow is meant to read), or a body whose facing jumps that much.
//   node tools/dev/pose-pops.mjs synthetic            every creature kind, its own rig, driven through the inputs the view feeds it: a full attack and its end, a lunge, starting and stopping to walk, a death
//   node tools/dev/pose-pops.mjs maps [ID ...]        the real game: each map's main route played by the bot on Normal through the real GameView (a stand-in renderer), every creature's joints read every frame
//   --json                                             the numbers as JSON
import path from 'node:path';
import * as THREE from 'three';
import { GameView } from '../../src/render/view.js';
import { FACTORIES } from '../../src/render/models_choir.js';
import { ENEMIES, TICK } from '../../src/engine/defs.js';
import { createWorld, step, drainEvents } from '../../src/engine/world.js';
import { Bot } from '../../src/engine/bot.js';
import { InputState } from '../../src/engine/input.js';
import { loadMapFile, loadRouteFile } from '../../src/engine/harness.js';
import { texProxy, stubRenderer } from '../../tests/stubs.js';

const ROOT = path.resolve(import.meta.dirname, '../..'), POP = 0.5, args = process.argv.slice(2), json = args.includes('--json'), mode = args[0] ?? 'synthetic';
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** the joints of a rig worth watching: every named Group (a joint) of the creature's J table */
const jointsOf = (v) => Object.entries(v.J).filter(([n, o]) => o && o.isObject3D && !o.isMesh);
/** a tracker: feed it a rig each frame; it keeps the last rotation of every joint and counts the jumps */
function tracker() {
  const last = new Map(), out = { frames: 0, pops: 0, worst: [], byJoint: new Map() };
  return {
    out,
    reset(id) { for (const k of [...last.keys()]) if (k.startsWith(id + '|')) last.delete(k); },
    frame(id, kind, v, ctx = '') {
      out.frames++;
      for (const [n, o] of jointsOf(v)) for (const ax of ['x', 'y', 'z']) {
        const k = `${id}|${n}|${ax}`, now = o.rotation[ax], was = last.get(k); last.set(k, now); if (was == null) continue;
        const d = Math.abs(wrap(now - was)); if (d <= POP) continue;
        out.pops++; const jk = `${kind}.${n}.${ax}`; out.byJoint.set(jk, (out.byJoint.get(jk) ?? 0) + 1);
        if (out.worst.length < 400) out.worst.push({ kind, joint: n, axis: ax, jump: +d.toFixed(2), ctx });
      }
      const yk = `${id}|ROOTYAW`, y = v.root.rotation.y, wy = last.get(yk); last.set(yk, y);
      if (wy != null && Math.abs(wrap(y - wy)) > POP) { out.pops++; const jk = `${kind}.root.yaw`; out.byJoint.set(jk, (out.byJoint.get(jk) ?? 0) + 1); if (out.worst.length < 400) out.worst.push({ kind, joint: 'root', axis: 'yaw', jump: +Math.abs(wrap(y - wy)).toFixed(2), ctx }); }
    },
  };
}

/** a creature driven through the view's inputs, 60 frames a second: what the sim does to them in a fight */
function synthetic() {
  const tex = texProxy(), res = {};
  for (const kind of Object.keys(FACTORIES)) {
    const def = ENEMIES[kind]; if (!def) continue;
    const v = FACTORIES[kind](tex, {}), T = tracker(), dur = def.attack?.duration ?? 1, base = { flash: 0, awake: true, swell: 0, weep: 0, sweep: 0, aim: 0, afraid: false, beat: 0 };
    let t = 0, phase = 0, walk = 0;
    const pose = (o, ctx) => { t += TICK; v.pose({ ...base, t, walk, phase, attack: 0, lunge: 0, dead: 0, ...(o.attack > 0 && def.attack ? { strike: def.attack.windup, dur: def.attack.duration } : {}), ...o }); T.frame(kind, kind, v, ctx); };
    for (let i = 0; i < 30; i++) pose({}, 'stand');
    for (let i = 0; i < 60; i++) { walk = Math.min(1, walk + TICK * 5); phase += TICK * (def.gait ?? 6); pose({}, 'start walking'); }
    for (let i = 0; i < 20; i++) { walk = Math.max(0, walk - TICK * 4); phase += TICK * (def.gait ?? 6) * walk; pose({}, 'stop'); }
    walk = 0;
    for (let i = 0; i <= Math.round(dur / TICK); i++) pose({ attack: Math.min(1, (i * TICK) / dur) || 0.001 }, 'attack');
    for (let i = 0; i < 20; i++) pose({}, 'after the attack');
    if (def.lunge) { const L = def.lunge; for (let i = 0; i < Math.round(L.windup / TICK); i++) pose({ lunge: -((i * TICK) / L.windup) }, 'lunge crouch'); for (let i = 0; i < 20; i++) pose({ lunge: 1 }, 'lunge dash'); for (let i = 0; i < 20; i++) pose({}, 'after the lunge'); }
    for (let i = 0; i < 40; i++) { walk = Math.min(1, walk + TICK * 5); phase += TICK * (def.gait ?? 6); pose({}, 'walking'); }
    walk = 1; phase += 1.3; pose({}, 'a brain act: walk set to 1 at once'); for (let i = 0; i < 10; i++) { phase += TICK * (def.gait ?? 6) * 1.6; pose({}, 'a brain act'); }
    for (let i = 0; i < 30; i++) { walk = Math.max(0, walk - TICK * 4); phase += TICK * (def.gait ?? 6) * walk; pose({}, 'stop'); }
    walk = 0; for (let i = 0; i < 60; i++) pose({ dead: Math.min(1, i / 40) }, 'death');
    res[kind] = { frames: T.out.frames, pops: T.out.pops, worst: T.out.worst.sort((a, b) => b.jump - a.jump).slice(0, 4) };
  }
  return res;
}

/** the real game: a map's main route, the real view, every creature's joints every frame */
function maps(ids) {
  const res = {};
  for (const id of ids) {
    const map = loadMapFile(path.join(ROOT, 'maps', id + '.json')), route = loadRouteFile(path.join(ROOT, 'routes', id + '.main.route.json'));
    const w = createWorld(map, { seed: 1, difficulty: 'normal' }), view = new GameView(stubRenderer(), texProxy(), map, w); view.setSize(640, 360, 640); view.setLook({ outline: true, paint: true, fov: 70, brightness: 1 });
    const input = new InputState(), bot = new Bot(w, input, route), T = tracker(), posed = new Set();
    let ticks = 0;
    while (!bot.done && !bot.failed && w.status === 'playing' && ticks < 60 * 60 * 8) {
      bot.tick(); view.beforeStep(w); step(w, input.sample()); ticks++; view.handleEvents(drainEvents(w));
      for (const alpha of [0.5, 1]) { view.render(w, alpha, TICK / 2);          // two frames a tick, as a 120 Hz screen draws them (the spin across the -pi / pi seam only shows BETWEEN ticks)
      for (const e of w.enemies) {
        const v = view.enemyViews.get(e.id); if (!v) continue;
        const live = !v.frozen; if (!live) { if (posed.has(e.id)) { T.reset(e.id); posed.delete(e.id); } continue; }
        posed.add(e.id); T.frame(e.id, e.kind, v, `${e.state}${e.attackT >= 0 ? ' attacking' : ''}${e.actK ? ' ' + e.actK : ''}${(e.lungeT ?? -1) >= 0 ? ' lunge' : ''}`);
      } }
    }
    view.dispose?.();
    res[id] = { ticks, result: w.status, frames: T.out.frames, pops: T.out.pops, perMinute: +(T.out.pops / (ticks / 3600)).toFixed(1), popsPerThousandCreatureFrames: +(1000 * T.out.pops / Math.max(1, T.out.frames)).toFixed(2), byJoint: Object.fromEntries([...T.out.byJoint].sort((a, b) => b[1] - a[1]).slice(0, 8)), worst: T.out.worst.sort((a, b) => b.jump - a.jump).slice(0, 5) };
  }
  return res;
}

const out = mode === 'maps' ? maps(args.slice(1).filter((a) => !a.startsWith('--')).length ? args.slice(1).filter((a) => !a.startsWith('--')) : ['C1E1M01', 'C1E1M02', 'C1E1M05', 'C1E2M04', 'C1E3M05', 'C2M03']) : synthetic();
if (json) console.log(JSON.stringify(out, null, 1));
else {
  let total = 0;
  for (const [k, r] of Object.entries(out)) { total += r.pops; console.log(`${k.padEnd(12)} pops ${String(r.pops).padStart(5)}${r.perMinute != null ? ` (${r.perMinute}/min of play)` : ''}  ${(r.worst ?? []).slice(0, 3).map((x) => `${x.kind}.${x.joint}.${x.axis} ${x.jump} [${x.ctx}]`).join('; ')}`); }
  console.log(`TOTAL pops (a joint turning more than ${POP} rad in one frame): ${total}`);
}
void THREE;
