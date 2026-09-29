// Bake an asset twice and report run-to-run pixel differences (acceptance-test evidence).
import { PNG } from 'pngjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const id = process.argv[2] || 'weapon_flarecannon';
const file = `${import.meta.dirname}/../../assets/baked/${id}.png`;
const run = () => { execSync('node tools/bake.mjs ' + id, { cwd: `${import.meta.dirname}/../..`, stdio: 'ignore' }); return PNG.sync.read(fs.readFileSync(file)); };
const a = run(), b = run();
let n = 0, max = 0; for (let i = 0; i < a.data.length; i++) { const d = Math.abs(a.data[i] - b.data[i]); if (d) { n++; if (d > max) max = d; } }
console.log(JSON.stringify({ id, differingBytes: n, totalBytes: a.data.length, maxChannelDelta: max }));
