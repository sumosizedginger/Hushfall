// GROKS — corrupt saves. One command: node attack/groks/fuzz/save-mutate.mjs
// A finding is a throw, or ok:true followed by a throw on the next ticks, or a god-mode stat the loader keeps.
import { createWorld, step, loadMap, idle, runTicks, invariantErrors, writeOut, makeSave, parseSave, loadWorld } from './harness.mjs';
import { sanitizeProgress, buy, earn } from '../../../src/engine/progress.js';
import { sanitizeSettings, defaultSettings } from '../../../src/game/settings.js';
import { InputState, ACTIONS } from '../../../src/engine/input.js';
import { FixedLoop } from '../../../src/engine/loop.js';
import { deadzone, stickLook, PadDevice, defaultPadBindings } from '../../../src/game/gamepad.js';

const map = loadMap('C1E1M01');
const fresh = () => { const w = createWorld(map, { seed: 1 }); for (let i = 0; i < 5; i++) step(w, idle()); return w; };
const baseSave = () => JSON.parse(JSON.stringify(makeSave(fresh(), 'mid-level', { now: 1 })));

const findings = [];
function note(id, severity, title, detail) { findings.push({ id, severity, title, detail }); console.log(severity, id, title); if (detail) console.log('   ', String(detail).slice(0, 400)); }

function attempt(id, mutate, { expect = 'reject-or-survive' } = {}) {
  const s = baseSave();
  try { mutate(s); } catch (e) { note(id, 'HARNESS', 'mutate threw', e.message); return; }
  let parsed;
  try { parsed = parseSave(JSON.stringify(s)); }
  catch (e) { note(id, 'BLOCKER', 'parseSave threw', e.message); return; }
  if (!parsed.ok) { console.log('reject-parse', id, parsed.reason, parsed.detail); return; }
  let loaded;
  try { loaded = loadWorld(parsed.save, () => map); }
  catch (e) { note(id, 'MAJOR', 'loadWorld threw instead of rejecting', e.message); return; }
  if (!loaded.ok) { console.log('reject-load', id, loaded.reason, String(loaded.detail).slice(0, 180)); return; }
  const run = runTicks(loaded.world, 30, () => idle());
  if (run.threw) note(id, 'BLOCKER', 'save loaded (ok:true) then step() threw', run.threw);
  else if (run.bad) note(id, 'MAJOR', 'save loaded then broke an invariant', run.bad.join('; ') + ' @tick ' + run.ticks);
  else console.log('survived', id, 'status', run.status, 'hp', run.hp);
}

// --- structural / type attacks the shape check is supposed to stop, and the ones it skips ---
attempt('bad-difficulty', (s) => { s.campaign.difficulty = 'nightmare'; });
attempt('null-difficulty', (s) => { s.campaign.difficulty = null; });
attempt('empty-difficulty', (s) => { s.campaign.difficulty = ''; });
attempt('weapon-nope', (s) => { s.world.player.weapon = 'nope'; });
attempt('weapon-null', (s) => { s.world.player.weapon = null; });
attempt('weapon-deleted', (s) => { delete s.world.player.weapon; });
attempt('weapons-string', (s) => { s.world.player.weapons = 'flare'; });
attempt('weapons-object', (s) => { s.world.player.weapons = { 0: 'flare' }; });
attempt('ammo-nan', (s) => { s.world.player.ammo.flare = null; }); // JSON null, not NaN (JSON cannot carry NaN)
attempt('ammo-string', (s) => { s.world.player.ammo.flare = 'lots'; });
attempt('ammo-negative', (s) => { s.world.player.ammo.flare = -5; s.world.player.ammo.rocket = -1; });
attempt('ammo-huge', (s) => { s.world.player.ammo.flare = 1e9; s.world.player.hp = 1e9; s.world.player.armor = 1e9; });
attempt('hp-negative', (s) => { s.world.player.hp = -10; });
attempt('keys-string', (s) => { s.world.player.keys = 'brass'; });
attempt('enemy-y-null', (s) => { if (s.world.enemies[0]) s.world.enemies[0].y = null; });
attempt('enemy-state', (s) => { if (s.world.enemies[0]) s.world.enemies[0].state = 'banana'; });
attempt('enemy-far', (s) => { if (s.world.enemies[0]) { s.world.enemies[0].x = 1e9; s.world.enemies[0].z = -1e9; s.world.enemies[0].state = 'chase'; } });
attempt('enemy-kind', (s) => { if (s.world.enemies[0]) s.world.enemies[0].kind = 'not-a-creature'; });
attempt('inject-map', (s) => { s.world.map = { cell: 2, w: 1, h: 1 }; });
attempt('events-null', (s) => { s.world.events = null; });
attempt('events-string', (s) => { s.world.events = 'nope'; });
attempt('tick-max', (s) => { s.world.tick = Number.MAX_VALUE; });
attempt('tick-neg', (s) => { s.world.tick = -5; });
attempt('nextid-max', (s) => { s.world.nextId = Number.MAX_SAFE_INTEGER; });
attempt('carry-bad-weapons', (s) => { s.carry.weapons = { length: 3 }; });
attempt('carry-hp-neg', (s) => { s.carry.hp = -50; s.carry.ammo = { flare: -10 }; });
attempt('all-enemies-dead', (s) => { for (const e of s.world.enemies) { e.state = 'dead'; e.hp = 0; } });
attempt('no-enemies', (s) => { s.world.enemies = []; });
attempt('explored-huge', (s) => { s.world.explored = new Array(5000).fill(1); });
attempt('projectile-null', (s) => { s.world.projectiles = [null]; });
attempt('status-complete', (s) => { s.world.status = 'complete'; });
attempt('pitch-huge', (s) => { s.world.player.pitch = 100; s.world.player.yaw = 1e308; });
attempt('proto-key', (s) => { s.world.player.__proto__ = { hp: 99999 }; });

// JSON-level garbage
for (const [id, text] of [['trunc', '{'], ['not-json', 'hushfall'], ['array', '[]'], ['proto-json', '{"__proto__":{"admin":true},"magic":"HUSHFALL_SAVE","version":10}']]) {
  let r; try { r = parseSave(text); } catch (e) { note(id, 'BLOCKER', 'parseSave threw on garbage', e.message); continue; }
  console.log('garbage', id, r.ok, r.reason || 'accepted');
  if (r.ok) note(id, 'MAJOR', 'garbage text parsed as a save', JSON.stringify(r.save).slice(0, 200));
}

// future / ancient versions
{
  const s = baseSave(); s.version = 99;
  const r = parseSave(JSON.stringify(s));
  console.log('future', r.ok, r.reason);
  if (r.ok) note('future', 'MAJOR', 'a future version loaded', r.save.version);
}
{
  const s = baseSave(); s.version = 1;
  const r = parseSave(JSON.stringify(s));
  console.log('v1', r.ok, r.reason, r.detail);
}

// god mode kept?
{
  const s = baseSave(); s.world.player.hp = 1e9; s.world.player.armor = 1e9; s.world.player.ammo.rocket = 1e9; s.world.player.weapons.push('linethrower');
  const loaded = loadWorld(parseSave(JSON.stringify(s)).save, () => map);
  if (loaded.ok && loaded.world.player.hp >= 1e9) note('god-hp', 'MAJOR', 'mid-level save keeps hp 1e9, armor 1e9 and rocket 1e9', 'hp=' + loaded.world.player.hp);
}

// progress
{
  const p = sanitizeProgress({ salvage: 1e308, upgrades: { ammo: 100, armor: -4 }, records: { C1E1M01: { rank: 'S', score: 1, time: 1, kills: 1, secrets: 0, paid: 0 } }, choices: { '../x': 'no', ok: 'OK', fine: 'west-wing' } });
  const b = buy(p, 'ammo');
  if (b.ok) note('salvage-1e308', 'MAJOR', 'sanitizeProgress keeps salvage 1e308 and buy() spends it', 'left=' + b.progress.salvage + ' tier=' + b.progress.upgrades.ammo);
  console.log('choices kept', JSON.stringify(p.choices), 'upgrades', JSON.stringify(p.upgrades), 'salvage', p.salvage);
  const earned = earn({ salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} }, 'C1E1M01', { time: NaN, kills: 0, secrets: 0, total: { enemies: 0, secrets: 0 } }, 60);
  console.log('earn NaN time', JSON.stringify(earned.result), 'gain', earned.gain, 'salvage', earned.progress.salvage);
  if (!Number.isFinite(earned.progress.salvage) || !Number.isFinite(earned.result.score)) note('earn-nan', 'MAJOR', 'earn() produced a non-finite rank or salvage from NaN time', JSON.stringify(earned.result));
}

// settings + bindings
{
  const raw = defaultSettings();
  raw.bindings = { ...raw.bindings, fire: ['KeyF'], use: ['KeyF'] };
  const { settings } = sanitizeSettings(raw);
  const input = new InputState(settings.bindings);
  input.keyDown('KeyF');
  const cmd = input.sample();
  const fireWins = !!cmd.fire, useWins = !!cmd.use;
  console.log('duplicate KeyF fire', fireWins, 'use', useWins, 'legend-first', settings.bindings.fire[0], settings.bindings.use[0]);
  if (fireWins === false && settings.bindings.fire.includes('KeyF')) note('dup-key', 'MINOR', 'two actions bound to KeyF: the legend still shows F for Fire, but Fire does not fire', 'use=' + useWins + ' fire=' + fireWins);
  const polluted = sanitizeSettings(JSON.parse('{"version":1,"bindings":{"__proto__":{"pwn":1},"fire":["KeyF"]}}'));
  if (({}).pwn) note('settings-proto', 'BLOCKER', 'settings JSON polluted Object.prototype', '');
  console.log('settings proto notes', polluted.notes);
  const extreme = sanitizeSettings({ ...defaultSettings(), sensitivity: NaN, fov: 1, brightness: 1e6, internalWidth: 999 });
  console.log('clamped', extreme.settings.sensitivity, extreme.settings.fov, extreme.settings.brightness, extreme.settings.internalWidth);
}

// pad
{
  const cases = [[NaN, 0], [0, NaN], [Infinity, 0], [-Infinity, 1], [1e9, -1e9], [1, 0]];
  for (const [x, y] of cases) {
    const dz = deadzone(x, y);
    const look = stickLook(x, y, 1 / 60);
    const pad = new PadDevice();
    const out = pad.poll({ id: 'fake', buttons: [], axes: [x, y, x, y] }, 1 / 60);
    const bad = [dz, look, out.move, out.look].flat().some((n) => typeof n !== 'number' || !Number.isFinite(n));
    console.log('pad', x, y, 'dz', dz, 'move', out.move, 'look', out.look, bad ? 'NON-FINITE' : 'ok');
    if (bad) note('pad-' + x, 'MAJOR', 'pad axes ' + x + ',' + y + ' produced a non-finite move or look', JSON.stringify({ dz, look, move: out.move, lookOut: out.look }));
  }
}

// fixed loop
{
  const stepped = [];
  const loop = new FixedLoop(() => stepped.push(1));
  const a = loop.advance(5);
  const b = new FixedLoop(() => {}).advance(-1);
  const c = new FixedLoop(() => {}); const cn = c.advance(NaN);
  const d = new FixedLoop(() => {}); const di = d.advance(Infinity);
  console.log('loop dt5 steps', a.steps, 'dropped', loop.dropped, 'neg acc', b, 'nan', cn, 'acc', c.acc, 'inf steps', di.steps);
  if (a.steps > 8) note('spiral', 'MAJOR', 'a 5s dt simulated more than 8 ticks', a.steps);
  if (!Number.isFinite(c.acc)) note('loop-nan', 'MINOR', 'FixedLoop.advance(NaN) poisons the accumulator', c.acc);
}

console.log('\nFINDINGS', findings.length);
writeOut('save-mutate.json', findings);
if (findings.some((f) => f.severity === 'BLOCKER' || f.severity === 'MAJOR')) process.exitCode = 2;
