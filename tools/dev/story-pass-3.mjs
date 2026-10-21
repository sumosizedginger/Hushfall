// THE STORY REVISION PASS (PT-071, R18 round 0: the outside reader's "consolidated story revision directive", Revision 2.0, 2026-10-20). Surgical: every edit is a row in this table with its reason, the
// original wording is captured the first time it is applied (design/story/pass3-originals.json) and the ledger (design/story/LEDGER_PASS3.md) is written from the table, so what changed and why is the table itself.
// Idempotent. The protected lines of the directive (PRIORITY 0) are never touched: tests/story-protected.test.js holds them.
//   EDITS   { map, id, text?, speaker?, choice?, reason }           a message's text, speaker or `choice` rewritten (found by id; the source line is changed, the map is compiled)
//   ADDS    { map, like, id, text, speaker, choice?, where?, reason } a new message at the place of an existing one (`where`: 'after' (default) or 'before')
//   REMOVES { map, id, reason }                                       a message removed (its source line leaves)
//   DIRECT  { map, old, new, reason }                                 a raw string of the map source (an outro, an intro line, a trigger action)
//   CARDS   { file, old, new, reason }                                a string of a shell file (the epilogue's cards)
// `node tools/dev/story-pass-3.mjs [--check] [--no-compile]`
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..'), check = process.argv.includes('--check'), noCompile = process.argv.includes('--no-compile');
const BS = String.fromCharCode(92), NL = String.fromCharCode(10);

export const EDITS = [
  // ---- PRIORITY 3 and 4: where the operator is, and what she can know (plan sheets, the ship's hum, what Ines tells her) ----
  { map: 'C1E1M07', id: 'lamp-lit', text: 'The lighthouse lamp is lit, Calder. Your father wrote that a lit lamp holds the tone back. I cannot say it does. I keep it lit.', reason: 'the operator is at the lighthouse, not in the ridge station the map is named for (the pass-2 wording "here" was ambiguous)' },
  { map: 'C1E1M03', id: 'start', text: 'Calder, the boardwalk runs the length of the market. Keep to cover.', reason: 'she cannot know a Bellhand is on the boardwalk: she can say where things are, not what stands in them (C1E1M02); Ines sees them one line later' },
  { map: 'C1E1M08', id: 'door', text: "The stairs keep turning. I can't see the top.", reason: 'the level designer speaking through Ines ("Nothing to find: just the way, and what is on it")' },
  { map: 'C1E1M08', id: 'warden', text: 'Another plate-bearer, and the pillars are in the corridor again.', reason: 'a combat reminder at a familiar encounter: shorter, no instruction' },
  { map: 'C1E1M08', id: 'chamber', speaker: 'INES', text: 'Six bells in a ring, and the Cantor in the middle of them. The whole tower is ringing off it.', reason: 'the operator cannot see the ring of six or the Cantor, and she gave the boss tutorial; Ines sees it and says what she sees (the rule goes to HULL, below)' },
  { map: 'C1E1M08', id: 'quiet', text: "The tower is silent, Calder, and the signal didn't stop. It was only a machine. I have its bearing: the Salt Works. The hatch is open.", reason: 'keeps "The Bell is a machine" with a source: the signal she is reading did not stop when the tower did' },
  { map: 'C1E2M01', id: 'exit', text: "That's the way into the Works. After it, the Evaporation Pans: open flats and channels, and not a roof for a kilometre.", reason: '"hunting parties" is contents; the plan sheet shows flats and channels' },
  { map: 'C1E2M02', id: 'start', text: 'White ground to the horizon, Calder, and one roof in the middle: the pump station. Nothing else stands for a kilometre.', reason: '"Everything between you and it is working" says what stands in the pans' },
  { map: 'C1E2M03', id: 'dock', text: 'Plate again, at the end of the dock. A pillar on its charge lane will do.', reason: 'the Warden-Graft is named again at Brine Gate only (the continuity sheet said Pump Cathedral and Rail Yard: the record says Brine Gate and Rail Yard); this one is shorter, and not a second full lesson' },
  { map: 'C1E2M03', id: 'exit', text: 'The rail ends in Kiln Row, Calder. After this, the heat.', reason: '"Everything past that door is cooking something" is contents' },
  { map: 'C1E2M04', id: 'start', text: 'The kiln row is on the Works plan, Calder: a ring of kilns and a flue at the east end, dampered shut. The handles that work it are somewhere along the way.', reason: '"They fire the shells here ... Brass first: the charging hall" gave contents and the route; the objective names the handles' },
  { map: 'C1E2M04', id: 'flue-open', speaker: 'INES', text: 'The flue is drawing, and it is drawing cold. What they put below the Works is colder than it should be.', reason: 'the operator cannot feel the cold in the stack; Ines can' },
  { map: 'C1E2M05', id: 'start', text: 'The Works plan calls this the Cradle Annex, Calder. Walk; do not run.', reason: '"Nothing in here is awake yet" is contents; the plan gives the name' },
  { map: 'C1E2M08', id: 'start', text: 'Calder, the head of the line is at the north end, on the Works plan.', reason: 'the feeders and what they do were the operator describing the boss mechanism before Ines has seen it (Ines says it, 0:11)' },
  { map: 'C1E3M05', id: 'start', text: 'The doors in there answer to the hum, Calder, and I can read them listening. Be quiet near one.', reason: 'the ship-hum source (C1E3M01) stated, and the tutorial left to Ines and HULL' },
  { map: 'C1E3M05', id: 'heart', text: 'Rows of them, standing: the ones the ship has tuned. If you can cross without a sound, cross. The lever is on the east wall.', reason: '"asleep" is contents the hum does not give' },
  { map: 'C1E3M06', id: 'ward', text: 'The tall one with the wheel again. Go round the end of a pew and put it down.', reason: 'a repeated Acolyte lesson (first told at C1E3M05): shortened at the familiar encounter' },
  { map: 'C1E3M08', id: 'singers', text: 'Singers in the curve, a shell-back in front of them, and the tall one with the wheel behind.', reason: 'the Acolyte, third time: named, not taught again' },
  { map: 'C1E3M08', id: 'bell', text: 'Four-legged, a horn the size of a doorway, and it walks.', reason: 'the operator keeps the shape the hum gives her; the rule about its rings goes to HULL (the new message "rings")' },
  { map: 'C1E4M02', id: 'start', text: 'Wrecks, Calder, three of them, with sky between. There is no road across that I can read.', reason: '"earlier invasions" is not on any source; the plate / steer / shoot / fifteen tutorial goes to HULL' },
  { map: 'C1E4M04', id: 'start', text: 'This is where the Gate is focused, Calder. Light does the work here. The mirrors turn a quarter at a time: the bright face carries the beam, the dark face stops it.', reason: 'directive PRIORITY 9: the character explanation separated from the control instruction (the interface prompt says "turn the mirror")' },
  { map: 'C1E4M04', id: 'nw', speaker: 'HULL', reason: 'puzzle-rule information is the interface channel, not the operator' },
  { map: 'C1E4M04', id: 'se', speaker: 'HULL', reason: 'puzzle-rule information is the interface channel, not the operator' },
  { map: 'C1E4M04', id: 'acolyte', text: "The tall one with the wheel. The mirrors can wait; they aren't going anywhere.", reason: 'the Acolyte, fourth time: named, not taught again' },
  { map: 'C1E4M06', id: 'start', text: "Five ranks, Calder, each a step higher. The gaps in the screens don't line up. The tunnels in the flanks go round the first two.", reason: '"each with its own guard" is contents' },
  { map: 'C1E4M06', id: 'stalls', speaker: 'INES', text: 'The stalls. The tall one with the wheel is behind the singers.', reason: 'the operator named contents and repeated the Acolyte lesson a fifth time; Ines names it' },
  { map: 'C1E4M08', id: 'start', text: 'Three seals hold its shield up, Calder: shoot them, or turn its own beam onto one with the plinths.', reason: 'the tactical rest ("Its eye opens before the beam. Stone stops it.") goes to HULL (the new message "eye")' },
  { map: 'C1E4M08', id: 'mirrors', text: 'Mirror plinths, one-sided: a back stops the light. Light off the face runs straight on, and there are seals on those lines.', reason: 'the control ("Use turns one a quarter step") is the interface\'s: the prompt reads "turn the mirror"' },
  // ---- PRIORITY 2: what Ines can and cannot hear ----
  { map: 'C1E1S01', id: 'log1', text: 'First entry. The hum in the chalk. I knew it for what it was. Ines hears the bells, and she does not hear this.', reason: 'evidence and speculation separated: the log states what he saw (she hears the bells and not the hum); the suspicion about the ear is the next message' },
  { map: 'C2M04', id: 'start', text: 'Terraces, and on every terrace a row of standing forks, brass and green, taller than a man. They are all humming, so low I feel it in my hands before I hear it.', reason: 'the forks are an instrument and a vibration she can feel: not the Hush' },
  { map: 'C2M08', id: 'spire', text: "A hollow spire with a well in the middle and a stair down the wall. Cold air comes up it, and the rail hums in my hand. I think that's what holds the Gate open. I am going down.", reason: '"and a sound" was ambiguous (the Hush she cannot hear): a vibration she feels' },
  // ---- PRIORITY 1 and 9: continuity and the designer speaking ----
  { map: 'C2M07', id: 'tally', text: 'THE MARROW ORDER. 311 BELLS GROWN. 311 HUNG. FOUR SPARE.', reason: 'the Vael grow their bells, they do not cast them (the intro card, C2M07 0:04). Figures kept' },
  { map: 'C2M24', id: 'start', speaker: 'INES', text: 'A long hall with a row of harpoon bolts and a row of armour laid out down the middle, as if somebody expected a person to come and take them. Somebody has.', reason: 'the "boxes" are the placed pickups: four boxes of bolts and three vests' },
  { map: 'C2M24', id: 'plate', text: 'OWED 52,310. SUNG 49,715. SHORT 2,595.', reason: 'a plate says its numbers; what Ines notices is the next message (and "the first fire-base" named no place in the story)' },
  { map: 'C2M24', id: 'hollow', text: 'The wall of the top tier rings hollow behind the north pillar. The plaster there has a crack the width of a nail.', reason: 'directive PRIORITY 10: the cue ("rings hollow") kept, the surrounding observation varied (this was "There is a seam in it")' },
  // ---- PRIORITY 3: the radio, and PRIORITY 11: the last map says each thing once ----
  { map: 'C2M16', id: 'last-call', text: "Calder, the conductor was the hum I was riding, and it has stopped. This is the last I can hold. The lamp is lit and the tea is cold. I'm here until the set goes.", reason: 'the radio rule: in the Deep the set rides the Vael hum; the conductor was the last strong one; with it gone the line ends' },
  // SUPERSEDED by story-pass-4.mjs (2026-10-21, Codex: the chain is gone by then): the row below is pass 3's record; running pass 3 again would put "on its chain" back, so run pass 4 after it.
  { map: 'C2M29', id: 'hush', speaker: 'HULL', text: 'The heart has stopped on its chain. The stair north of the bell is lit.', reason: 'directive PRIORITY 11: the gameplay message says what changed and what to do; the physical event is the cinematic\'s and the outro\'s no longer repeats it' },
  { map: 'C2M30', id: 'deep', text: 'The city under the stone. Every lamp out but one: a lantern low on a ledge, a wick in it, lit by hand. And one bell, high up, that nobody is ringing. I count three swings and stop.', reason: 'directive PRIORITY 6: an observed consequence that does not claim an outcome (somebody lit a lantern by hand when the machinery stopped); the visible object is the lantern prop in the room' },
  { map: 'C2M30', id: 'door', text: 'A door that is also a bell. It has stopped ringing and it has not stopped shaking.', reason: 'directive PRIORITY 11: the hook, the father and the lamp are the epilogue\'s; the playable scene says what the door is doing' },
  { map: 'C2M22', id: 'bells', text: 'In the garden a tree of glass, and three chimes among the graves. The tree plays three notes when you use it: answer on the chimes, in order, each within eight seconds of the last.', reason: 'the prose lint: HULL names what the thing does, the control is on the prompt (this is the R19 chime puzzle)' },
  // ---- PRIORITY 8: a payoff that does not depend on a secret ----
  { map: 'C2M19', id: 'thread', choice: 'quiet!=heard', text: 'A thread, one voice to a cradle, cut to a length and laid in the weave. The plate counts the cradles in a night: four hundred and six.', reason: '"The Quiet One was right about the loom" names a character only the secret C1E3S01 introduces: this version is for a player who did not meet it' },
  // ---- PRIORITY 10: the secret-wall cue kept, the observation around it varied ----
  { map: 'C2M18', id: 'hollow', text: 'The rim wall rings hollow here, and the bone is thinner than it ought to be.', reason: 'cue kept, tail varied' },
  { map: 'C2M20', id: 'hollow', text: 'The west wall of the west station rings hollow in one place. A line in the paint where a door has been.', reason: 'cue kept, tail varied' },
  { map: 'C2M25', id: 'seam', text: 'The outer wall of the last ledge rings hollow in one short run. The root there grows the other way.', reason: 'cue kept, tail varied' },
  { map: 'C2M27', id: 'hollow', text: 'The wall of the north road rings hollow in one short run, in the first stretch. A hand wide, no more, and dry.', reason: 'cue kept, tail varied' },
  { map: 'C2M28', id: 'hollow', text: 'The outer wall of the highest step rings hollow in one short run, east of the exit. The mortar there is newer.', reason: 'cue kept, tail varied' },
  { map: 'C2M29', id: 'hollow', text: 'The wall of the top tier rings hollow in one short run, south of the middle. The seats are cut away round it.', reason: 'cue kept, tail varied' },
];

export const ADDS = [
  { map: 'C1E1M08', like: 'chamber', id: 'cantor-rule', speaker: 'HULL', text: "The Cantor's tone does not pass stone: the pillars are cover. Cut the six bells, then the Cantor.", reason: 'the rule the operator used to give, in the interface channel' },
  { map: 'C1E1S01', like: 'log1', id: 'log1b', speaker: "WARDEN CALDER'S LOG", text: 'I have wondered since the accident whether the ear I damaged is why. I cannot know. If it is, it may be the best thing I ever did.', reason: 'directive PRIORITY 2: his suspicion and his guilt, said as suspicion (the original sentence kept in its words)' },
  { map: 'C1E3M08', like: 'bell', id: 'rings', speaker: 'HULL', text: 'Pillars are cover from its rings. While a reed sings it throws two: wait for the second.', reason: 'the rule the operator used to give, in the interface channel' },
  { map: 'C1E4M02', like: 'start', id: 'vents', speaker: 'HULL', text: 'A lit plate in a deck throws you across the gap. Steer a little, shoot as you go. A miss costs fifteen, and the sky puts you back.', reason: 'the vent tutorial the operator used to give, in the interface channel' },
  { map: 'C1E4M08', like: 'start', id: 'eye', speaker: 'HULL', text: 'Its eye opens before the beam fires. Stone stops the beam.', reason: 'the tactical rest the operator used to give, in the interface channel' },
  { map: 'C2M12', like: 'plate', id: 'short', speaker: 'INES', text: 'Owed and short. That is all the plates have said since the Fields. This is where the difference came from: my side of the sea.', reason: 'directive PRIORITY 7 and 8: the main route says why people were taken, from what is in front of Ines (the count, and boots from a Marrow yard)' },
  { map: 'C2M19', like: 'thread', id: 'thread-q', choice: 'quiet=heard', speaker: 'PLATE', text: 'A thread, one voice to a cradle, cut to a length and laid in the weave. The plate counts the cradles in a night: four hundred and six. The Quiet One was right about the loom.', reason: 'the payoff for a player who met the Quiet One (C1E3S01 records the choice "quiet=heard")' },
  { map: 'C2M24', like: 'plate', id: 'plate-match', speaker: 'INES', text: 'The figures match the plate in the Hive-Song gorge. None of them has moved.', reason: 'directive PRIORITY 1: "the first fire-base" named no place; the plate in the gorge (C2M17) is a different plate with the same figures' },
  { map: 'C2M30', like: 'floor', id: 'lantern', speaker: 'HULL', text: 'The lantern does not draw on its oil in this place.', reason: 'directive PRIORITY 5: the walk\'s lamp is eternal for everybody (map.lantern.eternal); it is said once, plainly, instead of being granted silently' },
  { map: 'C2M30', like: 'gate', id: 'set', where: 'before', speaker: 'INES', text: 'The set has woken in my pocket. The door is the only thing down here that carries.', reason: 'directive PRIORITY 3: why the genuine transmission reaches her here (it rides the Gate)' },
];

export const REMOVES = [
  { map: 'C2M30', id: 'lit', reason: 'directive PRIORITY 11: the same discovery three times (the message, the objective, the epilogue); the objective ("The lamp is lit and the door is quiet. Walk through") stays and the epilogue has the scene' },
];

export const DIRECT = [
  { map: 'C2M30', old: "{ message: 'lit' }, ", new: '', reason: 'the trigger no longer plays the removed message' },
  { map: 'C2M29', old: 'It hangs whole and it does not ring. In the quiet it left, somewhere above you, a stair has lit.', new: 'Above the bell the shaft goes up into a dark that the stair lights, one flight at a time.', reason: 'directive PRIORITY 11: the outro is the transition; "hangs whole" and "does not ring" are the cinematic\'s' },
  { map: 'C2M25', old: ['The corridor beyond goes on down at the slope of the rest of the country, towards a sound that is not a sound yet.', 'The corridor beyond goes on down at the slope of the rest of the country, towards a bell you can feel in the floor before you can hear it.'], new: 'The corridor beyond goes on down, towards a bell you can feel in the floor before you hear it.', reason: 'directive PRIORITY 2: the Bell is a bell (she hears it); what she feels first is a vibration. Not the Hush' },
  { map: 'C2M26', old: 'there is a sound at the end of it that is very slow.', new: 'at the end of it a bell is being struck very slowly.', reason: 'directive PRIORITY 2: an ordinary sound, named' },
  { map: 'C1E3M07', old: 'The ship casts its bell-bearers here.', new: 'The ship grows its bell-bearers here.', reason: 'the Vael grow, they do not cast (C2M07); the vats are the proof' },
  { map: 'C1E3S01', old: "triggers: [\n    { id: 'hall',", new: "triggers: [\n    { id: 'heard', when: 'msg:quiet', do: [{ choose: { id: 'quiet', value: 'heard' } }] },                       // PT-071: the Bone Loom's plate answers a player who met the Quiet One (a choice, so no main-route text depends on this secret)\n    { id: 'hall',", reason: 'records that the Quiet One was met' },
];

export const CARDS = [
  { file: 'src/game/ending.js', old: "      { who: '', text: 'The stair ends at a door that is also a bell. It is not ringing.' },\n      { who: 'SIGNAL HOUSE', text: 'Ines. I have you on the set. There is no line down there, and I have you.' },\n", new: "      { who: '', text: 'The stair ends at the door.' },\n", reason: 'directive PRIORITY 11: the door and the greeting are the playable scene\'s (C2M30); the epilogue is the resolution' },
  { file: 'src/game/ending.js', old: "text: 'There is nobody else. I said I would keep it lit.' }", new: "text: 'Anyone else who stood here would hear it ask. There is nobody else. I said I would keep it lit.' }", reason: 'directive PRIORITY 5: why she stays, in one observable sentence: nobody who hears the Hush can stand at the door; she can (the protected line follows in full)' },
];

// ------------------------------------------------------------------------------------------------ the machinery
const quoteAt = (s, pos) => { const ls = s.lastIndexOf(NL, pos) + 1; let q = null; for (let i = ls; i < pos; i++) { const c = s[i]; if (q) { if (c === BS) i++; else if (c === q) q = null; } else if (c === "'" || c === '"' || c === '`') q = c; } return q; };
const escFor = (q, t) => (q === "'" ? t.split("'").join(BS + "'") : q === '"' ? t.split('"').join(BS + '"') : q === '`' ? t.split('`').join(BS + '`').split('${').join(BS + '${') : t);
const lit = (t) => "'" + t.split(BS).join(BS + BS).split("'").join(BS + "'") + "'";
const srcFile = (id) => path.join(root, 'maps-src', id + '.level.mjs');
const jsonFile = (id) => path.join(root, 'maps', id + '.json');
const readJson = (id) => JSON.parse(fs.readFileSync(jsonFile(id), 'utf8'));
const msgOf = (map, id) => readJson(map).messages.find((m) => m.id === id);
const idRe = (id) => new RegExp("(^|[^A-Za-z0-9_])(id: '" + id.replace(/[-]/g, BS + '-') + "'|msg\\('" + id.replace(/[-]/g, BS + '-') + "')");
const lineOf = (lines, id) => lines.findIndex((l) => idRe(id).test(l) && (/speaker: /.test(l) || /^\s*msg\(/.test(l)));
const splitArgs = (s) => { const out = []; let depth = 0, q = null, cur = ''; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { cur += c; if (c === BS) { cur += s[++i]; } else if (c === q) q = null; continue; } if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; } if ('([{'.includes(c)) depth++; if (')]}'.includes(c)) depth--; if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c; } if (cur.trim()) out.push(cur.trim()); return out; };

/** the `at:` of an object-style message line: a bracketed pair (balanced: a cell can be written Z0[2] + 5) or a name */
const readAt = (l) => {
  const k = l.indexOf('at: '); if (k < 0) return null; let j = k + 4;
  if (l[j] === '[') { let d = 0; for (; j < l.length; j++) { if (l[j] === '[') d++; else if (l[j] === ']' && --d === 0) { j++; break; } } return l.slice(k + 4, j); }
  return (l.slice(j).match(/^[A-Za-z_][A-Za-z0-9_.]*/) ?? [null])[0];
};
const touched = new Set(), notes = [], problems = []; let changed = 0;
const origFile = path.join(root, 'design/story/pass3-originals.json'), originals = fs.existsSync(origFile) ? JSON.parse(fs.readFileSync(origFile, 'utf8')) : {};
const remember = (map, id, was, speaker) => { const k = map + '|' + id; if (!(k in originals)) originals[k] = { text: was, speaker }; };

// EDITS
for (const e of EDITS) {
  const m = msgOf(e.map, e.id); if (!m) { problems.push(`${e.map}: no message ${e.id}`); continue; }
  const file = srcFile(e.map); let s = fs.readFileSync(file, 'utf8'), dirty = false;
  remember(e.map, e.id, m.text, m.speaker);
  if (e.text !== undefined && e.text !== m.text) {
    if (e.text.length > 180) { problems.push(`${e.map}/${e.id}: ${e.text.length} characters (limit 180)`); continue; }
    let did = false;
    for (const aForm of [m.text, m.text.split("'").join(BS + "'")]) { let from = 0, i; while ((i = s.indexOf(aForm, from)) >= 0) { const r = escFor(quoteAt(s, i), e.text); s = s.slice(0, i) + r + s.slice(i + aForm.length); from = i + r.length; did = true; } }
    if (did) { changed++; dirty = true; } else notes.push(`${e.map}/${e.id}: the current text is not in the source (compiled map out of date?)`);
  }
  const lines = s.split(NL), i = lineOf(lines, e.id);
  if (i < 0) { problems.push(`${e.map}/${e.id}: no source line`); continue; }
  if (e.speaker !== undefined && e.speaker !== m.speaker) {
    if (/^\s*msg\(/.test(lines[i])) {
      const l = lines[i], o = l.indexOf('msg(') + 4, c = l.lastIndexOf(')'), args = splitArgs(l.slice(o, c)); args[4] = lit(e.speaker); const t = l.slice(0, o) + args.join(', ') + l.slice(c);
      if (t !== l) { lines[i] = t; dirty = true; changed++; }
    } else if (/speaker: /.test(lines[i])) { const t = lines[i].replace(/speaker: ('[^']*'|"[^"]*")/, 'speaker: ' + JSON.stringify(e.speaker)); if (t !== lines[i]) { lines[i] = t; dirty = true; changed++; } }
    else problems.push(`${e.map}/${e.id}: the speaker cannot be found on its line`);
  }
  if (e.choice !== undefined && !lines[i].includes("choice: '" + e.choice + "'")) {
    const t = lines[i].replace(/, choice: '[^']*'/, '').replace(/\s*\},?\s*$/, (end) => ", choice: '" + e.choice + "'" + end);
    if (t !== lines[i]) { lines[i] = t; dirty = true; changed++; } else problems.push(`${e.map}/${e.id}: choice could not be written`);
  }
  if (dirty) { touched.add(e.map); if (!check) fs.writeFileSync(file, lines.join(NL)); }
}

// ADDS
for (const a of ADDS) {
  const file = srcFile(a.map); const s0 = fs.readFileSync(file, 'utf8');
  if (idRe(a.id).test(s0)) continue;                                                        // already added
  const eol = s0.includes(String.fromCharCode(13) + NL) ? String.fromCharCode(13) : '', lines = s0.split(NL), i = lineOf(lines, a.like); if (i < 0) { problems.push(`${a.map}: no anchor ${a.like} for ${a.id}`); continue; }
  if (a.text.length > 180) { problems.push(`${a.map}/${a.id}: ${a.text.length} characters (limit 180)`); continue; }
  const indent = lines[i].match(/^\s*/)[0], l = lines[i]; let nl;
  if (/^\s*msg\(/.test(l)) {
    const inner = l.slice(l.indexOf('msg(') + 4, l.lastIndexOf(')')), args = splitArgs(inner);
    nl = `${indent}msg(${lit(a.id)}, ${args[1]}, ${args[2]}, ${args[3]}, ${lit(a.speaker)}, ${lit(a.text)}${a.choice ? ', { choice: ' + lit(a.choice) + ' }' : ''}),`;
  } else {
    const at = readAt(l), rad =(l.match(/radius: ([0-9.]+)/) ?? [])[1];
    if (!at || !rad) { problems.push(`${a.map}/${a.id}: cannot read the position of ${a.like}`); continue; }
    nl = `${indent}{ id: ${lit(a.id)}, at: ${at}, radius: ${rad}, speaker: ${lit(a.speaker)}, text: ${lit(a.text)}${a.choice ? ', choice: ' + lit(a.choice) : ''} },`;
  }
  lines.splice(a.where === 'before' ? i : i + 1, 0, nl + eol); changed++; touched.add(a.map); if (!check) fs.writeFileSync(file, lines.join(NL));
}

// REMOVES
for (const r of REMOVES) {
  const file = srcFile(r.map), lines = fs.readFileSync(file, 'utf8').split(NL), i = lineOf(lines, r.id); if (i < 0) continue;
  const m = msgOf(r.map, r.id); if (m) remember(r.map, r.id, m.text, m.speaker);
  lines.splice(i, 1); changed++; touched.add(r.map); if (!check) fs.writeFileSync(file, lines.join(NL));
}

// DIRECT
for (const d0 of DIRECT) {
  const file = srcFile(d0.map); const s = fs.readFileSync(file, 'utf8'), d = { ...d0, old: (Array.isArray(d0.old) ? d0.old : [d0.old]).find((o) => s.includes(o)) ?? (Array.isArray(d0.old) ? d0.old[0] : d0.old) };
  if (s.includes(d.old)) { if (s.split(d.old).length !== 2) { problems.push(`${d.map}: the string occurs ${s.split(d.old).length - 1} times: ${d.old.slice(0, 40)}`); continue; } changed++; touched.add(d.map); if (!check) fs.writeFileSync(file, s.replace(d.old, () => d.new)); }
  else if (d.new && !s.includes(d.new)) notes.push(`${d.map}: not found: ${d.old.slice(0, 60)}`);
}

// CARDS
for (const c of CARDS) {
  const f = path.join(root, c.file); let s = fs.readFileSync(f, 'utf8'); const crlf = s.includes('\r\n'); if (crlf) s = s.replace(/\r\n/g, '\n');
  if (s.includes(c.old)) { changed++; if (!check) fs.writeFileSync(f, (crlf ? s.replace(c.old, () => c.new).replace(/\n/g, '\r\n') : s.replace(c.old, () => c.new))); }
  else if (!s.includes(c.new)) notes.push(`${c.file}: not found: ${c.old.slice(0, 60)}`);
}

if (!check) fs.writeFileSync(origFile, JSON.stringify(originals, null, 1) + NL);
console.log(`${changed} edit(s) ${check ? 'would be made' : 'made'} in ${touched.size} map(s)${notes.length ? '\nNOTES:\n  ' + notes.join('\n  ') : ''}${problems.length ? '\nPROBLEMS:\n  ' + problems.join('\n  ') : ''}`);
if (!check && !noCompile && touched.size) for (const id of touched) { const r = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, encoding: 'utf8' }); console.log(`compile ${id}: ${r.status === 0 ? 'ok' : 'FAILED ' + (r.stderr || r.stdout).slice(0, 200)}`); if (r.status !== 0) process.exitCode = 1; }
if (problems.length) process.exitCode = 1;

// THE LEDGER: the changed lines, written from the table (original wording, new wording, map, reason). Regenerated on every run that is not a --check.
if (!check) {
  const cell = (t) => String(t ?? '').replace(/\|/g, '\|').replace(/\s+/g, ' ');
  const rowsOut = [];
  const now = (map, id) => msgOf(map, id)?.text ?? '(removed)';
  for (const e of EDITS) { const o = originals[e.map + '|' + e.id]; rowsOut.push([e.map, e.id, o ? o.text : '', e.text === undefined ? '(text unchanged; speaker ' + (o?.speaker ?? '') + ' -> ' + e.speaker + ')' : now(e.map, e.id), e.reason]); }
  for (const a of ADDS) rowsOut.push([a.map, a.id + ' (new)', '', now(a.map, a.id), a.reason]);
  for (const r of REMOVES) { const o = originals[r.map + '|' + r.id]; rowsOut.push([r.map, r.id + ' (removed)', o ? o.text : '', '', r.reason]); }
  for (const d of DIRECT) rowsOut.push([d.map, 'source', Array.isArray(d.old) ? d.old[0] : d.old, d.new, d.reason]);
  for (const c of CARDS) rowsOut.push([c.file, 'epilogue', c.old.replace(/\s+/g, ' '), c.new.replace(/\s+/g, ' '), c.reason]);
  const text = ['# The changed-lines ledger, story revision pass 3 (PT-071, 2026-10-20)', '',
    "The outside reader's directive (Revision 2.0) answered: every edit made to the story's text, with the original wording, the new wording, the map, the reason and how it was validated. Generated by `node tools/dev/story-pass-3.mjs` from the table in that file (the originals are kept in `design/story/pass3-originals.json`). The protected lines of the directive's PRIORITY 0 are untouched: `tests/story-protected.test.js` holds each of them.", '',
    '**Validated by:** the Record regenerated (`node tools/dev/story-export.mjs`), the prose lint (`node tools/dev/prose-lint.mjs`: no findings), `tests/story-protected.test.js`, `tests/story-coherence.test.js`, `tests/message-unless.test.js`, `tests/ending.test.js`, `tests/campaign2-a.test.js` to `campaign2-d.test.js`, `tests/prose.test.js`, `tests/cinematics.test.js`, `tools/dev/map-check.mjs` on every touched map and `node tools/verify-map.mjs` on the touched maps whose text changed what a message delivers; the real-game evidence of every map is stale until the one regeneration (R26) and is not claimed here.', '',
    '| map | message | original wording | new wording | reason |', '|---|---|---|---|---|', ...rowsOut.map((r) => '| ' + r.map(cell).join(' | ') + ' |'), ''].join(NL);
  fs.writeFileSync(path.join(root, 'design/story/LEDGER_PASS3.md'), text);
}
