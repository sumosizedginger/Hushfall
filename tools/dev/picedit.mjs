// PT-082: edit the hand-drawn PLAN of a map source (tools/mapkit/sketch.mjs) by coordinates, so a correction lands on the right character.
//   node tools/dev/picedit.mjs <ID> x0,z0,x1,z1,C [x,z,C ...] [--print[=x0,z0,x1,z1]]
// A rectangle (inclusive) or one cell is set to the character C (a space is '_'); --print shows the plan (or a part of it) with a ruler afterwards.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), [id, ...args] = process.argv.slice(2);
const file = path.join(root, 'maps-src', id + '.level.mjs'), src = fs.readFileSync(file, 'utf8');
const open = src.indexOf('String.raw`'), close = src.indexOf('`;', open); if (open < 0 || close < 0) throw new Error(id + ': no String.raw plan');
const head = src.slice(0, open + 'String.raw`'.length), body = src.slice(open + 'String.raw`'.length, close), tail = src.slice(close);
const lines = body.split('\n'); const lead = lines[0] === '' ? 1 : 0;                     // the plan starts on the line after the backtick
const from = args.find((a) => a.startsWith('--from='));                                   // --from=<file>: the whole plan replaced by a picture in a text file
const rows = (from ? fs.readFileSync(from.slice(7), 'utf8').replace(/\s+$/, '').split(/\r?\n/) : lines.slice(lead, lines.length - 1)).map((l) => [...l]);
const set = (x, z, c) => { while (rows.length <= z) rows.push([]); const r = rows[z]; while (r.length <= x) r.push(' '); r[x] = c === '_' ? ' ' : c; };
let print = null;
for (const a of args) {
  if (a.startsWith('--from=')) continue;
  if (a.startsWith('--print')) { print = a.includes('=') ? a.split('=')[1].split(',').map(Number) : [0, 0, 999, 999]; continue; }
  const p = a.split(','); const c = p.pop(); const n = p.map(Number);
  if (n.length === 2) set(n[0], n[1], c); else for (let z = n[1]; z <= n[3]; z++) for (let x = n[0]; x <= n[2]; x++) set(x, z, c);
}
const out = rows.map((r) => r.join('').replace(/\s+$/, ''));
fs.writeFileSync(file, head + (lead ? '\n' : '') + out.join('\n') + '\n' + tail);
if (print) {
  const [x0, z0, x1, z1] = print, w = Math.min(x1, Math.max(...out.map((l) => l.length)) - 1);
  let ruler = '    '; for (let x = x0; x <= w; x++) ruler += x % 10 === 0 ? String((x / 10) % 10) : ' '; console.log(ruler);
  ruler = '    '; for (let x = x0; x <= w; x++) ruler += String(x % 10); console.log(ruler);
  out.forEach((l, z) => { if (z >= z0 && z <= z1) console.log(String(z).padStart(3, ' ') + ' ' + [...l].slice(x0, w + 1).join('')); });
}
