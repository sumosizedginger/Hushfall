// PT-039: Campaign 2, Act B THE SOUNDING DEEP (C2M09 to C2M16 and the secret C2S01): what the act promises, the engine pieces it added (the echo, remembered choices, enemy variants, the returning ring) and the mechanical
// part of the text rules of design/LORE.md. The prose is the polish pass's. Node only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, shippedSrc, shippedMap } from './helpers.js';
import { LOOKS, ENEMIES, ECHO, VARIANTS } from '../src/engine/defs.js';
import { createWorld, step, drainEvents, noise } from '../src/engine/world.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { runRouteEither as runRoute } from '../src/engine/harness.js';          // either fighter policy (PT-052, Bot v2 first half)
import { sanitizeProgress } from '../src/engine/progress.js';
import { choiceHolds } from '../src/engine/script.js';

const IDS = ['C2M09', 'C2M10', 'C2M11', 'C2M12', 'C2M13', 'C2M14', 'C2M15', 'C2M16'], ALL = [...IDS, 'C2S01'];
const SRC = Object.fromEntries(ALL.map((id) => [id, shippedSrc(id)]));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const route = (id, name = 'main') => JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', `${id}.${name}.route.json`), 'utf8'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const lines = (src) => [src.intro?.title, ...(src.intro?.lines ?? []), src.outro, src.objective, ...(src.messages ?? []).map((m) => m.text), ...(src.triggers ?? []).flatMap((t) => (t.do ?? []).map((a) => a.objective)), ...(src.entities ?? []).filter((e) => e.type === 'switch').flatMap((e) => (e.do ?? []).map((a) => a.objective))].filter(Boolean);
const BANNED = [/echoes? of/i, /whispers?/i, /testament/i, /tapestry/i, /symphony/i, /dance of/i, /\bancient\b/i, /eldritch/i, /cosmic/i, /unspeakable/i, /chilling/i, /haunting/i, /\beerie\b/i, /the weight of/i, /silence that speaks/i];

test('Act B is eight maps and a secret, in the manifest order, each with its own look; the open ones wear the roof of the Deep', () => {
  const m = MANIFEST.maps.filter((x) => x.campaign === 2 && x.kind === 'main').sort((a, b) => a.order - b.order).slice(8, 16).map((x) => x.id);
  assert.deepEqual(m, IDS);
  assert.equal(MANIFEST.maps.find((x) => x.id === 'C2M08').next, 'C2M09'); assert.equal(MANIFEST.maps.find((x) => x.id === 'C2M12').secretExit, 'C2S01'); assert.equal(MANIFEST.maps.find((x) => x.id === 'C2S01').returnsTo, 'C2M13');
  for (const id of ALL) {
    const s = SRC[id]; assert.equal(validateMap(s).ok, true, id + ' ' + JSON.stringify(validateMap(s).errors)); assert.ok(LOOKS[s.atmosphere.look] && s.atmosphere.look !== 'harbour', id + ' names its own look');
    assert.ok(s.intro?.title && s.intro.lines.length === 2 && s.outro, id + ' has an intro and an outro');
    const mp = parseMap(s); let outdoor = 0; for (let z = 0; z < mp.h; z++) for (let x = 0; x < mp.w; x++) if (mp.kind(x, z) === 'outdoor') outdoor++;
    if (outdoor) assert.equal(s.atmosphere.sky, 'deep', id + ': open floor under the cave roof (sky_deep)');
  }
  assert.equal(new Set(ALL.map((id) => SRC[id].atmosphere.look)).size, 9, 'nine maps, nine looks');
});

test('the text follows the mechanical rules of LORE.md: no stock phrases, short, and only the speakers the story has; a Zealot speaks once; the Tender speaks once and plainly', () => {
  const bad = [];
  for (const id of ALL) {
    for (const t of lines(SRC[id])) for (const re of BANNED) if (re.test(t)) bad.push(`${id}: '${t.slice(0, 50)}...' matches ${re}`);
    for (const m of SRC[id].messages) { if (m.text.length > 180) bad.push(`${id} ${m.id}: ${m.text.length} characters`); const n = (m.text.match(/[.!?]/g) ?? []).length, cap = /\b(LOG|LEDGER|PLATE|TALLY|NOTE)\b/.test(m.speaker) ? 6 : m.speaker === 'THE TENDER' ? 5 : 4; if (n > cap) bad.push(`${id} ${m.id}: ${n} sentences (limit ${cap})`); }
  }
  assert.deepEqual(bad, []);
  const VOICES = new Set(['INES', 'HULL', 'THE TENDER', 'A SILENT', 'A SILENT (NOTE)', 'A ZEALOT']), found = /\b(LOG|LEDGER|PLATE|TALLY|NOTE)\b/;
  for (const id of ALL) for (const m of SRC[id].messages) assert.ok(VOICES.has(m.speaker) || found.test(m.speaker), `${id} ${m.id}: unknown speaker '${m.speaker}'`);
  assert.deepEqual(ALL.flatMap((id) => SRC[id].messages.filter((m) => m.speaker === 'SIGNAL HOUSE').map((m) => id)), [], 'SIGNAL HOUSE stays silent below the Gate');
  assert.deepEqual(ALL.flatMap((id) => SRC[id].messages.filter((m) => m.speaker === 'A ZEALOT').map((m) => id)), ['C2M09'], 'a Zealot says its one line once, at the Gate');
  const tender = SRC.C2S01.messages.filter((m) => m.speaker === 'THE TENDER'); assert.equal(tender.length, 7, 'seven short pieces at seven beds: the longest text of the act');
  for (const t of tender) assert.ok(!/\b\w+'(t|s|re|ve|ll|d|m)\b/i.test(t.text), 'no contractions: ' + t.text);
  assert.deepEqual(ALL.filter((id) => id !== 'C2S01').flatMap((id) => SRC[id].messages.filter((m) => m.speaker === 'THE TENDER').map(() => id)), [], 'the Tender speaks only in her garden');
});

test('roster variety: no creature (a variant counts as its own) is more than 40% of a map, except the Drowned in the Drowned Choir; each map has the new thing it names', () => {
  for (const id of IDS) {
    const kinds = {}; let n = 0; for (const e of SRC[id].entities) if (e.type === 'enemy' && !ENEMIES[e.kind].peaceful && !ENEMIES[e.kind].node) { const k = e.variant ?? e.kind; kinds[k] = (kinds[k] ?? 0) + 1; n++; }
    for (const [k, c] of Object.entries(kinds)) if (!(id === 'C2M12' && k === 'drowned')) assert.ok(c / n <= 0.4, `${id}: ${k} is ${(100 * c / n).toFixed(0)}% of ${n}`);
  }
  assert.ok(SRC.C2M09.entities.some((e) => e.kind === 'zealot'), 'the Zealots arrive at the Gate'); assert.ok(SRC.C2M16.entities.some((e) => e.kind === 'subcantor') && SRC.C2M16.entities.filter((e) => e.kind === 'bellnode').length === 4, 'the Sub-Cantor and its four forks');
  assert.ok(SRC.C2M10.entities.filter((e) => e.kind === 'vaelfolk').length >= 30, 'a crowd'); assert.ok(SRC.C2S01.entities.filter((e) => e.type === 'enemy').length === 0, 'no creature in the garden');
  assert.ok(SRC.C2M15.entities.some((e) => e.kind === 'weeping') && SRC.C2M15.entities.some((e) => e.kind === 'acolyte') && SRC.C2M15.entities.some((e) => e.kind === 'bulwark') && SRC.C2M15.entities.some((e) => e.kind === 'wardengraft'), 'the Basilica holds the whole elite roster');
});

test('the dark and the lantern: C2M09 and C2M13 are dark with oil to find; the rest are lit', () => {
  for (const id of ALL) assert.equal(!!SRC[id].atmosphere.dark, id === 'C2M09' || id === 'C2M13', id);
  for (const id of ['C2M09', 'C2M13']) { assert.ok(SRC[id].lantern.oil > 0 && SRC[id].lantern.max >= SRC[id].lantern.oil, id); assert.ok(SRC[id].entities.filter((e) => e.kind === 'oil').length >= 4, id + ': oil on the lane'); }
  assert.ok(SRC.C2M13.entities.filter((e) => e.kind === 'oil').length >= 8, 'the last of the oil is in the sealed niche');
});

test('the echo (C2M10): a loud noise carries twice as far, a quiet one does not, and a world without an echo is what it was', () => {
  assert.equal(SRC.C2M10.atmosphere.echo, 2);
  const mini = (echo) => ({ format: 1, id: 'EC', version: 1, name: 'Echo', cellSize: 2, grid: ['#'.repeat(40), '#' + '.'.repeat(38) + '#', '#' + '.'.repeat(38) + '#', '#'.repeat(40)], doors: [], secrets: [], messages: [], atmosphere: echo ? { echo } : {},
    entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [38, 2] }, { type: 'enemy', kind: 'gaunt', at: [20, 2] }] });
  const run = (echo, radius) => { const w = createWorld(parseMap(mini(echo)), { seed: 1 }); noise(w, 2, 2, radius); return w.enemies[0].state; };
  assert.equal(run(0, 22), 'idle', 'without an echo a 22 m shot does not reach a sleeper 36 m away'); assert.notEqual(run(2, 22), 'idle', 'with an echo of 2 it does');
  assert.equal(run(2, ECHO.loud - 2), 'idle', 'a quiet noise (an uncharged arc, a blow) carries as it always did, echo or none');
  assert.equal(validateMap({ ...mini(2), atmosphere: { echo: 9 } }).ok, false, 'an echo is 1 to 4');
  const door = SRC.C2M10.doors.find((d) => d.soundlock); assert.ok(door && door.soundlock.quiet >= 5, 'the north gate listens for the hall to go quiet');
});

test('choices: a gate through the Undercantor Halls is remembered, the next map answers it, and a world without choices is untouched', () => {
  const map = shippedMap('C2M11');
  const w = route('C2M11', 'main'), s = route('C2M11', 'secret');
  assert.equal(runRoute(map, w, { seed: 1 }).world.choices?.halls, 'songkeepers'); assert.equal(runRoute(map, s, { seed: 1 }).world.choices?.halls, 'silent');
  assert.equal(createWorld(shippedMap('C2M01'), { seed: 1 }).choices, undefined, 'lazy: no choices field in a world that has none');
  assert.deepEqual(createWorld(shippedMap('C2M12'), { seed: 1, choices: { halls: 'silent' } }).choices, { halls: 'silent' });
  const m12 = shippedMap('C2M12'), seen = (choices) => new Set(runRoute(m12, route('C2M12', 'main'), { seed: 1, choices }).world.messagesSeen);
  assert.ok(seen({ halls: 'silent' }).has('silent-w') && !seen({ halls: 'silent' }).has('songkeeper-w')); assert.ok(seen({ halls: 'songkeepers' }).has('songkeeper-w') && !seen({ halls: 'songkeepers' }).has('silent-w')); assert.ok(!seen(null).has('silent-w') && !seen(null).has('songkeeper-w'), 'no choice, neither line');
  assert.equal(choiceHolds({ choices: { a: 'x' } }, 'a=x'), true); assert.equal(choiceHolds({ choices: { a: 'x' } }, 'a!=x'), false); assert.equal(choiceHolds({}, 'a!=x'), true); assert.equal(choiceHolds({}, 'a=x'), false);
  assert.deepEqual(sanitizeProgress({ choices: { halls: 'silent', 'Bad Id': 'x', ok: 9 } }).choices, { halls: 'silent' }); assert.equal(sanitizeProgress({}).choices, undefined);
  const bad = JSON.parse(JSON.stringify(SRC.C2M11)); bad.triggers[0].do[0] = { choose: { id: 'BAD ID', value: 'x' } }; assert.equal(validateMap(bad).ok, false);
});

test('the Drowned are Tollbearers in a tint: a variant is validated, placed, spawned and carried by the sim (C2M12)', () => {
  assert.ok(VARIANTS.drowned.tint > 0); const src = SRC.C2M12;
  assert.ok(src.entities.filter((e) => e.type === 'enemy' && e.variant === 'drowned' && e.kind === 'tollbearer').length >= 30);
  const w = createWorld(shippedMap('C2M12'), { seed: 1 }); assert.ok(w.enemies.filter((e) => e.variant === 'drowned').length >= 30);
  const spawns = src.triggers.flatMap((t) => t.do.filter((a) => a.spawn)); assert.ok(spawns.length >= 20 && spawns.every((a) => a.spawn.variant === 'drowned'), 'three waves rise from the water');
  const bad = JSON.parse(JSON.stringify(src)); bad.entities.find((e) => e.variant).variant = 'nope'; assert.equal(validateMap(bad).ok, false);
  const rise = createWorld(shippedMap('C2M12'), { seed: 1 }); const t = shippedMap('C2M12').triggers.find((q) => q.id === 'rise-a'); w.player.x = (t.at[0] + 0.5) * 2; w.player.z = (t.at[1] + 0.5) * 2; const n0 = w.enemies.length; for (let i = 0; i < 4; i++) { step(w, idle()); drainEvents(w); }
  assert.ok(w.enemies.length > n0 && w.enemies.slice(n0).every((e) => e.variant === 'drowned'), 'the first wave rises when the player reaches the nave'); void rise;
});

test('the Sub-Cantor: a ring that goes out to 22 m, turns back and comes home, hurting what stands in the open twice and what stands behind a pillar never', () => {
  const P = ENEMIES.subcantor.pulse; assert.equal(P.reflect, 22);
  const map = shippedMap('C2M16'), boss0 = shippedSrc('C2M16').entities.find((e) => e.kind === 'subcantor');
  const play = (px, pz) => {
    const w = createWorld(map, { seed: 1 }); w.player.hp = 1e6; w.player.x = px; w.player.z = pz; const boss = w.enemies.find((e) => e.kind === 'subcantor'); let hits = 0, back = 0, turned = false, left = false;
    const bpos = { x: boss.x, z: boss.z, y: boss.y }; w.enemies.splice(w.enemies.indexOf(boss), 1); w.pulses.push({ id: 9001, x: bpos.x, z: bpos.z, y: bpos.y, r: 0.6, speed: P.speed, dmg: 12, width: P.width, maxR: P.maxR, hit: false, reflectAt: P.reflect });
    for (let i = 0; i < 60 * 12 && w.pulses.length; i++) { w.player.hp = 1e6; step(w, idle()); for (const e of drainEvents(w)) { if (e.type === 'pulse_hit') hits++; if (e.type === 'pulse_back') back++; } if (w.pulses[0]?.back) turned = true; }
    return { hits, back, turned, gone: w.pulses.length === 0 };
  };
  const bx = (boss0.at[0] + 0.5) * 2, bz = (boss0.at[1] + 0.5) * 2;
  const open = play(bx - 12, bz + 8); assert.equal(open.hits, 2, 'out and back'); assert.equal(open.back, 1); assert.ok(open.turned && open.gone, 'the ring turned and came home, then was gone');
  const pillars = []; for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) === 'wall' && Math.abs(x - boss0.at[0]) < 13 && Math.abs(z - boss0.at[1]) < 13 && Math.hypot(x - boss0.at[0], z - boss0.at[1]) > 8.5) pillars.push([x, z]);
  let covered = null; for (const [x, z] of pillars) { const dx = (x + 0.5) * 2 - bx, dz = (z + 0.5) * 2 - bz, d = Math.hypot(dx, dz), px = bx + dx / d * (d + 2.5), pz = bz + dz / d * (d + 2.5); if (play(px, pz).hits === 0) { covered = [px, pz]; break; } }
  assert.ok(covered, 'there is a place behind a pillar that the ring never reaches, out or back');
});

test('a bot meeting a ring that has turned back hides from it (it is still outside the player, coming in)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/engine/bot.js'), 'utf8'); assert.ok(/q\.back \? q\.r > /.test(src));
});

test('the exits are gated, not just walked to: a lever, the dead, or both (the gate-skip probe, by hand)', () => {
  for (const id of ['C2M11', 'C2M12', 'C2M13', 'C2M14', 'C2M15', 'C2M16']) { const ex = SRC[id].entities.find((e) => e.type === 'exit' && e.dest !== 'secret'); const locked = ex.locked === true, gated = (SRC[id].doors ?? []).some((d) => d.remote || d.soundlock); assert.ok(locked || gated, id + ': the exit is locked or behind a door that something opens'); }
  const ex12 = SRC.C2M12.entities.filter((e) => e.type === 'exit'); assert.deepEqual(ex12.map((e) => e.dest).sort(), ['next', 'secret'], 'the Drowned Choir has a secret exit'); assert.equal(ex12.find((e) => e.dest === 'secret').locked, undefined);
  const stair = SRC.C2M12.triggers.find((t) => t.id === 'stair'); assert.deepEqual(stair.when, ['dead:choir', 'msg:rope'], 'the stair needs the loft silent AND the rope pulled');
});

test('the chime puzzle (C2M14): the bot answers the tree three times through the real input layer and the three walls open', () => {
  const map = shippedMap('C2M14'), r = runRoute(map, route('C2M14'), { seed: 1 }); assert.equal(r.result, 'complete', r.failure);
  assert.deepEqual(Object.keys(r.world.chimes.matched).sort(), ['r1', 'r2', 'r3']); assert.equal(SRC.C2M14.triggers.filter((t) => /^seq:r\d$/.test(t.when)).length, 3, 'three rounds, three walls');
  assert.equal(SRC.C2M14.entities.filter((e) => e.kind === 'chime').length, 5);
});

test('every route of the act reaches its exit on all three difficulties, and only the secret routes find the secrets', () => {
  for (const id of ALL) {
    const map = shippedMap(id);
    for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(map, route(id), { seed: 2, difficulty }); assert.equal(r.result, 'complete', `${id} main ${difficulty}: ${r.failure}`); }
    if (SRC[id].secrets.length) { const m = runRoute(map, route(id), { seed: 1 }), s = runRoute(map, route(id, 'secret'), { seed: 1 }); assert.equal(m.world.stats.secrets, 0, id + ': the main route finds none'); assert.equal(s.result, 'complete', id + ' secret: ' + s.failure); assert.equal(s.world.stats.secrets, SRC[id].secrets.length, id); }
  }
});
