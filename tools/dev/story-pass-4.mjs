// THE STORY REVISION PASS 4 (outside audit round 1, 2026-10-21): the three lines Codex found that contradict the story's own record. Same machinery as pass 3 (story-pass-3.mjs): every edit is a row in this table with its reason, the
// original wording is captured the first time it is applied (design/story/pass4-originals.json) and the ledger (design/story/LEDGER_PASS4.md) is written from the table. Idempotent. The protected lines of pass 3's directive are not touched.
//   EDITS   { map, id, text?, speaker?, reason }     a message's text or speaker rewritten (found by id; the source line is changed, the map is compiled)
// `node tools/dev/story-pass-4.mjs [--check] [--no-compile]`
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..'), check = process.argv.includes('--check'), noCompile = process.argv.includes('--no-compile');
const BS = String.fromCharCode(92), NL = String.fromCharCode(10);

export const EDITS = [
  { map: 'C2M29', id: 'hush', text: 'The heart has stopped. The stair north of the bell is lit.', reason: 'Codex: "The chain is gone: it falls" (the drop message, phase two) is followed at the end by "The heart has stopped on its chain". The chain is gone by then. The closing line says only what is true: the heart has stopped' },
  { map: 'C2M28', id: 'caches', text: 'Health and armour lie along the highest step. Fetch them between squads.', reason: 'Codex: the line sits at the cache, so it is said when the player is already there; on the exported route that is at 1:46, after the first stroke at 0:30, and "before the first stroke; after it there is no time" is advice that cannot be followed. It now holds at any time the player reads it' },
  { map: 'C1E3M05', id: 'east', text: 'A tall one, a wheel of bells behind it. Anything near it takes half. Kill it first.', reason: 'Codex: "Another of the tall ones" at the Acolyte\'s first appearance implies a lesson nobody was given (no earlier line calls anyone "the tall ones"). Later maps say "the tall one with the wheel again", which is now true' },
];
export const ADDS = [];
export const REMOVES = [];
export const DIRECT = [];
export const CARDS = [];

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
const origFile = path.join(root, 'design/story/pass4-originals.json'), originals = fs.existsSync(origFile) ? JSON.parse(fs.readFileSync(origFile, 'utf8')) : {};
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
  const text = ['# The changed-lines ledger, story revision pass 4 (outside audit round 1, 2026-10-21)', '',
    'Three lines of the story that contradicted its own record, found by Codex in the outside audit (design/audits/codex writeup.md) and checked against the Record before editing. Generated by `node tools/dev/story-pass-4.mjs` from the table in that file (the originals are kept in `design/story/pass4-originals.json`). Each map touched is compiled again, and only that map\'s evidence is stale.', '',
    '**Validated by:** the Record regenerated (`node tools/dev/story-export.mjs`), the prose lint, `tests/story-protected.test.js`, `tests/story-coherence.test.js`, `tests/campaign2-d.test.js`, `tests/batch-d.test.js` and `node tools/dev/map-check.mjs` on the three maps.', '',
    '| map | message | original wording | new wording | reason |', '|---|---|---|---|---|', ...rowsOut.map((r) => '| ' + r.map(cell).join(' | ') + ' |'), ''].join(NL);
  fs.writeFileSync(path.join(root, 'design/story/LEDGER_PASS4.md'), text);
}
