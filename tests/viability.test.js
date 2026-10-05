// The gates that decide whether a map may be called AGENT_VERIFIED must themselves be able to fail (audit R01-R03). Each test builds a synthetic evidence object or a mutated
// copy of a shipped map and asserts that the corresponding check turns red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { runRoute } from '../src/engine/harness.js';
import { viabilityChecks, gateSkip, threatCount, ammoCapacityBy, firedBy, episodeDifficultyChecks } from '../src/engine/viability.js';
import { hashWorld } from '../src/engine/world.js';

const shipped = (id) => JSON.parse(fs.readFileSync(new URL(`../maps/${id}.json`, import.meta.url), 'utf8'));
const route = (id) => JSON.parse(fs.readFileSync(new URL(`../routes/${id}.main.route.json`, import.meta.url), 'utf8'));
const okEvidence = () => {
  const d = () => ({ runner: { result: 'dead', damage: 100 }, ammo: { capacity: 300, fired: 100, capacityBy: { flare: 30, shell: 40, rivet: 230 }, firedBy: { flare: 10, shell: 10, rivet: 80 } }, fighter: { completedSeeds: 3, seeds: 3, result: 'complete', meanDamage: 40, damage: 40, seconds: 100 } });
  return { easy: { ...d(), fighter: { ...d().fighter, meanDamage: 10 } }, normal: d(), hard: { ...d(), fighter: { ...d().fighter, meanDamage: 60 } }, gate: [{ exit: 'exit0', result: 'route-ended' }], robust: { 'aim error of 0.03 rad': { result: 'complete', damage: 50 } }, threats: 30 };
};
const failing = (v, opts) => viabilityChecks(v, 800, opts).filter((c) => !c.ok).map((c) => c.name);

test('viabilityChecks: a healthy evidence object passes, and each gate turns red when its own condition breaks', () => {
  assert.deepEqual(failing(okEvidence()), [], 'baseline is green');
  let v = okEvidence(); v.gate = [{ exit: 'exit0', result: 'complete' }]; assert.ok(failing(v).some((n) => /gate: an invulnerable fighting bot/.test(n)), 'an exit that can be walked to fails');
  v = okEvidence(); v.gate = [{ exit: 'exit0', result: 'dead' }]; assert.ok(failing(v).some((n) => /gate:/.test(n)), 'a bot that merely died on the way is NOT proof of gating');
  v = okEvidence(); v.robust['aim error of 0.03 rad'].result = 'dead'; assert.ok(failing(v).some((n) => /robustness/.test(n)), 'a weaker player who cannot finish fails');
  v = okEvidence(); v.normal.ammo.capacity = 120; assert.ok(failing(v).some((n) => /ammo normal: rounds available/.test(n)), 'aggregate ammo slack');
  v = okEvidence(); v.hard.ammo.capacityBy.flare = 11; assert.ok(failing(v).some((n) => /ammo hard: flare/.test(n)), 'per-type ammo slack (flare 11 vs 10 fired)');
  v = okEvidence(); v.hard.fighter.completedSeeds = 1; assert.ok(failing(v).some((n) => /hard: the perfect fighter completes on 2 of 3 seeds/.test(n)), 'one lucky seed is not completion');
  v = okEvidence(); v.normal.fighter.completedSeeds = 2; assert.ok(failing(v).some((n) => /normal: the perfect fighter completes on 3 of 3/.test(n)), 'normal needs all three seeds');
  v = okEvidence(); v.normal.runner.result = 'complete'; v.normal.runner.damage = 5; assert.ok(failing(v).some((n) => /passive runner/.test(n)), 'a passive runner that walks through fails');
  v = okEvidence(); v.easy.fighter.meanDamage = 500; assert.ok(failing(v).some((n) => /damage rises with difficulty/.test(n)), 'easy harder than normal fails');
  v = okEvidence(); v.threats = 4; assert.ok(failing(v, { safe: true }).some((n) => /safe room: contains no enemies/.test(n)), 'quality.safe cannot be used to hide enemies');
  v = okEvidence(); v.threats = 0; assert.deepEqual(failing(v, { safe: true }).filter((n) => /safe room: contains/.test(n)), [], 'a truly empty safe room is fine');
});

test('gateSkip: an invulnerable bot is used, so dying on the way cannot pass a gate; scripted spawns count as threats; the shipped gates hold', () => {
  const m6 = shipped('C1E1M06'); m6.sectors[0].start = 'low';                                          // the ferry ramp starts lowered: the quay's enemies kill a mortal bot, an invulnerable one walks aboard
  assert.ok(gateSkip(parseMap(m6)).some((g) => g.result === 'complete'), 'a ramp that starts open is caught even though a mortal bot dies on the quay');
  const tiny = { format: 1, id: 'T1', version: 1, name: 'Tiny', grid: ['#######', '#.....#', '#######'], doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [5, 1] }], triggers: [{ id: 'wave', when: 'start', do: [{ spawn: { kind: 'gaunt', at: [3, 1] } }] }] };
  assert.equal(threatCount(parseMap(tiny)), 1, 'a map whose only enemy arrives by script still counts as having threats');
  assert.ok(gateSkip(parseMap(tiny)).some((g) => g.result === 'complete'), 'and its ungated exit is caught by the probe (the old probe returned nothing for it)');
  assert.deepEqual(gateSkip(parseMap({ ...tiny, triggers: [] })), [], 'no enemies and no spawns: nothing to gate');
  for (const id of ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08']) assert.ok(gateSkip(parseMap(shipped(id))).every((g) => g.result !== 'complete' && g.result !== 'dead'), id + ': every main exit is gated');
});

test('damage vs difficulty: per map only easy < normal and easy <= hard; the hard-vs-normal trend is judged over the episode (a map where one hit flips the ratio, like M06, does not fail; an episode where difficulty does nothing does)', () => {
  let v = okEvidence(); v.hard.fighter.meanDamage = 20; v.normal.fighter.meanDamage = 82; v.easy.fighter.meanDamage = 10;
  assert.ok(!failing(v).some((n) => /damage rises with difficulty/.test(n)), 'hard well below normal on ONE map is no longer a per-map failure (M06: 36 vs 82 after a fairer Gaunt hit volume)');
  v = okEvidence(); v.hard.fighter.meanDamage = 20; v.easy.fighter.meanDamage = 30; assert.ok(failing(v).some((n) => /damage rises with difficulty/.test(n)), 'but hard easier than easy still fails the map');
  const m06Shape = [{ id: 'a', easy: 8, normal: 14, hard: 60 }, { id: 'b', easy: 36, normal: 82, hard: 36 }, { id: 'c', easy: 12, normal: 35, hard: 70 }];      // 56 / 131 / 166: hard well above normal over the episode although map b alone is inverted
  assert.ok(episodeDifficultyChecks(m06Shape).every((c) => c.ok), 'the trend holds over the episode although one map is inverted');
  assert.ok(episodeDifficultyChecks(m06Shape.map((r) => ({ ...r, hard: r.easy }))).some((c) => !c.ok), 'an episode where hard hurts no more than easy fails');
  assert.ok(episodeDifficultyChecks(m06Shape.map((r) => ({ ...r, hard: Math.round(r.normal * 0.7) }))).some((c) => !c.ok), 'an episode where hard hurts less than normal fails');
  assert.ok(episodeDifficultyChecks([m06Shape[0]]).some((c) => !c.ok), 'one map is not an episode');
});

test('ammo bookkeeping: capacity is counted per type from the entry loadout and every ammo/weapon pickup; fired rounds are counted per type from the fire events', () => {
  const m = parseMap(shipped('C1E1M07')), cap = ammoCapacityBy(m, 'normal');
  const authored = m.entryLoadout.ammo; let r = 0, s = 0, f = 0; for (const e of m.entities) if (e.type === 'pickup') { if (e.kind === 'ammo_rivet') r++; if (e.kind === 'ammo_shell') s++; if (e.kind === 'ammo_flare') f++; }
  assert.equal(cap.rivet, authored.rivet + r * 40, 'rivets: 40 per pickup at normal'); assert.equal(cap.shell, authored.shell + s * 6); assert.equal(cap.flare, authored.flare + f * 4);
  assert.deepEqual(firedBy([{ type: 'fire', weapon: 'flare' }, { type: 'fire', weapon: 'rivet' }, { type: 'fire', weapon: 'rivet' }, { type: 'hurt' }]), { flare: 1, rivet: 2 });
});

test('the degraded-player options really degrade the PLAYER: ammoScale scales ammo pickups only, tremor perturbs fire ticks only, and neither leaks into state when off', () => {
  const map = parseMap(shipped('C1E1M02')), rt = route('C1E1M02');
  const grab = (scale) => { const w = createWorld(map, { seed: 1, ammoScale: scale }); const it = w.pickups.find((p) => p.kind === 'ammo_rivet'); Object.assign(w.player, { x: it.x, z: it.z, y: it.y ?? 0 }); w.player.ammo.rivet = 0; step(w, { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false }); drainEvents(w); return w.player.ammo.rivet; };
  assert.equal(grab(null), 40); assert.equal(grab(0.5), 20, 'half the ammo from a pickup'); assert.equal(grab(1), 40);
  const w0 = createWorld(map, { seed: 1 }); assert.ok(!('ammoScale' in w0), 'no ammoScale field on a normal world (hashes and saves are unchanged)');
  const a = runRoute(map, rt, { seed: 1, maxTicks: 1500 }), b = runRoute(map, rt, { seed: 1, maxTicks: 1500, tremor: 0 }), c = runRoute(map, rt, { seed: 1, maxTicks: 1500, tremor: 0.03 });
  assert.equal(hashWorld(a.world), hashWorld(b.world), 'tremor 0 is exactly the default'); assert.notEqual(hashWorld(a.world), hashWorld(c.world), 'tremor 0.03 changes the run once shots are fired');
});
