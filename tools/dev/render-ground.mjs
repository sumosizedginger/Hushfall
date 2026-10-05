// Standalone render-truth gate: boots the real game in headless Chrome and runs the census (tools/dev/render-census.mjs) on every shipped map.
//   node tools/dev/render-ground.mjs [--root <project dir>] [--out <json>] [--shots <dir>] [--port <n>]
// The same census is part of `npm run browsercheck`; this is the fast way to run only it (about a minute), and `--root` points it at another
// checkout (the "before" evidence is this census run against the unrepaired code in a separate git worktree).
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runRenderCensus } from './render-census.mjs';
import { sourceShas } from '../textsha.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const here = path.resolve(import.meta.dirname, '../..');
const root = path.resolve(arg('root', here)), out = path.resolve(arg('out', path.join(here, 'validation/render-ground.json'))), shots = path.resolve(arg('shots', path.join(here, 'review/render-ground'))), port = +arg('port', 5211);
fs.mkdirSync(shots, { recursive: true });

const checks = [], errors = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail: String(detail) }); console.log(ok ? 'PASS' : 'FAIL', name, '\n     ', String(detail).slice(0, 700)); };
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name) => { await savePng(page, path.join(shots, name + '.png')); return name + '.png'; };
let report = null;
try {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
  report = await runRenderCensus({ T, root, check, shot });
} catch (e) { errors.push('script: ' + (e.stack || e)); }
check('no uncaught exceptions or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
fs.writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), root, commit: sh('git rev-parse --short HEAD'), sources: sourceShas(root), checks: checks.filter((c) => c.name.startsWith('render truth')), errors, report }, null, 2));
await browser.close(); await server.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} render-truth checks passed (report: ${out})`);
process.exit(failed.length ? 1 : 0);
