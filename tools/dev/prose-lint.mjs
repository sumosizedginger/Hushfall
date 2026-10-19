// THE PROSE LINT (PT-061, R13: the prose pass): design/LORE.md section 5 as code. Reads every message, intro, outro, objective and trigger message of every shipped map and reports what breaks the rules a machine can check:
//   stock phrases (rule 3), a message longer than 180 characters or than four sentences (rule 5; found documents six), a question ending a line, "not X but Y" for effect, a line that ends on a one-word fragment, the same sentence used twice (rule 1: "could be pasted anywhere"),
//   HULL explaining how a control works (tutorials belong on the HUD), a feeling named for Ines (rule 2), and an em-dash splice. It prints a count per rule and the lines; `--json` for data; `--maps=C1E1M01,C2M08` limits it. Read-only, node only.
//   node tools/dev/prose-lint.mjs [--json] [--maps=ID,ID] [--rule=stock]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), only = args.find((a) => a.startsWith('--maps='))?.slice(7).split(','), rule = args.find((a) => a.startsWith('--rule='))?.slice(7);
export const STOCK = ['echoes of', 'whisper', 'testament to', 'tapestry', 'dance of', 'symphony of', 'ancient', 'eldritch', 'cosmic', 'unspeakable', 'chilling', 'haunting', 'eerie', 'silence that speaks', 'the weight of', 'a sense of', 'send shivers', 'sends a shiver', 'blood runs cold', 'dread', 'ominous', 'sinister', 'palpable', 'seemed to', 'as if the'];
const FEELINGS = /\b(Ines|she) (feels?|felt|is afraid|is scared|was afraid|dreads?|fears?|hopes?|grieves?|mourns?)\b/i;
const TUTORIAL = /\b(press|hold|tap|click|use the|key [A-Z0-9]\b|\bE to\b|aim down|left mouse|right mouse|wasd)\b/i;
export const sentences = (t) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
export function lintLine(text, { speaker = '', doc = false } = {}) {
  const out = [], low = text.toLowerCase();
  for (const p of STOCK) if (low.includes(p)) out.push(['stock', `"${p}"`]);
  const sn = sentences(text), limit = doc ? 6 : 4;
  if (text.length > 180 && !doc) out.push(['long', `${text.length} characters`]);
  if (sn.length > limit) out.push(['long', `${sn.length} sentences`]);
  if (/\?\s*$/.test(text)) out.push(['question', 'ends on a question']);
  if (/\bnot (just |only |merely )?[^,.;]{1,40}, but\b|\bnot [^,.;]{1,40}\. (it|they|this) (is|was|are)\b/i.test(text)) out.push(['notbut', 'not X but Y']);
  if (/(^|[.!?]\s+)[A-Z][a-z]+[.!]\s*$/.test(text) && sn.length > 1) out.push(['fragment', 'ends on a one-word sentence']);
  if (/ — | -- /.test(text)) out.push(['dash', 'a dash splice']);
  if (speaker === 'HULL' && TUTORIAL.test(text)) out.push(['tutorial', 'HULL explains a control']);
  if (speaker === 'INES' && FEELINGS.test(text)) out.push(['feeling', 'names a feeling']);
  return out;
}
export function allText(dir = path.join(root, 'maps')) {
  const rows = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const id = f.slice(0, -5); if (only && !only.includes(id)) continue; const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const q of m.messages ?? []) rows.push({ id, kind: 'message', mid: q.id, speaker: q.speaker ?? '', text: q.text, doc: /LOG|LEDGER|PLATE|NOTE|TALLY|PLACARD|TENDER|DOCUMENT|PAGE/i.test(q.speaker ?? '') });
    for (const l of m.intro?.lines ?? []) rows.push({ id, kind: 'intro', speaker: '', text: l, doc: false });
    if (typeof m.outro === 'string') rows.push({ id, kind: 'outro', speaker: '', text: m.outro, doc: false });
    else for (const l of m.outro?.lines ?? []) rows.push({ id, kind: 'outro', speaker: '', text: l, doc: false });
    if (m.objective) rows.push({ id, kind: 'objective', speaker: '', text: m.objective, doc: false });
    const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (typeof o.objective === 'string') rows.push({ id, kind: 'objective', speaker: '', text: o.objective, doc: false }); Object.values(o).forEach(walk); } };
    walk(m.triggers); walk(m.entities);
  }
  return rows;
}
export function lintAll(rows = allText()) {
  const found = [], seen = new Map();
  for (const r of rows) { for (const [k, why] of lintLine(r.text, r)) found.push({ ...r, rule: k, why }); const key = r.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); if (key.length > 20) { if (!seen.has(key)) seen.set(key, []); seen.get(key).push(r); } }
  for (const [, list] of seen) if (list.length > 1) for (const r of list) found.push({ ...r, rule: 'duplicate', why: `the same line on ${[...new Set(list.map((x) => x.id))].join(', ')}` });
  return found;
}
if (process.argv[1]?.endsWith('prose-lint.mjs')) {
  const rows = allText(), found = lintAll(rows).filter((f) => !rule || f.rule === rule), by = {}; for (const f of found) by[f.rule] = (by[f.rule] ?? 0) + 1;
  if (args.includes('--json')) console.log(JSON.stringify({ lines: rows.length, by, found }, null, 1));
  else { console.log(`${rows.length} lines of text in ${new Set(rows.map((r) => r.id)).size} maps; findings by rule: ${JSON.stringify(by)}`); for (const f of found.slice(0, +(args.find((a) => a.startsWith('--top='))?.slice(6) ?? 60))) console.log(`${f.id} ${f.kind}${f.mid ? ' ' + f.mid : ''} [${f.rule}] ${f.why}: ${f.text.slice(0, 150)}`); }
}
