// PT-083 U3 to U7, Y1, Y3, Y5: the settings in tabs, a checkpoint at the right moment, the map select's records, the text every screen says.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SETTINGS_TABS, defaultSettings } from '../src/game/settings.js';
import { earnsCheckpoint, safeToSave, CHECKPOINT } from '../src/game/checkpoints.js';
import { defaultProfile, recordFinish, challengesOf, sanitizeProfile, mapRows, CHALLENGES } from '../src/game/profile.js';
import { weaponIcon } from '../src/game/wheel.js';
import { WEAPONS, SLOT_KEYS, MELEE_ORDER } from '../src/engine/defs.js';
import { ROOT, flatSource } from './helpers.js';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('U4: every control of the panel sits in a tab, every tab has its Defaults button, and every key a tab resets is a setting', () => {
  const box = html.slice(html.indexOf('<details id="settings-box">'), html.indexOf('</details>', html.indexOf('<div class="set-tab" data-tab="gameplay">')));
  const inPanel = [...box.matchAll(/id="(set-[a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(inPanel.length >= 40, 'the panel: ' + inPanel.length);
  for (const id of [...html.matchAll(/id="(set-[a-z-]+)"/g)].map((m) => m[1]))
    if (id !== 'set-fov-val') assert.ok(inPanel.includes(id), id + ' is outside the panel');
  for (const tab of Object.keys(SETTINGS_TABS)) {
    assert.ok(html.includes(`class="set-tab-btn`) && html.includes(`data-tab="${tab}"`), tab);
    assert.ok(html.includes(`<button class="set-defaults" data-tab="${tab}">`), tab + ' defaults');
  }
  const d = defaultSettings();
  for (const { keys } of Object.values(SETTINGS_TABS)) for (const k of keys) assert.ok(k in d, k);
  assert.ok(html.indexOf('id="controls-box"') > html.indexOf('data-tab="controls"'), 'the key list is in the Controls tab');
});

test('U5: a gate, a key, a silenced bell or a secret earns a checkpoint; a shut door, a walk and a breathing gate do not', () => {
  assert.ok(earnsCheckpoint([{ type: 'door_open', cx: 1, cz: 1 }]));
  assert.ok(earnsCheckpoint([{ type: 'pickup', kind: 'key_brass' }]));
  assert.ok(earnsCheckpoint([{ type: 'node_severed' }]));
  assert.ok(earnsCheckpoint([{ type: 'secret', id: 's' }]));
  assert.ok(!earnsCheckpoint([{ type: 'door_open', breath: true }]));
  assert.ok(!earnsCheckpoint([{ type: 'door_open', secret: true }]));
  assert.ok(!earnsCheckpoint([{ type: 'pickup', kind: 'ammo_shell' }]));
  assert.ok(!earnsCheckpoint([]));
});

test('U5: never in a fight, never nearly dead, never in the air, never on the range, never twice in a moment', () => {
  const at = (over = {}, enemies = []) => ({ time: 100, status: 'playing', map: {}, player: { hp: 80, x: 0, z: 0, ...over }, enemies });
  assert.ok(safeToSave(at(), 0));
  assert.ok(!safeToSave(at({ hp: CHECKPOINT.minHp - 1 }), 0), 'nearly dead');
  assert.ok(!safeToSave(at({ air: {} }), 0), 'in the air');
  assert.ok(!safeToSave(at(), 100 - CHECKPOINT.every + 1), 'too soon');
  assert.ok(!safeToSave(at({}, [{ state: 'chase', x: 2, z: 2 }]), 0), 'something is on you');
  assert.ok(safeToSave(at({}, [{ state: 'chase', x: 50, z: 50 }]), 0), 'it is far off');
  assert.ok(
    safeToSave(
      at({}, [
        { state: 'dead', x: 1, z: 1 },
        { state: 'idle', x: 1, z: 1 },
        { state: 'calm', x: 1, z: 1 },
      ]),
      0,
    ),
    'the dead, the asleep and the peaceful do not count',
  );
  assert.ok(!safeToSave({ ...at(), map: { range: true } }, 0), 'not on the range');
  const main = flatSource('src/game/main.js');
  assert.ok(main.includes("store.clear('check')"), 'a checkpoint belongs to one attempt');
  assert.ok(main.includes("CONTINUE_SLOTS = ['quick', 'check', 'auto']"), 'Continue takes the newest of them');
  assert.ok(html.includes('id="btn-dead-check"'));
});

test('Y1, Y3: a run keeps its best: rank, time, secrets; the challenges it met; nothing gets worse', () => {
  const end = (o = {}) => ({ time: 300, kills: 40, secrets: 1, damageTaken: 10, total: { enemies: 40, secrets: 2 }, ...o });
  let p = recordFinish(defaultProfile(), 'M', 'normal', { end: end(), rank: 'A', par: 200, docs: ['d1'] });
  let b = p.maps.M.byDiff.normal;
  assert.equal(b.rank, 'A');
  assert.deepEqual(b.done, { allKills: true });
  p = recordFinish(p, 'M', 'normal', { end: end({ time: 150, kills: 3, secrets: 2, damageTaken: 0 }), rank: 'C', par: 200, docs: ['d1', 'd2'] });
  b = p.maps.M.byDiff.normal;
  assert.equal(b.rank, 'A', 'the rank stays');
  assert.equal(b.time, 150, 'the time improves');
  assert.equal(b.kills, 40);
  assert.equal(b.secrets, 2);
  assert.deepEqual(Object.keys(b.done).sort(), ['allKills', 'allSecrets', 'noDamage', 'underPar']);
  assert.deepEqual(p.maps.M.docs, ['d1', 'd2']);
  p = recordFinish(p, 'M', 'hard', { end: end(), rank: 'S', par: 0 });
  assert.equal(p.maps.M.byDiff.normal.rank, 'A', 'each difficulty on its own');
  assert.equal(p.maps.M.byDiff.hard.rank, 'S');
  assert.deepEqual(challengesOf(end({ total: { enemies: 0, secrets: 0 }, kills: 0, secrets: 0 }), 0), {}, 'a map with no creatures and no par proves nothing');
});

test('Y1, Y5: the map select lists only what was finished, in campaign order, with its records and its documents', () => {
  const manifest = {
    campaigns: [
      { id: 1, name: 'One', episodes: [{ episode: 1, title: 'Port Marrow' }] },
      { id: 2, name: 'The Long Descent' },
    ],
    maps: [
      { id: 'A', campaign: 1, episode: 1 },
      { id: 'B', campaign: 1, episode: 1 },
      { id: 'C', campaign: 2, episode: null },
    ],
  };
  const maps = {
    A: {
      name: 'Aye',
      par: { time: 125 },
      secrets: [1, 2],
      messages: [
        { id: 'd', speaker: "PILOT'S LOG" },
        { id: 'v', speaker: 'INES' },
      ],
    },
    B: { name: 'Bee', secrets: [], messages: [] },
    C: { name: 'See', secrets: [], messages: [] },
  };
  let p = recordFinish(defaultProfile(), 'C', 'easy', {
    end: { time: 61, kills: 1, secrets: 0, damageTaken: 5, total: { enemies: 1, secrets: 0 } },
    rank: 'B',
    par: 0,
  });
  p = recordFinish(p, 'A', 'hard', {
    end: { time: 100, kills: 1, secrets: 2, damageTaken: 0, total: { enemies: 1, secrets: 2 } },
    rank: 'S',
    par: 125,
    docs: ['d'],
  });
  const doc = (s) => /LOG/.test(s),
    g = mapRows(manifest, maps, p, doc);
  assert.deepEqual(
    g.map((x) => x.title),
    ['Port Marrow', 'The Long Descent'],
  );
  assert.deepEqual(
    g[0].rows.map((r) => r.id),
    ['A'],
    'not the one not finished',
  );
  const a = g[0].rows[0];
  assert.equal(a.par, '2:05');
  assert.deepEqual(a.docs, { found: 1, total: 1 });
  assert.equal(a.diffs.easy, null);
  assert.equal(a.diffs.hard.time, '1:40');
  assert.equal(a.diffs.hard.done.length, 4);
  assert.ok(a.diffs.hard.done.includes(CHALLENGES.noDamage));
});

test('a damaged profile falls back to what is sound', () => {
  assert.deepEqual(sanitizeProfile(null), defaultProfile());
  assert.deepEqual(sanitizeProfile({ version: 9, maps: {} }), defaultProfile());
  const s = sanitizeProfile({
    version: 1,
    maps: { A: { byDiff: { easy: { rank: 'Z', time: -1, kills: 'x', secrets: 1, done: { noDamage: true, bad: true } }, odd: {} }, docs: ['d', 3] }, B: 7 },
  });
  assert.equal(s.maps.A.byDiff.easy.rank, 'C');
  assert.equal(s.maps.A.byDiff.easy.time, 0);
  assert.deepEqual(s.maps.A.byDiff.easy.done, { noDamage: true });
  assert.deepEqual(s.maps.A.docs, ['d']);
  assert.equal(s.maps.B, undefined);
  assert.equal(s.maps.A.byDiff.odd, undefined);
});

test('U3: every gun and melee weapon has an icon for the HUD, and the small print grows with the window', () => {
  for (const id of [...SLOT_KEYS.filter((k) => k !== 'melee' && WEAPONS[k]), ...MELEE_ORDER]) assert.ok(weaponIcon(id).length > 10, id);
  assert.ok(/#objective\{[^}]*font-size:clamp\(15px,1\.75vh,20px\)/.test(html));
  assert.ok(/#hud-weapons u\{/.test(html), 'an ammunition bar under each');
});

test('U7: no screen of the game says anything meant for its makers', () => {
  const texts = [
    html,
    ...['ui', 'main', 'journal', 'record', 'bestiary', 'itemhelp', 'difficulty', 'firstrun', 'hints', 'credits', 'ending'].map((f) =>
      fs.readFileSync(path.join(ROOT, 'src/game', f + '.js'), 'utf8'),
    ),
  ];
  const bad = [/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /\bPT-\d{3}\b/, /\blorem\b/i, /\bplaceholder text\b/i, /\bTBD\b/];
  for (const t of texts)
    for (const r of bad) assert.ok(!r.test(t), String(r) + ': ' + (t.match(r)?.input ?? '').slice(Math.max(0, t.search(r) - 40), t.search(r) + 60));
});
