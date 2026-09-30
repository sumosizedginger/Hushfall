// A05: cross-check numeric claims in review/gate-2/README.md against the evidence files. Run: node review/gate-2/audit/repro/a05_readme_numbers.mjs
import fs from 'node:fs';
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const readme = fs.readFileSync('review/gate-2/README.md', 'utf8');
const rows = [...readme.matchAll(/^\| (C1E1\w+) \| ([^|]+) \| (\w+) \| (\d+) \| ([\d.]+) \| (\d+)\/(\d+)\/(\d+) \| ([^|]+) \|$/gm)];
let mism = 0;
for (const r of rows) {
  const [, id, , , en, bot, de, dn, dh, runner] = r; const v = J(`validation/maps/${id}.json`);
  const exp = { en: v.counts.enemies, bot: v.viability.normal.fighter.seconds, de: v.viability.easy.fighter.damage, dn: v.viability.normal.fighter.damage, dh: v.viability.hard.fighter.damage, run: `${v.viability.normal.runner.result}, ${v.viability.normal.runner.damage} damage` };
  const ok = +en === exp.en && +bot === exp.bot && +de === exp.de && +dn === exp.dn && +dh === exp.dh && runner.trim() === exp.run;
  if (!ok) { mism++; console.log('MISMATCH', id, JSON.stringify({ readme: [en, bot, de, dn, dh, runner.trim()], evidence: exp })); }
  const rs = ['easy', 'normal', 'hard'].map((d) => `${d}: ${v.viability[d].runner.result} (${v.viability[d].runner.damage} dmg)`).join(', ');
  console.log(id, 'passive runner ->', rs);
}
console.log('README table rows checked:', rows.length, 'mismatches:', mism);
const bc = J('validation/browser-check.json'), aq = J('review/gate-2/audio-qa.json');
console.log('browser checks', bc.checks.length, 'ok', bc.checks.filter((c) => c.ok).length, '| route pairs', Object.keys(bc.gate2Routes).length, 'all identical:', Object.values(bc.gate2Routes).every((r) => r.ok && r.ticks === r.nodeTicks && r.hash === r.nodeHash));
console.log('review/gate-2/audio-qa.json:', JSON.stringify(aq));
const shots = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (p.endsWith('.png')) shots.push(p); } }; walk('review/gate-2/screenshots');
console.log('screenshots png count', shots.length, '(README says 148)');
const kd = fs.readFileSync('review/gate-2/known-defects.json', 'utf8'); console.log('known-defects mentions "53 effects":', /53 effects/.test(kd), '(README says 54 effects)');
