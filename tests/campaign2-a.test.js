// PT-037: Campaign 2, Act A THRESHOLD (C2M01 to C2M08): what the act promises and the rules of design/LORE.md and design/CAMPAIGN2.md that a machine can check. The text rules are mechanical on purpose (a banned-phrase
// list, lengths, who may speak); whether the prose is GOOD is the owner's and the polish pass's. Node only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, shippedSrc, shippedMap } from './helpers.js';
import { LOOKS, ENEMIES, FX } from '../src/engine/defs.js';
import { createWorld, step, drainEvents, damageEnemy } from '../src/engine/world.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { runRoute } from '../src/engine/harness.js';

const IDS = ['C2M01', 'C2M02', 'C2M03', 'C2M04', 'C2M05', 'C2M06', 'C2M07', 'C2M08'];
const SRC = Object.fromEntries(IDS.map((id) => [id, shippedSrc(id)]));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });

/** every line of text a player reads on a map */
const lines = (src) => [src.intro?.title, ...(src.intro?.lines ?? []), src.outro, src.objective, ...(src.messages ?? []).map((m) => m.text), ...(src.triggers ?? []).flatMap((t) => (t.do ?? []).map((a) => a.objective)), ...(src.entities ?? []).filter((e) => e.type === 'switch').flatMap((e) => (e.do ?? []).map((a) => a.objective))].filter(Boolean);
const BANNED = [/echoes? of/i, /whispers?/i, /testament/i, /tapestry/i, /symphony/i, /dance of/i, /\bancient\b/i, /eldritch/i, /cosmic/i, /unspeakable/i, /chilling/i, /haunting/i, /\beerie\b/i, /the weight of/i, /silence that speaks/i];

test('Act A is eight maps, all built, in the manifest order, each with a look and the sky of Anselm-Nine', () => {
  const m = MANIFEST.maps.filter((x) => x.campaign === 2 && x.kind === 'main').sort((a, b) => a.order - b.order).slice(0, 8).map((x) => x.id);
  assert.deepEqual(m, IDS);
  for (const id of IDS) { const s = SRC[id]; assert.equal(validateMap(s).ok, true, id); assert.ok(LOOKS[s.atmosphere.look] && s.atmosphere.look !== 'harbour', id + ' names its own look'); assert.equal(s.atmosphere.sky, 'anselm', id); assert.ok(s.intro?.title && s.intro.lines.length === 2 && s.outro, id + ' has an intro and an outro'); }
  assert.equal(new Set(IDS.map((id) => SRC[id].atmosphere.look)).size, 8, 'eight maps, eight looks');
  assert.equal(MANIFEST.maps.find((x) => x.id === 'C2M01').next, 'C2M02'); assert.equal(MANIFEST.maps.find((x) => x.id === 'C1E4M08').next, 'C2M01', 'the Gate Warden leads here');
});

test('the text follows the mechanical rules of LORE.md: no stock phrases, short, and only the speakers the story has', () => {
  const bad = [];
  for (const id of IDS) {
    for (const t of lines(SRC[id])) for (const re of BANNED) if (re.test(t)) bad.push(`${id}: '${t.slice(0, 50)}...' matches ${re}`);
    for (const m of SRC[id].messages) { if (m.text.length > 180) bad.push(`${id} ${m.id}: ${m.text.length} characters`); const n = (m.text.match(/[.!?]/g) ?? []).length, cap = /\b(LOG|LEDGER|PLATE|TALLY|NOTE)\b/.test(m.speaker) ? 6 : m.speaker === 'THE TENDER' ? 5 : 4; if (n > cap) bad.push(`${id} ${m.id}: ${n} sentences (limit ${cap})`); }
  }
  assert.deepEqual(bad, []);
  const VOICES = new Set(['INES', 'HULL', 'THE TENDER', 'A SILENT', 'A SILENT (NOTE)', 'SIGNAL HOUSE']), found = /\b(LOG|LEDGER|PLATE|TALLY|NOTE)\b/;
  for (const id of IDS) for (const m of SRC[id].messages) assert.ok(VOICES.has(m.speaker) || found.test(m.speaker), `${id} ${m.id}: unknown speaker '${m.speaker}'`);
  const sh = IDS.flatMap((id) => SRC[id].messages.filter((m) => m.speaker === 'SIGNAL HOUSE').map((m) => id + ' ' + m.id));
  assert.deepEqual(sh, ['C2M01 start', 'C2M08 static'], 'SIGNAL HOUSE is nearly silent from the Gate on: the call through the Gate on the beach, and one static-washed call at the end of the act (PT-061, the story pass: the operator is never gone from the ear of the player)');
  const tender = IDS.flatMap((id) => SRC[id].messages.filter((m) => m.speaker === 'THE TENDER').map((m) => id));
  assert.deepEqual(tender, ['C2M03'], 'the Tender speaks once in Act A, when she is freed');
});

test('the Tender speaks plainly: no contractions, short words', () => {
  const t = SRC.C2M03.messages.find((m) => m.speaker === 'THE TENDER').text;
  assert.ok(!/\b\w+'(t|s|re|ve|ll|d|m)\b/i.test(t), 'no contractions: ' + t);
});

test('roster variety (CAMPAIGN2.md): from the third map on no creature kind is more than 40% of a map\'s placements, and each map brings a kind the one before did not have or has fewer of', () => {
  const seen = new Set();
  for (const id of IDS) {
    const kinds = {}; let n = 0; for (const e of SRC[id].entities) if (e.type === 'enemy' && !ENEMIES[e.kind].peaceful && !ENEMIES[e.kind].node) { kinds[e.kind] = (kinds[e.kind] ?? 0) + 1; n++; }
    if (id > 'C2M02') for (const [k, c] of Object.entries(kinds)) assert.ok(c / n <= 0.4, `${id}: ${k} is ${(100 * c / n).toFixed(0)}% of ${n}`);
    for (const k of Object.keys(kinds)) seen.add(k);
  }
  assert.ok(['gill', 'bulwark', 'acolyte', 'wardengraft', 'weeping', 'chorister', 'sexton', 'bellhand'].every((k) => seen.has(k)), 'the act uses the whole standing roster of Campaign 1');
});

test('the new pieces are used where the plan says: the Tender and civilians (M03), forks (M04, M07), graves and closets (M05), current (M06), seeds (M07), lifts (M08)', () => {
  assert.ok(SRC.C2M03.entities.filter((e) => e.kind === 'vaelfolk').length === 3, 'three Vael in the cage');
  assert.ok(SRC.C2M04.entities.filter((e) => e.kind === 'resonator').length >= 30); assert.ok(SRC.C2M07.entities.filter((e) => e.kind === 'resonator').length >= 8);
  assert.ok(SRC.C2M05.entities.filter((e) => e.kind === 'grave').length >= 40); assert.ok((SRC.C2M05.closets ?? []).length >= 10);
  assert.ok(SRC.C2M06.fx.some((r) => /[<>^v]/.test(r)), 'currents'); for (const c of ['>', '<', 'v']) assert.ok(SRC.C2M06.fx.some((r) => r.includes(c)), 'flow ' + c);
  assert.equal(SRC.C2M07.entities.filter((e) => e.kind === 'bellnode').length, 8, 'eight seeds'); assert.ok(SRC.C2M07.triggers.filter((t) => Array.isArray(t.when) && t.when.some((q) => /^not:dead:seed/.test(q))).length === 16, 'a warning and a crack for each');
  assert.equal(SRC.C2M08.sectors.length, 2, 'two lifts');
});

test('C2M03: the route that frees the Tender harms no innocent, and the bot never fired on a civilian', () => {
  const map = shippedMap('C2M03'), route = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes/C2M03.main.route.json'), 'utf8'));
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(map, route, { seed: 1, difficulty }); assert.equal(r.result, 'complete', difficulty); assert.equal(r.world.stats.innocents ?? 0, 0, difficulty + ': no innocent harmed'); assert.ok(r.world.endStats.innocents === undefined); }
});

test('not: is the opposite of any condition (and only of those the format allows)', () => {
  const src = { format: 1, id: 'N1', version: 1, name: 'Not', cellSize: 2, grid: ['######', '#....#', '#....#', '######'], doors: [], secrets: [], messages: [{ id: 'm', at: [1, 1], radius: 0.1, text: 'x' }],
    entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [4, 1] }, { type: 'enemy', kind: 'bellnode', at: [3, 2], group: 'seed' }],
    triggers: [{ id: 'cracks', when: ['time:1', 'not:dead:seed'], do: [{ message: 'm' }] }] };
  assert.equal(validateMap(src).ok, true, JSON.stringify(validateMap(src).errors));
  const run = (kill) => { const w = createWorld(parseMap(src), { seed: 1, difficulty: 'normal' }); if (kill) damageEnemy(w, w.enemies[0], 9999); for (let i = 0; i < 120; i++) { step(w, idle()); drainEvents(w); } return w.triggerState.cracks.fired; };
  assert.equal(run(false), true, 'the seed is alive at 1 s: the trigger fires'); assert.equal(run(true), false, 'the seed was broken first: it never does');
  for (const bad of ['not:enter', 'not:start', 'not:not:dead:seed']) { const s2 = JSON.parse(JSON.stringify(src)); s2.triggers[0].when = ['time:1', bad]; s2.triggers[0].at = [1, 1]; assert.equal(validateMap(s2).ok, false, bad); }
});

test('C2M07: a seed left alone cracks and a bell-bearer steps out of it; a seed broken first gives nothing (the real map)', () => {
  const map = shippedMap('C2M07'), src = SRC.C2M07, crack0 = src.triggers.find((t) => t.id === 'crack0'), t0 = Number(crack0.when[0].slice(5));
  const run = (breakSeed) => {
    const w = createWorld(map, { seed: 3, difficulty: 'normal' }); w.player.hp = 1e9; const seed = w.enemies.find((e) => e.group === 'seed0'), n0 = w.enemies.length;
    if (breakSeed) damageEnemy(w, seed, 99999);
    for (let i = 0; i < Math.round((t0 + 3) * 60); i++) { step(w, idle()); drainEvents(w); }
    return { spawned: w.enemies.length - n0, fired: w.triggerState.crack0.fired, warned: w.triggerState.warn0.fired };
  };
  const left = run(false), broken = run(true);
  assert.equal(left.fired, true); assert.equal(left.spawned, 1); assert.equal(left.warned, true);
  assert.equal(broken.fired, false); assert.equal(broken.spawned, 0); assert.equal(broken.warned, false, 'no warning for a bell that is already dead');
});

test('the Act A tiles use only the Campaign 2 skins and the old ones, nothing unknown, and every map has at least five distinct skins', () => {
  for (const id of IDS) { const m = shippedMap(id); const used = new Set(); for (let z = 0; z < m.h; z++) for (let x = 0; x < m.w; x++) used.add(m.tile(x, z)); assert.ok(used.size >= 6, `${id}: ${used.size} tile kinds`); }
  assert.equal(FX['>'].flow[0], 1); assert.ok(LOOKS.threshold && LOOKS.ascent);
});
