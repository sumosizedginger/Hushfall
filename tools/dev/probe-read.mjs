// Can a creature and its TELL be read at a distance (the outside playtest of 2026-11-18: "the tells are visible only up close")? The real game, per
// creature kind, on a few maps of different looks: the kind is stood 7, 15 and 22 m in front of the player, awake, and three frames are taken: the
// creature, the creature half-way through its windup (the tell, tells.js), and the room without it. Measured:
//   boxPx = its drawn box on screen; body = pixels it changes (in a window round that box); edge = their mean brightness step;
//   tell = pixels the windup adds over the plain creature (d > 40 of 765); tellStep = their mean brightness step; peak = the largest.
// The pointer lock is refused and counted (must be 0). ONE headless-Chrome job.
//   GPU=1 powershell -File tools/dev/low.ps1 <log> tools/dev/probe-read.mjs <out.json> [MAP ...]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { parseMap } from '../../src/engine/mapformat.js';
import { ENEMIES } from '../../src/engine/defs.js';
import { refuseLock, reportLock } from './lockguard.mjs';

const root = path.resolve(import.meta.dirname, '../..'),
  [outFile, ...named] = process.argv.slice(2);
if (!outFile) {
  console.error('usage: probe-read.mjs <out.json> [MAP ...]');
  process.exit(2);
}
const MAPS = named.length ? named : ['C1E1M01', 'C1E2M02', 'C1E3M01', 'C2M02'];
const KINDS = (process.env.KINDS ?? 'tollbearer,gaunt,bellhand,sexton,wardengraft,gill,chorister,bulwark,acolyte,zealot,resonant').split(',');
const DISTS = (process.env.DISTS ?? '7,15,22').split(',').map(Number);

/** the longest straight clear line from a floor cell of the map (cells), as [x, z, yaw] in metres: where the player stands, facing down it */
function longLine(map, need) {
  const S = map.cell;
  let best = null;
  let h0 = 0;
  // open floor at the SAME height as where the player stands (a creature below a catwalk is not in the picture)
  const clear = (x, z) => {
    const cx = Math.floor(x / S),
      cz = Math.floor(z / S),
      k = map.kind(cx, cz);
    return (k === 'floor' || k === 'outdoor') && Math.abs(map.floor(cx, cz) - h0) < 0.3;
  };
  for (let cz = 1; cz < map.h - 1; cz += 2)
    for (let cx = 1; cx < map.w - 1; cx += 2) {
      const x = (cx + 0.5) * S,
        z = (cz + 0.5) * S;
      h0 = map.floor(cx, cz);
      if (!clear(x, z)) continue;
      for (let a = 0; a < 8; a++) {
        const yaw = (a * Math.PI) / 4,
          fx = -Math.sin(yaw),
          fz = -Math.cos(yaw);
        let d = 0;
        // a lane at least 3 m wide
        while (d < need && clear(x + fx * d, z + fz * d) && clear(x + fx * d - fz * 1.4, z + fz * d + fx * 1.4) && clear(x + fx * d + fz * 1.4, z + fz * d - fx * 1.4)) d += 0.5;
        if (d >= need && !best) best = [x, z, yaw];
      }
      if (best) return best;
    }
  return best;
}

const server = await createServer({ root, logLevel: 'error', server: { port: 5800 + (process.pid % 90), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.GPU
    ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await refuseLock(page);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
await page.evaluate("window.__GAME_TEST__.setSetting('autoQuality', false)");
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; return ${code}; })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const shot = async () => {
  await T('(t.render(0.02), t.render(0.02), 1)');
  await sleep(40);
  return PNG.sync.read(Buffer.from(await page.screenshot({ type: 'png' })));
};
// the window round a creature's drawn box, grown by half its size each way (the tell's glint sits at the head): pixels outside never count
const windowOf = (r, W, H) => {
  const w = (r.x1 - r.x0) * W,
    h = (r.y1 - r.y0) * H;
  return [Math.max(0, Math.floor(r.x0 * W - w * 0.5)), Math.max(0, Math.floor(r.y0 * H - h * 0.5)), Math.min(W, Math.ceil(r.x1 * W + w * 0.5)), Math.min(Math.floor(H * 0.84), Math.ceil(r.y1 * H + h * 0.5))];
};
const dd = (a, b, i) => Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
// the game's own frame loop keeps drawing between screenshots (water, sky, a creature's idle sway), so every count leaves out what changed between
// two frames of the SAME scene (the noise frame), grown by a pixel
const count = (a, b, noiseA, noiseB, win, th) => {
  const [x0, y0, x1, y1] = win,
    W = a.width;
  let n = 0,
    peak = 0,
    edge = 0,
    en = 0;
  const noisy = (x, y) => {
    for (let v = -1; v <= 1; v++)
      for (let u = -1; u <= 1; u++) {
        const q = ((y + v) * W + x + u) * 4;
        if (dd(noiseA, noiseB, q) > th) return true;
      }
    return false;
  };
  for (let y = y0 + 1; y < y1 - 1; y++)
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const i = (y * W + x) * 4,
        d = dd(a, b, i);
      if (d <= th || noisy(x, y)) continue;
      n++;
      if (d > peak) peak = d;
      edge += Math.abs(lum(a.data, i) - lum(b.data, i));
      en++;
    }
  return { n, peak, mean: Math.round(edge / Math.max(1, en)) };
};
const rows = [];
try {
  for (const id of MAPS) {
    const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')));
    const line = longLine(map, Math.max(...DISTS) + 3);
    if (!line) {
      console.log(id, 'no clear line of', Math.max(...DISTS) + 3, 'm');
      continue;
    }
    const [px, pz, yaw] = line,
      fx = -Math.sin(yaw),
      fz = -Math.cos(yaw);
    for (const kind of KINDS) {
      const D = ENEMIES[kind];
      for (const dist of DISTS) {
        await T(`t.newGame('normal', 3, { mapId: '${id}' })`);
        await sleep(200);
        await T(`(t.clearOverlays(), t.setup_clearEnemies(), t.setup_teleport(${px}, ${pz}, ${yaw}), t.setup_player({ hp: 100, hurt: 0, pitch: 0, weapons: ['fists'], weapon: 'fists' }), 1)`);
        const without = await shot(),
          without2 = await shot();
        // it faces the player
        const eid = await T(`t.setup_spawnEnemy('${kind}', ${px + fx * dist}, ${pz + fz * dist}, ${yaw + Math.PI}, 'chase')`);
        const plain = await shot(),
          plain2 = await shot();
        const rect = await T(`t.enemyScreenRect(${eid})`);
        if (!rect) {
          console.log(id, kind, dist, 'not on screen');
          continue;
        }
        // half-way through the windup: the attack's, or the lunge's / charge's when that is the creature's long-range threat
        const f = D.lunge ? `{ lungeT: ${D.lunge.windup * 0.5} }` : D.charge ? `{ chargeT: ${D.charge.windup * 0.5} }` : `{ attackT: ${D.attack.duration * D.attack.windup * 0.5} }`;
        await T(`(t.setup_enemy(${eid}, ${f}), 1)`);
        const told = await shot();
        if (process.env.SAVE) {
          fs.mkdirSync(process.env.SAVE, { recursive: true });
          for (const [n, p] of [['without', without], ['plain', plain], ['told', told]]) fs.writeFileSync(path.join(process.env.SAVE, `${id}-${kind}-${dist}-${n}.png`), PNG.sync.write(p));
        }
        const win = windowOf(rect, plain.width, plain.height),
          body = count(plain, without, without, without2, win, 30),
          tell = count(told, plain, plain, plain2, win, 40);
        const row = {
          map: id,
          kind,
          dist,
          boxPx: Math.round((rect.x1 - rect.x0) * plain.width * (rect.y1 - rect.y0) * plain.height),
          body: body.n,
          edge: body.mean,
          tell: tell.n,
          tellStep: tell.mean,
          peak: tell.peak,
        };
        rows.push(row);
        console.log(JSON.stringify(row));
      }
    }
  }
} finally {
  fs.writeFileSync(path.resolve(outFile), JSON.stringify(rows, null, 1));
  await reportLock(page);
  console.log('errors', JSON.stringify(errors.slice(0, 5)));
  await browser.close();
  await server.close();
}
