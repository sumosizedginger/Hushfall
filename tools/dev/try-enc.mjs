// Tries encounter-kit lines on one map WITHOUT keeping them (PT-052 Level B stragglers): each variant is a list of lines for the `ENC` block of the source; for every variant the source is rewritten, the roster plan is tried against the gates through
// `tune-roster.mjs`, and the source is put back. Prints the verdict of each. Node only.
//   node tools/dev/try-enc.mjs <ID> '<roster plan json>' '<line;line;...>' ['<line;line>' ...] [--drops=1.3]     (--drops also tries a different `drops.scale`)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..'), argv = process.argv.slice(2), dropsArg = argv.find((a) => a.startsWith('--drops='))?.split('=')[1], [id, plan, ...variants] = argv.filter((a) => !a.startsWith('--drops='));
if (!id || !plan || !variants.length) { console.error("usage: try-enc.mjs <ID> '<plan json>' '<ENC line;ENC line>' ..."); process.exit(2); }
const file = path.join(root, 'maps-src', id + '.level.mjs'), original = fs.readFileSync(file, 'utf8'), eol = original.includes('\r\n') ? '\r\n' : '\n', anchor = 'const ENC = new Encounters(L);';
if (original.split(anchor).length !== 2) { console.error('no single ENC anchor'); process.exit(1); }
try {
  for (const v of variants) {
    let text = original.replace(anchor, () => anchor + eol + v.split(';').map((l) => l.trim()).filter(Boolean).join(eol)); if (dropsArg) text = text.replace(/MAP.drops = { scale: [0-9.]+/, () => 'MAP.drops = { scale: ' + dropsArg); fs.writeFileSync(file, text);
    const r = spawnSync(process.execPath, ['tools/dev/tune-roster.mjs', id, plan], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
    console.log('variant: ' + v); console.log((r.stdout || r.stderr).split('\n').filter((l) => /^ {3}/.test(l)).join('\n'));
  }
} finally { fs.writeFileSync(file, original); }
