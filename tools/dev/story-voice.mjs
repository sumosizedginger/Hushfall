// THE VOICE PASS (PT-070, R17): INES and SIGNAL HOUSE are Marrow people talking over a radio, and the text had ONE contraction in 600 spoken lines. Speech with none reads as written, and it also takes away the Tender's own mark
// (design/LORE.md section 4: she uses no contractions). This tool loosens the lines of INES, SIGNAL HOUSE and the lamp-hill survivors; HULL, the Silent, the Tender, the Vael, plates, logs, notes and the cards stay formal.
// Deterministic and idempotent: an occurrence is contracted or not by a hash of its map, message, sentence and pattern, so a second run changes nothing. Vows and the lines on PROTECT stay as they are.
//   node tools/dev/story-voice.mjs [--check] [--show]       (--show prints every change)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..', '..'), check = process.argv.includes('--check'), show = process.argv.includes('--show') || check;
const WHO = new Set(['INES', 'SIGNAL HOUSE', 'SURVIVOR (LAMP)']);
/** a vow, a promise or a line that lands harder uncontracted: left as written (message ids per map) */
const PROTECT = {};
/** and the dry ones that are funnier, or harder, said in full */
const PROTECT_TEXT = ['Thank you, Dad', 'I did not buy anything', 'a great deal of words'];
const BS = String.fromCharCode(92), NL = String.fromCharCode(10);

// [pattern, replacement, probability]; patterns are matched on whole words, case kept for the first letter
const RULES = [
  [/\b(I|you|we|they) do not\b/g, (m, p) => `${p} don't`, 0.8],
  [/\bDo not\b/g, () => "Don't", 0.8],
  [/\bdo not\b/g, () => "don't", 0.8],
  [/\b(does|did|is|are|was|were|has|have|had) not\b/g, (m, v) => ({ does: "doesn't", did: "didn't", is: "isn't", are: "aren't", was: "wasn't", were: "weren't", has: "hasn't", have: "haven't", had: "hadn't" }[v]), 0.75],
  [/\bcannot\b/g, () => "can't", 0.85],
  [/\bwill not\b/g, () => "won't", 0.7],
  [/\bIt is\b(?= [a-zA-Z])/g, () => "It's", 0.7],
  [/\bit is\b(?= [a-zA-Z])/g, () => "it's", 0.7],
  [/\bThat is\b(?= [a-zA-Z])/g, () => "That's", 0.7],
  [/(?<!\b(?:[Pp]ast|[Ff]rom|[Oo]f|[Ii]n|[Oo]n|[Aa]t|[Tt]o|[Ff]or|[Ww]ith|[Aa]bout|[Bb]y|[Ll]ike|[Tt]han) )\bthat is\b(?= [a-zA-Z])/g, () => "that's", 0.6],
  [/\bThere is\b(?= [a-zA-Z])/g, () => "There's", 0.7],
  [/(?<!\b(?:[Dd]own|[Uu]p|[Oo]ver|[Oo]ut|[Ii]n|[Bb]ack|[Ff]rom|[Tt]hrough|[Ss]omewhere|[Hh]ere|[Ww]here) )\bthere is\b(?= [a-zA-Z])/g, () => "there's", 0.6],
  [/\bWhat is\b(?= [a-zA-Z])/g, () => "What's", 0.7],
  [/\bI am\b(?= [a-zA-Z])/g, () => "I'm", 0.7],
  [/\b(you|they|we) are\b(?= [a-zA-Z])/g, (m, p) => `${p}'re`, 0.7],
  [/\bI (will)\b(?= [a-zA-Z])/g, () => "I'll", 0.5],
  [/\b(you|they|we) will\b(?= [a-zA-Z])/g, (m, p) => `${p}'ll`, 0.6],
  [/\bI have (been|seen|heard|found|lost|kept|left|made|got|never)\b/g, (m, v) => `I've ${v}`, 0.7],
];

/** a stable number in [0,1) from a string */
const unit = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };

export function loosen(text, key) {
  const sentences = text.split(/(?<=[.!?:;]) /);
  return sentences.map((s, si) => {
    if (/[A-Z]{4,}/.test(s)) return s;                                   // a plate, a log, a Vael line in capitals
    let out = s;
    RULES.forEach(([re, rep, p], ri) => { out = out.replace(re, (...a) => (unit(`${key}:${si}:${ri}:${a[0]}`) < p ? rep(...a) : a[0])); });
    return out;
  }).join(' ');
}

const quoteAt = (s, pos) => { const ls = s.lastIndexOf(NL, pos) + 1; let q = null; for (let i = ls; i < pos; i++) { const c = s[i]; if (q) { if (c === BS) i++; else if (c === q) q = null; } else if (c === "'" || c === '"' || c === '`') q = c; } return q; };
const escFor = (q, t) => (q === "'" ? t.split("'").join(BS + "'") : q === '"' ? t.split('"').join(BS + '"') : q === '`' ? t.split('`').join(BS + '`').split('${').join(BS + '${') : t);

const ids = fs.readdirSync(path.join(root, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
let changed = 0, lines = 0; const touched = new Set(), missing = [];
for (const id of ids) {
  const json = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'));
  const srcFile = path.join(root, 'maps-src', id + '.level.mjs'), useSrc = fs.existsSync(srcFile), file = useSrc ? srcFile : path.join(root, 'maps', id + '.json');
  let s = fs.readFileSync(file, 'utf8'), dirty = false;
  for (const m of json.messages) {
    if (!WHO.has(m.speaker) || (PROTECT[id] ?? []).includes(m.id) || PROTECT_TEXT.some((p) => m.text.includes(p))) continue;
    const t = loosen(m.text, `${id}:${m.id}`); if (t === m.text) continue;
    lines++; if (show) console.log(`${id} ${m.id}\n  - ${m.text}\n  + ${t}`);
    let did = false;
    const forms = useSrc ? [m.text, m.text.split("'").join(BS + "'")] : [JSON.stringify(m.text).slice(1, -1)];
    for (const f of forms) { let from = 0, i; while ((i = s.indexOf(f, from)) >= 0) { const r = useSrc ? escFor(quoteAt(s, i), t) : JSON.stringify(t).slice(1, -1); s = s.slice(0, i) + r + s.slice(i + f.length); from = i + r.length; did = true; changed++; } }
    if (did) dirty = true; else missing.push(`${id}:${m.id}`);
  }
  if (dirty) { touched.add(id); if (!check) fs.writeFileSync(file, s); }
}
console.log(`${lines} line(s) ${check ? 'would be' : 'were'} loosened in ${touched.size} map(s)${missing.length ? '; NOT FOUND in the source: ' + missing.join(' ') : ''}`);
if (!check) for (const id of touched) { if (!fs.existsSync(path.join(root, 'maps-src', id + '.level.mjs'))) continue; const r = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, encoding: 'utf8' }); if (r.status !== 0) console.log(`compile ${id}: FAILED ${(r.stderr || r.stdout).slice(0, 300)}`); }
if (check && lines) process.exit(1);
