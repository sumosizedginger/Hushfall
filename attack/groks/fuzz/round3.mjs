// GROKS — round 3. Neighbourhood of the save-shape holes found by save-mutate and mechanics.
// One command: node attack/groks/fuzz/round3.mjs
import { loadMap, createWorld, step, drainEvents, idle, runTicks, invariantErrors, writeOut, makeSave, parseSave, loadWorld } from './harness.mjs';
import { earn, sanitizeProgress, buy } from '../../../src/engine/progress.js';
import { WEAPONS, PICKUPS, PLAYER, VIEW } from '../../../src/engine/defs.js';
import { FixedLoop } from '../../../src/engine/loop.js';
import { maybeDrop } from '../../../src/engine/drops.js';

const findings = [];
function note(id, severity, title, detail) {
  findings.push({ id, severity, title, detail });
  console.log(severity, id, '—', title);
  if (detail) console.log(String(detail).slice(0, 400));
}

const map = loadMap('C1E1M01');
const base = () => {
  const w = createWorld(map, { seed: 1 });
  for (let i = 0; i < 2; i++) step(w, idle());
  return JSON.parse(JSON.stringify(makeSave(w, 'mid-level', { now: 1 })));
};
function loadMut(mut) {
  const s = base(); mut(s);
  const p = parseSave(JSON.stringify(s));
  if (!p.ok) return { rejected: p.reason + ' ' + p.detail };
  try { return loadWorld(p.save, () => map); }
  catch (e) { return { threw: e.message }; }
}
function attempt(id, mut, ticks = 8, cmd) {
  const r = loadMut(mut);
  if (r.rejected) { console.log('rejected', id, r.rejected); return r; }
  if (r.threw) { note(id, 'MAJOR', id + ' threw inside loadWorld', r.threw); return r; }
  if (!r.ok) { console.log('refused', id, r.reason, r.detail); return r; }
  const run = runTicks(r.world, ticks, cmd || (() => idle()));
  if (run.threw) note(id, 'MAJOR', id + ' loaded then step threw', run.threw.split('\n')[0]);
  else if (run.bad) note(id, 'MAJOR', id + ' loaded then broke an invariant', run.bad.join('; '));
  else console.log('survived', id, 'status', run.status, 'hp', run.hp);
  return { ...r, run };
}

// 1. unknown status: step returns immediately, shell would keep rendering
{
  const r = attempt('status-banana', (s) => { s.world.status = 'banana'; });
  if (r.ok && r.world.status === 'banana') note('status-freeze', 'MAJOR', 'a status other than playing/dead/complete loads and the sim never steps', 'status stayed ' + r.world.status);
}
// 2. complete + missing endStats: earn throws (shell calls this with no try)
{
  const r = loadMut((s) => { s.world.status = 'complete'; delete s.world.endStats; });
  let threw = null;
  if (r.ok) { try { earn({ salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} }, 'C1E1M01', r.world.endStats, 60); } catch (e) { threw = e.message; } }
  console.log('missing endStats load', r.ok, 'endStats', r.world?.endStats, 'earn', threw);
  if (r.ok && threw) note('earn-missing', 'BLOCKER', 'status complete with endStats omitted loads, and earn() throws', threw);
}
// 3. complete + empty endStats: does earn pay a rank?
{
  const r = loadMut((s) => { s.world.status = 'complete'; s.world.endStats = {}; });
  if (r.ok) {
    let res = null, threw = null;
    try { res = earn({ salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} }, 'C1E1M01', r.world.endStats, map.par?.time); }
    catch (e) { threw = e.message; }
    console.log('empty endStats', threw || JSON.stringify(res?.result), 'gain', res?.gain, 'time', res?.record?.time);
    if (threw) note('earn-empty', 'BLOCKER', 'empty endStats throws in earn()', threw);
    else if (res && res.gain > 0) note('earn-forged', 'MAJOR', 'an empty endStats on a complete save pays salvage', JSON.stringify(res.result) + ' gain ' + res.gain);
  }
}
// 4-12. nested holes the shape check does not walk
attempt('pickups-null', (s) => { s.world.pickups = [null]; });
attempt('shots-null', (s) => { s.world.enemyShots = [null]; });
attempt('burns-null', (s) => { s.world.burns = [null]; });
attempt('proj-empty', (s) => { s.world.projectiles = [{}]; }, 5, () => idle());
attempt('proj-life-string', (s) => { s.world.projectiles = [{ weapon: 'flare', x: 10, y: 1, z: 10, vx: 1, vy: 0, vz: 0, life: 'long' }]; });
attempt('door-open-string', (s) => { if (s.world.doors[0]) s.world.doors[0].open = 'wide'; });
attempt('ammo-null-obj', (s) => { s.world.player.ammo = null; }, 5, () => ({ ...idle(), fire: true }));
attempt('weapons-hole', (s) => { s.world.player.weapons = [null, 'flare']; });
attempt('weapon-number', (s) => { s.world.player.weapon = 0; });
attempt('exitlocked-null', (s) => { s.world.exitLocked = null; });
attempt('stats-null', (s) => { s.world.stats = null; });
attempt('swing-string', (s) => { s.world.player.swingT = 'x'; });
attempt('keys-null', (s) => { s.world.player.keys = null; });

// 13. messagesSeen string, player standing on the first message
{
  const m = map.messages?.[0];
  if (m) {
    const r = attempt('messages-string', (s) => {
      s.world.player.messagesSeen = 'nope';
      s.world.messagesSeen = 'nope';
      s.world.player.x = m.x; s.world.player.z = m.z;
    }, 4);
    console.log('message probe', m.id, r.run?.threw ? 'threw' : 'no-throw');
  } else console.log('no message on quay');
}
// 14. secretsFound string, standing in a secret cell
{
  const sec = map.secrets?.[0];
  if (sec) {
    const [cx, cz] = sec.cells[0];
    attempt('secrets-string', (s) => {
      s.world.secretsFound = 'nope';
      s.world.player.x = (cx + 0.5) * map.cell; s.world.player.z = (cz + 0.5) * map.cell;
    }, 4);
  }
}
// 15. keys string, standing on a real key pickup
{
  const keyKinds = new Set(Object.entries(PICKUPS).filter(([, d]) => d.type === 'key').map(([k]) => k));
  let host = null, key = null;
  for (const id of ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E2M01']) {
    const m = loadMap(id);
    const ent = (m.entities || []).find((e) => e.type === 'pickup' && keyKinds.has(e.kind));
    if (ent) { host = m; key = ent; break; }
  }
  if (key) {
    const w0 = createWorld(host, { seed: 1 });
    for (let i = 0; i < 2; i++) step(w0, idle());
    const s = JSON.parse(JSON.stringify(makeSave(w0, 'mid-level', { now: 1 })));
    s.world.player.keys = 'brass';
    s.world.player.x = (key.at[0] + 0.5) * host.cell;
    s.world.player.z = (key.at[1] + 0.5) * host.cell;
    const p = parseSave(JSON.stringify(s));
    const r = loadWorld(p.save, () => host);
    if (r.ok) {
      const run = runTicks(r.world, 6, () => idle());
      console.log('key stand', host.id, key.kind, 'threw', run.threw?.split('\n')[0], 'keys', JSON.stringify(r.world.player.keys));
      if (run.threw) note('keys-pickup', 'MAJOR', 'player.keys as a string loads, and walking onto a key throws', host.id + ' ' + key.kind + ' ' + run.threw.split('\n')[0]);
    }
  } else console.log('no key pickup found');
}
// 16. weapons as a string, then a kill (dropType calls .map)
{
  const r = loadMut((s) => { s.world.player.weapons = 'flare'; });
  if (r.ok) {
    const e = r.world.enemies.find((o) => o.state !== 'dead');
    let threw = null;
    if (e) { e.hp = 0; e.state = 'dead'; try { maybeDrop(r.world, e); } catch (err) { threw = err.message; } }
    console.log('weapons-string drop', threw || 'no throw', 'drops', !!r.world.map.drops);
    if (threw) note('weapons-string-kill', 'MAJOR', 'weapons saved as a string survives idle, then a kill throws in dropType', threw);
  }
}
// 17. the render expression the frame loop does not catch, when step returned early
{
  const p = { weapon: 'nope', ads: 0, sprint: 0 };
  let threw = null;
  try { const adsFov = (70) * ((WEAPONS[p.weapon].adsFov ?? VIEW.adsFov) / VIEW.fov); void adsFov; }
  catch (e) { threw = e.message; }
  console.log('render weapon expression', threw);
  if (threw) note('render-weapon', 'BLOCKER', 'GameView.render reads WEAPONS[weapon].adsFov with no guard, and frame() does not catch render', 'view.js:286 ' + threw + ' (expression only; the page was not opened)');
}
// 18. status complete + bad weapon: step must return BEFORE the weapon throw, so the render path is the one that runs
{
  const r = loadMut((s) => { s.world.status = 'complete'; s.world.player.weapon = 'nope'; s.world.endStats = { time: 10, kills: 0, secrets: 0, total: { enemies: 1, secrets: 0 }, damageTaken: 0, dest: 'next' }; });
  if (r.ok) {
    let threw = null; try { step(r.world, idle()); } catch (e) { threw = e.message; }
    console.log('complete+bad weapon step', threw || 'no throw', 'status', r.world.status);
    if (!threw) note('complete-bad-weapon', 'BLOCKER', 'status complete skips the step() weapon throw, so the uncaught render path is what runs', 'step returned, weapon still ' + r.world.player.weapon);
  }
}
// 19. C1E1M08 idle damage source
{
  const m = loadMap('C1E1M08');
  const w = createWorld(m, { seed: 1 });
  const near = w.enemies.map((e) => ({ kind: e.kind, d: Math.hypot(e.x - w.player.x, e.z - w.player.z), state: e.state })).sort((a, b) => a.d - b.d).slice(0, 3);
  const hurts = [];
  for (let i = 0; i < 180 && w.status === 'playing'; i++) {
    step(w, idle());
    for (const e of drainEvents(w)) if (e.type === 'hurt' || e.type === 'player_died') hurts.push(e.type + (e.amount != null ? ':' + e.amount : ''));
  }
  console.log('M08 nearest', JSON.stringify(near), 'hurts', hurts.join(','), 'hp', w.player.hp);
}
// 20. loop NaN poison
{
  let steps = 0;
  const loop = new FixedLoop(() => { steps++; });
  loop.advance(NaN);
  const second = loop.advance(1 / 30);
  console.log('loop after NaN', 'steps', steps, 'second', JSON.stringify(second), 'acc', loop.acc);
  if (steps === 0) note('loop-nan', 'MINOR', 'one NaN frame time freezes FixedLoop for the rest of the session', 'acc=' + loop.acc);
}
// 21. salvage god number
{
  const p = sanitizeProgress({ salvage: 1e308, upgrades: { ammo: 0, armor: 0 }, records: {} });
  const b = buy(p, 'ammo');
  console.log('salvage', p.salvage, 'buy', b.ok, 'tier', b.progress?.upgrades?.ammo);
  if (p.salvage > 1e6 && b.ok) note('salvage-god', 'MAJOR', 'sanitizeProgress keeps salvage 1e308 and buy() succeeds', 'salvage=' + p.salvage);
}
// 22. hp god
{
  const r = loadMut((s) => { s.world.player.hp = 1e9; s.world.player.armor = 1e9; });
  if (r.ok && r.world.player.hp > PLAYER.maxHp) note('hp-god', 'MAJOR', 'a finite hp far above the cap loads and is kept', 'hp=' + r.world.player.hp + ' cap=' + PLAYER.maxHp);
}
// 23. all enemies dead is accepted (dead: gates can be skipped)
{
  const r = loadMut((s) => { for (const e of s.world.enemies) { e.hp = 0; e.state = 'dead'; } });
  console.log('all dead', r.ok ? 'loaded hp0=' + r.world.enemies.every((e) => e.hp === 0) : r.reason || r.threw);
  if (r.ok && r.world.enemies.length && r.world.enemies.every((e) => e.state === 'dead')) note('roster-dead', 'MAJOR', 'a save that marks every enemy dead is accepted, so a dead: gate can be skipped', r.world.enemies.length + ' enemies');
}
// 24. enemy hp as a string is rejected (control)
{
  const r = loadMut((s) => { if (s.world.enemies[0]) s.world.enemies[0].hp = '10'; });
  console.log('enemy hp string', r.ok ? 'LOADED' : (r.reason || r.rejected || r.threw), r.detail || '');
}
// 25. script spawn does not set summoned (observation, not filed unless a drop happens)
{
  console.log('maybeDrop skips summoned', 'see drops.js:40');
}

console.log('\nFINDINGS', findings.length);
writeOut('round3.json', findings);
if (findings.some((f) => f.severity === 'BLOCKER' || f.severity === 'MAJOR')) process.exitCode = 2;
