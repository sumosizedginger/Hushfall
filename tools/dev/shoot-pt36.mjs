// REAL-GAME stills of the end of Campaign One (PT-036), in ONE headless-Chrome job (idle priority, two cores: tools/dev/low.ps1):
//   the epilogue's cards typed over the Gate's picture (the first card early and finished, a speaker's card, the last card), the campaign tally with made-up records, the intermission after it
//   node tools/dev/shoot-pt36.mjs [outDir]   -> <outDir>/ending-*.png (default review/pt-036) and the epilogue probe as JSON
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-036'));
fs.mkdirSync(out, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const server = await createServer({ root, logLevel: 'error', server: { port: 5273, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5273/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name) => { await sleep(1400); await savePng(page, path.join(out, 'ending-' + name + '.png')); console.log('shot', name); };
const R = { errors, probes: {} };

// a believable run: mostly A and S, a few B, one C; the records the tally reads
const ranks = ['S', 'A', 'A', 'B', 'A', 'S', 'A', 'B', 'A', 'A', 'S', 'B', 'A', 'C', 'A', 'B', 'S', 'A', 'A', 'B', 'A', 'A', 'S', 'B', 'A', 'B', 'A', 'A', 'S', 'A', 'B', 'A'];
const records = {}; let i = 0;
for (const m of manifest.maps.filter((x) => x.campaign === 1)) {
  if (m.kind === 'main') { records[m.id] = { rank: ranks[i % ranks.length], score: 4000 + i * 90, time: 300 + (i * 37) % 420, kills: 18 + (i * 5) % 30, secrets: i % 3 === 0 ? 2 : 1, paid: 10 }; i++; }
  else if (i % 2 === 0) records[m.id] = { rank: 'B', score: 2500, time: 190, kills: 9, secrets: 0, paid: 5 };
}
await T("t.newGame('normal', 3, { mapId: 'C1E4M08' })"); await T('t.clearOverlays()');
await T(`t.setup_progress({ salvage: 140, records: ${JSON.stringify(records)} })`);
R.probes.start = await T('t.setup_epilogue(0)'); await shot('0-start');
R.probes.card0 = await T('t.setup_epilogue(4.5)'); await shot('1-card0-typed');
R.probes.card1 = await T('t.setup_epilogue(9)'); await shot('2-card1');
R.probes.card4 = await T('t.setup_epilogue(30)'); await shot('3-card4');
R.probes.tally = await T("t.setup_epilogue('tally')"); await shot('4-tally');
R.probes.press = await T('t.press_epilogue()');
await sleep(1200); await T('t.press_epilogue()'); R.probes.after = await T('t.epilogueProbe()'); await shot('5-after-tally');
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
