// PT-071 (R18 round 0, the outside reader's story revision directive, Revision 2.0): what the revision may not touch, and the continuity fixes it asked for, held by tests.
// PRIORITY 0 of the directive lists the lines that are protected from rewriting; this holds each of them (a verified continuity conflict is the only reason to change one, and then this test changes with a reason in the ledger,
// design/story/LEDGER_PASS3.md). The rest are the verified fixes of PRIORITY 1 to 11 so they cannot creep back.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { allText } from '../tools/dev/story-stats.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const rows = allText(), flat = (t) => t.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
const said = (line) => rows.some((r) => flat(r.text).includes(flat(line)));
const of = (map, id) => rows.find((r) => r.map === map && r.id === id);
const maps = (re) => rows.filter((r) => re.test(r.text)).map((r) => r.map);

const PROTECTED = [
  'Something is wearing them.', 'They take people. Then they file them.', 'Fish keep. People will too.',
  "I can tell you where things are. I can't tell you what is standing in them.", 'I cannot say it does. I keep it lit.', 'Thank you, Dad. I will keep it lit.',
  'Somebody here had that courtesy.', 'I was not made to carry this. I asked for it.', 'It was a good market. I did not buy anything.',
  'You walk as if nothing has asked you a question.', 'I will not tell you to stop it. I will tell you that it is tired.', 'The first time the Song has been one I could repeat.',
  "Haul, hold, chock, fit, float. That's a launch.", 'The lamp is lit and the tea is cold.', 'Do not make it suffer: it has been afraid for a long time.',
  'I will not thank you and I do not blame you.', 'It has the voice right and the ferry wrong.', 'The Hive copied the lamps and could not copy the light.',
  'I will carry it anyway.', 'I cannot hear it. I never could. I only ever hear what it does to them.', 'A door is held from one side or the other. I am on this side of it.',
  'There is nobody else. I said I would keep it lit.', 'Somebody should be listening.', 'It is not the Hush.',
  'That is a great deal of words for someone who is not here to hear the answer.', 'I am not going to look for a date.',
  '212 received, 424 processed', 'KEPT AS COPIES: 213', 'Tonight there is a third light, on the bell tower. It is teal, and nobody lit it.',
  'The second is the fog-bell on the north pier, rung on the ninth stroke of the tide table.', 'Warden Calder kept both. His daughter keeps them now.',
];

test('the protected lines of the directive are all still in the story, word for word', () => {
  const gone = PROTECTED.filter((l) => !said(l)); assert.deepEqual(gone, [], 'a protected line was changed or lost');
});

test('PRIORITY 1: bells are grown, the continuity names real places, the plate in the Hive is a different plate with the same figures', () => {
  assert.deepEqual(maps(/\bBELLS CAST\b/i), [], 'the Vael do not cast bells'); assert.ok(said('311 BELLS GROWN. 311 HUNG. FOUR SPARE.'), 'the figures are kept');
  assert.deepEqual(maps(/fire-?base/i), [], '"the first fire-base" named no place in the story');
  assert.ok(said('The figures match the plate in the Hive-Song gorge. None of them has moved.'));
  assert.ok(rows.some((r) => r.map === 'C2M17' && /OWED 52,310\. SUNG 49,715/.test(r.text)), 'the plate in the gorge exists');
  const sheet = fs.readFileSync(path.join(ROOT, 'design/story/CONTINUITY.md'), 'utf8');
  assert.match(sheet, /Brine Gate and the Rail Yard repeat/, 'the sheet names the maps that repeat the Warden-Graft'); assert.ok(!/Pump Cathedral and the Rail Yard repeat/.test(sheet));
  assert.match(sheet, /Cantor Acolyte/, 'the tall one with the wheel of bells is the Cantor Acolyte');
  assert.ok(!/ it is the Resonant\b/i.test(sheet.split('Cantor Acolyte')[1]?.slice(0, 400) ?? ''), 'it is not the Resonant');
});

test('PRIORITY 2: the father states what he saw and what he wonders, separately; the hearing rule is written down', () => {
  assert.ok(said('Ines hears the bells, and she does not hear this.')); assert.ok(said('whether the ear I damaged is why. I cannot know.'));
  assert.ok(!said('Ines hears none of it: the ear I damaged by accident may be the best thing I ever did.'), 'the old sentence stated a cause as fact');
  const lore = fs.readFileSync(path.join(ROOT, 'design/LORE.md'), 'utf8'), sheet = fs.readFileSync(path.join(ROOT, 'design/story/CONTINUITY.md'), 'utf8');
  assert.match(lore, /Ines hears ordinary sound/); assert.match(sheet, /What Ines can hear/);
  for (const [map, id] of [['C2M08', 'spire']]) assert.ok(!/and a sound\./.test(of(map, id)?.text ?? ''), 'the shaft is felt in the rail, not heard as the Hush');
  for (const m of ['C2M25', 'C2M26']) assert.ok(!/a sound that is not a sound|a sound at the end of it/.test(rows.find((r) => r.map === m && r.ch === 'outro').text), m + ' outro');
});

test('PRIORITY 3 and 4: the radio has rules, and the operator says only what her sources give her', () => {
  assert.ok(/conductor was the hum I was riding/.test(of('C2M16', 'last-call').text), 'why the line ends at the Heart');
  const set = of('C2M30', 'set'), gate = of('C2M30', 'gate'); assert.ok(set && gate && rows.indexOf(set) < rows.indexOf(gate), 'the set wakes before she speaks, and says what carries it');
  assert.match(of('C1E1M07', 'lamp-lit').text, /^The lighthouse lamp is lit/);
  const early = rows.filter((r) => r.ch === 'message' && r.speaker === 'SIGNAL HOUSE' && /^C1E[12]/.test(r.map));
  for (const r of early) assert.ok(!/\b(bellhands?|hunting parties|feeders|awake|working)\b/i.test(r.text), `${r.map}/${r.id}: the operator names what stands in a place (contents): "${r.text.slice(0, 70)}"`);
  const sheet = fs.readFileSync(path.join(ROOT, 'design/story/CONTINUITY.md'), 'utf8'); assert.match(sheet, /Her sources/); assert.match(sheet, /The radio, by map/);
});

test('PRIORITY 5 and 11: the lamp is said once and without a need, the last map says each thing once, and why she stays is one sentence', () => {
  assert.ok(of('C2M30', 'lantern')?.speaker === 'HULL'); assert.equal(of('C2M30', 'lit'), undefined, 'the removed repeat');
  const end2 = rows.filter((r) => r.map === 'END2').map((r) => r.text), c30 = rows.filter((r) => r.map === 'C2M30' && r.ch === 'message').map((r) => r.text);
  for (const t of end2) assert.ok(!c30.some((m) => flat(m) === flat(t)), 'the epilogue repeats a line of the playable scene: ' + t);
  assert.ok(end2.some((t) => /Anyone else who stood here would hear it ask\. There is nobody else\. I said I would keep it lit\./.test(t)));
  assert.ok(!end2.some((t) => /I have you on the set/.test(t)), 'the greeting is the scene\'s; the epilogue is the resolution');
  const hush = of('C2M29', 'hush'), outro = rows.find((r) => r.map === 'C2M29' && r.ch === 'outro').text; assert.equal(hush.speaker, 'HULL'); assert.ok(!/hangs|gone out of the place/.test(hush.text) && !/hangs whole|does not ring/.test(outro), 'the Bell stopping is told by the scene only');
  assert.ok(rows.some((r) => r.map === 'C2M29' && r.ch === 'scene' && /hangs whole/.test(r.text)), 'the scene that shows it stays');
});

test('PRIORITY 6: the song stopping shows one small consequence and no verdict', () => {
  assert.match(of('C2M30', 'deep').text, /lit by hand/); assert.ok(!rows.some((r) => r.map === 'C2M30' && /\b(dying|dead city|extinct|good thing|right thing|worth it)\b/i.test(r.text)), 'no ethics speech, no outcome claimed');
});

test('PRIORITY 8: no main-route line leans on a secret; the Quiet One is a choice, not an assumption', () => {
  const q = rows.filter((r) => r.map === 'C2M19' && /^thread/.test(r.id ?? ''));
  assert.equal(q.length, 2); assert.ok(q.every((r) => /four hundred and six/.test(r.text)));
  assert.equal(q.filter((r) => /Quiet One/.test(r.text)).length, 1, 'only the version for a player who met the Quiet One names it');
  const m19 = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C2M19.json'), 'utf8')).messages, ids = m19.filter((m) => /^thread/.test(m.id)).map((m) => `${m.id}:${m.choice}`).sort();
  assert.deepEqual(ids, ['thread-q:quiet=heard', 'thread:quiet!=heard']);
  const s01 = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E3S01.json'), 'utf8')); assert.ok(JSON.stringify(s01.triggers).includes('"choose":{"id":"quiet","value":"heard"}'), 'meeting the Quiet One records the choice');
  assert.ok(said('my side of the sea'), 'the main route says where the difference came from (C2M12)');
});

test('PRIORITY 9 and 10: the designer does not speak through Ines or the operator; the secret-wall cue stays and its surroundings differ', () => {
  assert.ok(!said('Nothing to find: just the way'), 'the stair'); assert.ok(!said('A long hall with every box I could want in it'));
  assert.ok(!rows.some((r) => ['SIGNAL HOUSE', 'INES'].includes(r.speaker) && r.map === 'C1E4M04' && /\buse turns\b/i.test(r.text)), 'the control is the prompt\'s'); assert.ok(!said('Use turns one a quarter step'));
  const hollow = rows.filter((r) => r.ch === 'message' && r.speaker === 'HULL' && /rings hollow/.test(r.text));
  assert.ok(hollow.length >= 30, 'the cue is kept'); const tails = hollow.map((r) => (r.text.match(/There is a seam\b/) ? 'seam' : 'other')); assert.ok(tails.filter((t) => t === 'seam').length <= 6, 'the "There is a seam" tail repeated ' + tails.filter((t) => t === 'seam').length + ' times');
  const acolyte = rows.filter((r) => r.ch === 'message' && /\b(wheel of bells|tall one with the wheel|tall one,? with the wheel)\b/i.test(r.text) || (r.ch === 'message' && /wheel first|Kill the wheel/i.test(r.text)));
  assert.ok(acolyte.filter((r) => /everything near it takes half|anything near it takes half/i.test(r.text)).length <= 1, 'the Acolyte is explained once (the first encounter)');
});

test('the changed-lines ledger exists, lists every table row, and says how it was validated', () => {
  const ledger = fs.readFileSync(path.join(ROOT, 'design/story/LEDGER_PASS3.md'), 'utf8'); assert.match(ledger, /original wording/i); assert.match(ledger, /validated by/i);
  assert.ok(ledger.split('\n').filter((l) => l.startsWith('| C')).length >= 60, 'a row for each edit');
});

test('PRIORITY 5: a player who never found Ines\'s lamp (C2S02) still reaches the end with a lamp that burns and a door that opens', async () => {
  const { createWorld } = await import('../src/engine/world.js'), { parseMap } = await import('../src/engine/mapformat.js'), { runRoute } = await import('../src/engine/harness.js');
  const map = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C2M30.json'), 'utf8'))), route = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes/C2M30.main.route.json'), 'utf8'));
  const plain = createWorld(map, { seed: 1, difficulty: 'normal', choices: null }); assert.equal(plain.player.lamp.eternal, true, 'the walk gives the lamp an eternal wick to everyone');
  const own = createWorld(map, { seed: 1, difficulty: 'normal', choices: { lamp: 'own' } }); assert.equal(own.player.lamp.eternal, true);
  const r = runRoute(map, route, { seed: 1 }); assert.equal(r.result, 'complete', 'the main route of the last map completes with no secret found');
  const s02 = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C2S02.json'), 'utf8')); assert.ok(s02.messages.some((m) => /burns without oil/.test(m.text)), 'the secret says what its lamp adds');
});
