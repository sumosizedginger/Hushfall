// STORY STATISTICS (PT-070, R17): the repeated shapes of the text, in numbers, so the coherence pass cuts what is really repeated and a test can hold it down afterwards.
//   node tools/dev/story-stats.mjs [--json]      read-only, node only. Reads the shipped maps (messages, intro, outro, objectives in triggers) and the cards.
import fs from 'node:fs';
import path from 'node:path';
import { ENDINGS, COLD_OPEN } from '../../src/game/ending.js';
import { SCENES } from '../../src/game/scenes.js';

const root = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const maps = manifest.maps.map((m) => ({ m, raw: JSON.parse(fs.readFileSync(path.join(root, 'maps', m.id + '.json'), 'utf8')) }));

/** every string the player reads, tagged by channel */
export function allText() {
  const rows = [];
  for (const { m, raw } of maps) {
    for (const l of raw.intro?.lines ?? []) rows.push({ map: m.id, ch: 'intro', speaker: '', text: l });
    for (const x of raw.messages ?? []) rows.push({ map: m.id, ch: 'message', speaker: x.speaker ?? '', text: x.text, id: x.id });
    if (raw.outro) rows.push({ map: m.id, ch: 'outro', speaker: '', text: raw.outro });
    const walk = (a) => { for (const x of a ?? []) { if (x && typeof x === 'object') { if (typeof x.objective === 'string') rows.push({ map: m.id, ch: 'objective', speaker: '', text: x.objective }); if (Array.isArray(x.do)) walk(x.do); } } };
    walk(raw.triggers?.flatMap((t) => t.do ?? [])); walk(raw.switches?.flatMap((s) => (Array.isArray(s.do) ? s.do : [])));
  }
  for (const c of COLD_OPEN.cards) rows.push({ map: 'COLD', ch: 'card', speaker: c.who, text: c.text });
  for (const [k, e] of Object.entries(ENDINGS)) for (const c of e.cards) rows.push({ map: 'END' + k, ch: 'card', speaker: c.who, text: c.text });
  for (const s of SCENES) for (const l of s.lines ?? []) rows.push({ map: s.map, ch: 'scene', speaker: l.who ?? '', text: l.text });
  return rows;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3);
const jaccard = (a, b) => { const A = new Set(norm(a)), B = new Set(norm(b)); if (!A.size || !B.size) return 0; let i = 0; for (const w of A) if (B.has(w)) i++; return i / (A.size + B.size - i); };

export function stats() {
  const rows = allText(), count = (re) => rows.filter((r) => re.test(r.text)).length, S = {};
  S.lines = rows.length; S.messages = rows.filter((r) => r.ch === 'message').length;
  S.whatever = count(/\bwhatever\b/i);
  S.nobody = count(/\b(nobody|no one)\b/i);
  S.notXbutY = count(/\bnot [^.;:]{1,40}[,;] (it|they|that|this) (is|are|was|were)\b|\bnot only\b|\bnot just\b/i);
  S.meta = count(/\b(episode|act) (one|two|three|four|1|2|3|4)\b|\bthe (first|second|third|last) act\b/i);
  S.openers = rows.filter((r) => r.ch === 'message' && r.speaker === 'SIGNAL HOUSE' && /^Calder, the [A-Z]/.test(r.text)).length;
  S.nextOutros = rows.filter((r) => r.ch === 'outro' && /^Next:/.test(r.text)).length;
  S.hullControl = rows.filter((r) => r.speaker === 'HULL' && /\b(press|click|key [A-Z]\b|the lantern is L|the mark on the screen|\(L\)|\(E\))/i.test(r.text)).length;
  S.exclaim = count(/!/);
  S.questionEnd = count(/\?\s*$/);
  // the same fact said twice inside one map, across channels: an outro or an intro line that overlaps a message
  S.dupOutroMessage = []; S.dupIntroMessage = [];
  const byMap = {}; for (const r of rows) (byMap[r.map] ??= []).push(r);
  for (const [map, list] of Object.entries(byMap)) {
    const msgs = list.filter((r) => r.ch === 'message');
    for (const o of list.filter((r) => r.ch === 'outro')) for (const x of msgs) { const j = jaccard(o.text, x.text); if (j >= 0.34) S.dupOutroMessage.push({ map, j: +j.toFixed(2), outro: o.text, message: x.text }); }
    for (const o of list.filter((r) => r.ch === 'intro')) for (const x of msgs) { const j = jaccard(o.text, x.text); if (j >= 0.4) S.dupIntroMessage.push({ map, j: +j.toFixed(2), intro: o.text, message: x.text }); }
  }
  // a phrase of four or more words used in two or more different maps
  const grams = new Map();
  for (const r of rows) { const w = r.text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean); for (let i = 0; i + 5 <= w.length; i++) { const g = w.slice(i, i + 5).join(' '); const e = grams.get(g) ?? new Set(); e.add(r.map); grams.set(g, e); } }
  S.sharedPhrases = [...grams.entries()].filter(([, s]) => s.size >= 3).map(([g, s]) => ({ phrase: g, maps: s.size })).sort((a, b) => b.maps - a.maps).slice(0, 25);
  return S;
}

if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('story-stats.mjs')) {
  const S = stats();
  if (process.argv.includes('--json')) console.log(JSON.stringify(S, null, 1));
  else {
    const { dupOutroMessage, dupIntroMessage, sharedPhrases, ...n } = S;
    console.log(JSON.stringify(n));
    console.log(`outro overlaps a message: ${dupOutroMessage.length}`); for (const d of dupOutroMessage) console.log(`  ${d.map} ${d.j}  OUTRO: ${d.outro.slice(0, 90)}\n        MSG:   ${d.message.slice(0, 90)}`);
    console.log(`intro overlaps a message: ${dupIntroMessage.length}`); for (const d of dupIntroMessage) console.log(`  ${d.map} ${d.j}  INTRO: ${d.intro.slice(0, 90)}\n        MSG:   ${d.message.slice(0, 90)}`);
    console.log('phrases (5 words) used in 3+ maps:'); for (const p of sharedPhrases) console.log(`  ${String(p.maps).padStart(2)}  ${p.phrase}`);
  }
}
