// GROKS — follow-ups: the save holes that need a second tick, and the mechanic probes.
// One command: node attack/groks/fuzz/mechanics.mjs
import { loadMap, createWorld, step, drainEvents, idle, runTicks, armEverything, invariantErrors, writeOut, makeSave, parseSave, loadWorld } from './harness.mjs';
import { earn } from '../../../src/engine/progress.js';
import { WEAPONS, ENEMIES } from '../../../src/engine/defs.js';

const findings = [];
function note(id, severity, title, detail) { findings.push({ id, severity, title, detail }); console.log(severity, id, '—', title); if (detail) console.log(String(detail).slice(0, 500)); }

const map = loadMap('C1E1M01');
const base = () => { const w = createWorld(map, { seed: 1 }); for (let i = 0; i < 3; i++) step(w, idle()); return JSON.parse(JSON.stringify(makeSave(w, 'mid-level', { now: 1 }))); };
function loadMut(mut) {
  const s = base(); mut(s);
  const p = parseSave(JSON.stringify(s));
  if (!p.ok) return { rejected: p.reason + ' ' + p.detail };
  try { return loadWorld(p.save, () => map); }
  catch (e) { return { threw: e.message }; }
}

// ammo string + fire becomes NaN
{
  const r = loadMut((s) => { s.world.player.ammo.flare = 'lots'; });
  if (r.ok) {
    const run = runTicks(r.world, 20, () => ({ ...idle(), fire: true }));
    note('ammo-string-fire', run.threw ? 'BLOCKER' : run.bad ? 'MAJOR' : 'INFO', 'string ammo then fire', (run.threw || (run.bad && run.bad.join(';'))) + ' ammo=' + JSON.stringify(r.world.player.ammo));
  }
}
// negative ammo + fire
{
  const r = loadMut((s) => { s.world.player.ammo.flare = -3; });
  if (r.ok) {
    runTicks(r.world, 10, () => ({ ...idle(), fire: true }));
    console.log('neg ammo after fire', r.world.player.ammo.flare, 'shots', r.world.stats.shots);
    if (r.world.stats.shots > 0) note('neg-ammo-shoots', 'MAJOR', 'negative ammo still fired', r.world.player.ammo.flare);
    else if (r.world.player.ammo.flare < 0) note('neg-ammo-sticks', 'MINOR', 'negative ammo is kept and only dry-fires', 'flare=' + r.world.player.ammo.flare);
  }
}
// events null + fire
{
  const r = loadMut((s) => { s.world.events = null; });
  if (r.ok) {
    const run = runTicks(r.world, 5, () => ({ ...idle(), fire: true }));
    if (run.threw) note('events-null-fire', 'BLOCKER', 'a save with events:null loads, then the first shot throws', run.threw);
    else console.log('events-null survived fire', r.world.events);
  }
}
// keys string + a forged key pickup by calling step near... simulate the push path
{
  const r = loadMut((s) => { s.world.player.keys = 'brass'; });
  if (r.ok) {
    let threw = null;
    try { r.world.player.keys.push('iron'); }
    catch (e) { threw = e.message; }
    if (threw) note('keys-string', 'MAJOR', 'player.keys as a string loads, and gaining a key throws', threw);
  }
}
// tick overflow
{
  const r = loadMut((s) => { s.world.tick = Number.MAX_VALUE; });
  if (r.ok) {
    let threw = null; try { step(r.world, idle()); } catch (e) { threw = e.message; }
    console.log('tick max time', r.world.time, 'finite', Number.isFinite(r.world.time), 'threw', threw);
    if (!Number.isFinite(r.world.time)) note('tick-overflow', 'MAJOR', 'a finite tick of Number.MAX_VALUE becomes a non-finite clock on the next step', 'time=' + r.world.time);
  }
}
// status complete, no endStats: what earn does (the shell calls this 0.9s after load)
{
  let threw = null; let res = null;
  try { res = earn({ salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} }, 'C1E1M01', null, 60); }
  catch (e) { threw = e.message; }
  if (threw) note('earn-null', 'BLOCKER', 'loading a world already marked complete with no endStats throws in earn()', threw);
  else console.log('earn null', JSON.stringify(res));
}
// enemy y null, woken, beside the player
{
  const r = loadMut((s) => { const e = s.world.enemies[0]; if (e) { e.y = null; e.state = 'chase'; e.x = s.world.player.x + 1; e.z = s.world.player.z; } });
  if (r.ok) {
    const run = runTicks(r.world, 60, () => idle());
    if (run.threw || run.bad) note('enemy-y-null', run.threw ? 'BLOCKER' : 'MAJOR', 'enemy with y:null beside the player', run.threw || run.bad.join(';'));
    else console.log('enemy y null survived', 'y', r.world.enemies[0]?.y);
  }
}

// --- mechanic probes on real maps ---
function probe(id, fn) {
  try { fn(loadMap(id)); }
  catch (e) { note('probe-' + id, 'BLOCKER', id + ' probe threw', e.stack?.split('\n').slice(0, 5).join('\n')); }
}

// saw: heat boundary and switch mid-stall
probe('C1E1M01', (m) => {
  const w = createWorld(m, { seed: 1 });
  armEverything(w); w.player.weapon = 'chainsaw';
  const fire = { ...idle(), fire: true };
  let stalls = 0, restarts = 0;
  for (let i = 0; i < 60 * 30 && w.status === 'playing'; i++) {
    step(w, fire); for (const e of drainEvents(w)) { if (e.type === 'saw_stall') stalls++; if (e.type === 'saw_restart') restarts++; }
    if (stalls > 2) break;
  }
  console.log('saw stalls', stalls, 'restarts', restarts, 'heat', w.player.saw?.heat, 'stall', w.player.saw?.stall, 'spin', w.player.saw?.spin);
  // switch away on the stall frame and back
  w.player.weapon = 'flare'; step(w, idle());
  w.player.weapon = 'chainsaw';
  const before = w.player.saw?.stall;
  step(w, fire);
  console.log('saw after switch stall', before, '->', w.player.saw?.stall, 'spin', w.player.saw?.spin);
});

// rocket self damage does not move the player
probe('C1E1M01', (m) => {
  const w = createWorld(m, { seed: 1 }); armEverything(w); w.player.weapon = 'linethrower'; w.player.pitch = 0;
  const x0 = w.player.x, z0 = w.player.z, hp0 = w.player.hp;
  for (let i = 0; i < 40; i++) { step(w, { ...idle(), fire: true }); drainEvents(w); }
  const moved = Math.hypot(w.player.x - x0, w.player.z - z0);
  console.log('rocket self moved', moved.toFixed(3), 'hp', hp0, '->', w.player.hp, 'status', w.status);
});

// fork: punt a gaunt at a wall on C1E2M05 (has movables) and a boss on C1E4M08
probe('C1E2M05', (m) => {
  const w = createWorld(m, { seed: 1 }); armEverything(w); w.player.weapon = 'fork';
  const e = w.enemies.find((o) => !ENEMIES[o.kind].boss && !ENEMIES[o.kind].node && !ENEMIES[o.kind].peaceful);
  if (!e) { console.log('no punt target'); return; }
  // stand just south of it, look north (yaw 0 is north? forward is -sin yaw, -cos yaw). yaw 0 faces -z.
  w.player.x = e.x; w.player.z = e.z + 2; w.player.y = e.y; w.player.yaw = 0; w.player.pitch = 0;
  step(w, { ...idle(), fire: true });
  const shoves = w.shoves?.length ?? 0;
  console.log('fork punt shoves', shoves, 'enemy', e.kind, e.id);
  const run = runTicks(w, 90, () => idle());
  if (run.threw || run.bad) note('fork-punt-' + e.kind, run.threw ? 'BLOCKER' : 'MAJOR', 'punt on ' + m.id, run.threw || run.bad.join(';'));
  else console.log('punt survived', e.kind, 'pos', e.x.toFixed(2), e.z.toFixed(2), 'hp', e.hp);
});

// void lastSafe: place the player on a void cell of a map that has void and no cars
probe('C1E4M07', (m) => {
  const w = createWorld(m, { seed: 1 });
  let vx = -1, vz = -1;
  for (let z = 0; z < m.h && vx < 0; z++) for (let x = 0; x < m.w; x++) if (m.kind(x, z) === 'void') { vx = x; vz = z; break; }
  console.log('hollow void cell', vx, vz, 'cars', m.cars.length, 'vents', m.vents.length);
  if (vx < 0) return;
  w.player.x = (vx + 0.5) * m.cell; w.player.z = (vz + 0.5) * m.cell; w.player.y = 0; w.player.air = null;
  const run = runTicks(w, 90, () => ({ ...idle(), move: [0, 1] }));
  console.log('stood on void', run.status, 'hp', run.hp, 'pos', run.x, run.z, 'threw', !!run.threw, 'bad', run.bad);
  if (run.threw) note('void-stand', 'BLOCKER', 'standing on a Hollow Stair void cell threw', run.threw);
  else if (run.status === 'dead') note('void-stand-dead', 'MAJOR', 'a player placed on the Hollow Stair void dies instead of being set back', 'hp path ended at ' + run.hp + ' pos ' + run.x + ',' + run.z);
  else if (run.bad) note('void-stand-bad', 'MAJOR', 'standing on void broke an invariant', run.bad.join(';'));
});

// C2M20 car: ride the first car for 20s and watch invariants. Also stand on its edge.
probe('C2M20', (m) => {
  const w = createWorld(m, { seed: 1 });
  console.log('cars', m.cars.length, 'first', JSON.stringify(m.cars[0]?.path?.slice?.(0, 2) ?? m.cars[0]));
  const run = runTicks(w, 60 * 20, (i) => ({ ...idle(), move: [0, i < 90 ? 1 : 0], yaw: 0.01 }));
  if (run.threw || run.bad) note('car-walk', run.threw ? 'BLOCKER' : 'MAJOR', 'C2M20 walk threw or broke', run.threw || run.bad.join(';') + ' @' + run.ticks);
  else console.log('C2M20 walk ok', run.status, run.hp, 'pos', run.x?.toFixed?.(1), run.z?.toFixed?.(1));
});

// both airlock wants on Cold Dock: find two interlocked doors and set want on both, player in the first doorway
probe('C1E4M03', (m) => {
  const w = createWorld(m, { seed: 1 });
  const locks = w.doors.filter((d) => d.interlock);
  console.log('airlock doors', locks.length);
  if (locks.length < 2) return;
  const a = locks[0], b = locks.find((d) => d.cx === a.interlock[0] && d.cz === a.interlock[1]) || locks[1];
  a.open = 1; a.target = 1; b.open = 0; b.target = 0; a.want = true; b.want = true;
  w.player.x = (a.cx + 0.5) * m.cell; w.player.z = (a.cz + 0.5) * m.cell;
  const run = runTicks(w, 60 * 8, (i) => ({ ...idle(), use: i % 20 === 0, move: [0, 0.2] }));
  const both = w.doors.filter((d) => d.interlock && d.open > 0.5 && d.target === 1);
  console.log('airlock after', 'status', run.status, 'bothOpen', both.length, 'threw', !!run.threw, 'a', a.open.toFixed(2), a.target, 'b', b.open.toFixed(2), b.target);
  if (run.threw) note('airlock', 'BLOCKER', 'mashing both airlock doors threw', run.threw);
  else if (both.length >= 2) note('airlock-both', 'MAJOR', 'both doors of an interlock were open together', 'a ' + a.cx + ',' + a.cz + ' b ' + b.cx + ',' + b.cz);
});

// Root Bell: kill every anchor in one tick, then survive 10s
probe('C2M29', (m) => {
  const w = createWorld(m, { seed: 1 });
  const bell = w.enemies.find((e) => e.kind === 'rootbell');
  const anchors = w.enemies.filter((e) => e.kind === 'rootanchor');
  console.log('bell', !!bell, 'anchors', anchors.length, 'hp', bell?.hp);
  if (!bell) return;
  w.player.x = bell.x + 3; w.player.z = bell.z; w.player.y = bell.y;
  for (const a of anchors) { a.hp = 0; a.state = 'dead'; }
  bell.state = 'chase';
  const run = runTicks(w, 60 * 12, () => idle());
  if (run.threw || run.bad) note('bell-anchors', run.threw ? 'BLOCKER' : 'MAJOR', 'killing every Root Bell anchor in one tick', run.threw || run.bad.join(';'));
  else console.log('bell after anchors', bell.state, 'mode', bell.rb?.mode, 'lift', bell.lift, 'player', run.status, run.hp);
});

// Gate warden: kill all seals in one tick
probe('C1E4M08', (m) => {
  const w = createWorld(m, { seed: 1 });
  const boss = w.enemies.find((e) => e.kind === 'gatewarden');
  const seals = w.enemies.filter((e) => e.kind === 'seal');
  console.log('warden', !!boss, 'seals', seals.length);
  if (!boss) return;
  w.player.x = boss.x + 4; w.player.z = boss.z;
  for (const s of seals) { s.hp = 0; s.state = 'dead'; }
  boss.state = 'chase';
  const run = runTicks(w, 60 * 8, () => idle());
  if (run.threw || run.bad) note('warden-seals', run.threw ? 'BLOCKER' : 'MAJOR', 'killing every seal in one tick', run.threw || run.bad.join(';'));
  else console.log('warden ok', boss.hp, run.status, run.hp);
});

// drops: revived body and a second kill
probe('C1E1M02', (m) => {
  const w = createWorld(m, { seed: 1 });
  // find a sexton or just mark an enemy revived and kill it
  const e = w.enemies.find((o) => o.kind === 'tollbearer') || w.enemies[0];
  if (!e) return;
  e.revived = 1; e.hp = 1; e.state = 'chase'; e.x = w.player.x + 1; e.z = w.player.z;
  w.player.weapon = 'flare';
  let drops = 0;
  for (let i = 0; i < 30; i++) { step(w, { ...idle(), fire: true }); for (const ev of drainEvents(w)) if (ev.type === 'drop') drops++; }
  console.log('revived kill drops', drops, 'state', e.state);
  if (drops > 0) note('drop-revived', 'MAJOR', 'a revived creature dropped ammunition', e.kind);
});

console.log('\nFINDINGS', findings.length);
writeOut('mechanics.json', findings);
if (findings.some((f) => f.severity === 'BLOCKER' || f.severity === 'MAJOR')) process.exitCode = 2;
