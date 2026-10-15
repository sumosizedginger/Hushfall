// GROKS — random-input invariant fuzz on the maps most likely to be wrong.
// One command: node attack/groks/fuzz/sim-fuzz.mjs
// Optional: node attack/groks/fuzz/sim-fuzz.mjs C2M29 C2M28
import { loadMap, createWorld, step, drainEvents, hashWorld, idle, mulberry, armEverything, runTicks, roundTrip, invariantErrors, writeOut } from './harness.mjs';

const asked = process.argv.slice(2);
const MAPS = asked.length ? asked : ['C1E1M01', 'C1E2M05', 'C1E3M04', 'C1E4M03', 'C1E4M07', 'C1E4M08', 'C2M11', 'C2M20', 'C2M24', 'C2M25', 'C2M28', 'C2M29', 'C2M30'];
const findings = [];
function note(id, severity, title, detail) { findings.push({ id, severity, title, detail }); console.log('\n' + severity, id, title); console.log(detail); }

function rndCmd(rng, i) {
  const r = rng;
  return {
    move: [r() * 2 - 1, r() * 2 - 1],
    yaw: (r() - 0.5) * 0.5,
    pitch: (r() - 0.5) * 0.15,
    fire: r() < 0.45,
    aim: r() < 0.25,
    sprint: r() < 0.2,
    use: r() < 0.08 && i % 7 === 0,
    melee: r() < 0.05,
    lamp: r() < 0.03 && i % 11 === 0,
    weapon: r() < 0.07 ? (r() * 10) | 0 : null,
    weaponStep: r() < 0.04 ? (r() < 0.5 ? 1 : -1) : 0,
    weaponLast: r() < 0.02,
    pause: false, map: false,
  };
}

function fuzzOne(id, seed, ticks, arm) {
  const map = loadMap(id);
  const w = createWorld(map, { seed, difficulty: 'normal' });
  if (arm) armEverything(w);
  const rng = mulberry(seed * 10007 + 3);
  const t0 = Date.now();
  const run = runTicks(w, ticks, (i) => rndCmd(rng, i));
  const ms = Date.now() - t0;
  const line = id + ' seed ' + seed + (arm ? ' armed' : ' stock') + ' ' + run.ticks + ' ticks in ' + ms + 'ms status=' + run.status + ' hp=' + run.hp;
  console.log(run.threw || run.bad ? 'FAIL ' + line : 'ok   ' + line);
  if (run.threw) note('throw-' + id + '-' + seed + (arm ? '-arm' : ''), 'BLOCKER', id + ' threw under random input', run.threw);
  else if (run.bad) note('inv-' + id + '-' + seed + (arm ? '-arm' : ''), 'MAJOR', id + ' broke an invariant under random input', run.bad.join('; ') + ' @tick ' + run.ticks + ' pos ' + run.x + ',' + run.z);
  return { ms, ticks: run.ticks, per: ms / Math.max(1, run.ticks) };
}

// metamorphic + determinism on one small map and one late map
function meta(id) {
  const map = loadMap(id);
  const cmds = [];
  const rng = mulberry(42);
  for (let i = 0; i < 120; i++) cmds.push(rndCmd(rng, i));
  const a = createWorld(map, { seed: 7 });
  const b = createWorld(map, { seed: 7 });
  if (hashWorld(a) !== hashWorld(b)) note('det0-' + id, 'BLOCKER', id + ' two fresh worlds differ', hashWorld(a) + ' vs ' + hashWorld(b));
  for (let i = 0; i < cmds.length; i++) { step(a, cmds[i]); step(b, cmds[i]); drainEvents(a); drainEvents(b); }
  if (hashWorld(a) !== hashWorld(b)) note('det-' + id, 'BLOCKER', id + ' diverged under identical inputs', hashWorld(a) + ' vs ' + hashWorld(b));
  else console.log('det ok', id, hashWorld(a));
  // 1 x N vs N is the same function here (step is one tick). Compare a save/load at tick 60.
  const w = createWorld(map, { seed: 7 });
  for (let i = 0; i < 60; i++) { step(w, cmds[i]); drainEvents(w); }
  const rt = roundTrip(w, map);
  if (!rt.ok) { note('rt-' + id, 'MAJOR', id + ' save/load failed mid-run', rt.stage + ' ' + rt.detail); return; }
  const w2 = rt.world;
  for (let i = 60; i < cmds.length; i++) { step(w, cmds[i]); step(w2, cmds[i]); drainEvents(w); drainEvents(w2); }
  const h1 = hashWorld(w), h2 = hashWorld(w2);
  if (h1 !== h2) {
    const px = Math.abs(w.player.x - w2.player.x), pz = Math.abs(w.player.z - w2.player.z);
    note('rt-hash-' + id, px + pz > 0.01 || w.player.hp !== w2.player.hp ? 'MAJOR' : 'MINOR', id + ' save/load changed the future', 'hash ' + h1 + ' vs ' + h2 + ' dp ' + px.toFixed(4) + ',' + pz.toFixed(4) + ' hp ' + w.player.hp + '/' + w2.player.hp + ' enemies ' + w.enemies.length + '/' + w2.enemies.length);
  } else console.log('roundtrip ok', id, h1);
}

const timing = [];
for (const id of MAPS) {
  try {
    timing.push({ id, ...fuzzOne(id, 1, id === 'C2M28' || id === 'C2M29' ? 250 : 400, false) });
    fuzzOne(id, 2, 200, true);
  } catch (e) {
    note('load-' + id, 'BLOCKER', id + ' could not be fuzzed', e.stack?.split('\n').slice(0, 5).join('\n'));
  }
}
try { meta('C1E1M01'); meta('C2M20'); meta('C2M29'); }
catch (e) { note('meta', 'BLOCKER', 'metamorphic harness threw', e.stack?.split('\n').slice(0, 6).join('\n')); }

console.log('\nslowest ticks ms', timing.sort((a, b) => b.per - a.per).slice(0, 5).map((t) => t.id + ' ' + t.per.toFixed(2) + 'ms/tick').join(' | '));
console.log('FINDINGS', findings.length);
writeOut('sim-fuzz.json', findings);
if (findings.some((f) => f.severity === 'BLOCKER' || f.severity === 'MAJOR')) process.exitCode = 2;
