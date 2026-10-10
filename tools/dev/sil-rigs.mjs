// Node-only SILHOUETTES of the REAL built rigs as PNG files (no browser, no bake, no GPU): black on white, 100 px per metre, feet on one row, centred: exactly what tools/look/sil-matrix.mjs reads (it also compares them cropped to one
// height). The same job tools/look/shoot-rigs.mjs does with Chrome. The masks themselves come from tools/dev/sil-lib.mjs (tests/silhouettes.test.js uses them directly).
//   node tools/dev/sil-rigs.mjs <outDir> [--yaw=0] [kind ...]     then   node tools/look/sil-matrix.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { FACTORIES } from '../../src/render/models_choir.js';
import { silhouette, SIL } from './sil-lib.mjs';

const args = process.argv.slice(2), outDir = path.resolve(args[0] ?? 'sil-out'), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const kinds = args.slice(1).filter((a) => !a.startsWith('--')), want = kinds.length ? kinds : Object.keys(FACTORIES), yaw = Number(flags.yaw ?? 0);
fs.mkdirSync(outDir, { recursive: true });
for (const kind of want) {
  const m = silhouette(kind, yaw), img = new PNG({ width: SIL.W, height: SIL.H });
  for (let i = 0; i < m.length; i++) { const v = m[i] ? 0 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  fs.writeFileSync(path.join(outDir, `sil_${kind}.png`), PNG.sync.write(img));
}
console.log('wrote', want.length, 'silhouettes ->', outDir);
