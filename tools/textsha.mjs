// Content hashes for evidence freshness. Text files are hashed with CRLF folded to LF, so a checkout with different line endings (git autocrlf on Windows) does not turn
// every piece of evidence stale (audit R11). Used by verify-map, validate, the browser check, audio QA and the gate bundles so they always agree.
//
// DEPENDENCY MODEL. Evidence is only as fresh as the code that produced it. Source files are grouped into named SETS; every piece of evidence records the hash of the
// sets it depends on (`sources`), and anything whose recorded hash differs from the code on disk is stale. A set that does not exist in a project root (a synthetic test
// fixture) is skipped, so fixtures stay small. What depends on what is `DEPENDS` below (there is exactly one copy).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const fold = (buf) => Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
/** 16 hex chars of sha256 over the file's text, line endings folded */
export const textSha = (file) => crypto.createHash('sha256').update(fold(fs.readFileSync(file))).digest('hex').slice(0, 16);

/** named source sets: directories (recursive, filtered by extension) and single files. `.png` is hashed as raw bytes, everything else as folded text */
export const SOURCE_SETS = {
  engine: { dirs: ['src/engine'], ext: ['.js'] },                                   // the deterministic simulation
  render: { dirs: ['src/render'], ext: ['.js'] },                                   // Three.js view, models, level mesh, post pass, the grounding contract
  game: { dirs: ['src/game'], files: ['index.html', 'vite.config.js'], ext: ['.js'] },   // runtime shell: state machine, UI, input glue, the dev test hook
  audio: { dirs: ['src/audio'], ext: ['.js'] },                                     // procedural synthesis
  assets: { dirs: ['assets/baked'], ext: ['.png', '.json'] },                       // p5/p5.brush baked atlases and skies + their manifest
};
/** which evidence depends on which sets. Map evidence additionally depends on its own map file and its route files (validate.mjs). */
export const DEPENDS = {
  mapSim: ['engine'],                                                               // validation/maps/<ID>.json (bots, viability, reachability run the sim)
  browser: ['engine', 'render', 'game', 'audio', 'assets'],                         // validation/browser-check.json: drives the real game, incl. the render-truth census
  renderGround: ['engine', 'render', 'game', 'assets'],                             // validation/render-ground.json
  audio: ['audio'],                                                                 // validation/audio.json
};

function listFiles(root, spec) {
  const out = [];
  const walk = (abs, rel) => { for (const e of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(path.join(abs, e.name), r); else if (spec.ext.includes(path.extname(e.name))) out.push([r, path.join(abs, e.name)]); } };
  for (const d of spec.dirs ?? []) { const abs = path.join(root, d); if (fs.existsSync(abs)) walk(abs, ''); }
  for (const f of spec.files ?? []) { const abs = path.join(root, f); if (fs.existsSync(abs)) out.push([f, abs]); }
  return out;
}
/** hash of one source set, or null when the project has none of its files */
export function setSha(root, name) {
  const files = listFiles(root, SOURCE_SETS[name]); if (!files.length) return null;
  const h = crypto.createHash('sha256');
  for (const [rel, abs] of files) h.update(rel).update(rel.endsWith('.png') ? fs.readFileSync(abs) : fold(fs.readFileSync(abs)));
  return h.digest('hex').slice(0, 16);
}
/** hashes of every source set present in the project, `{ engine, render, game, audio, assets }` (stamped into evidence as `sources`) */
export const sourceShas = (root) => Object.fromEntries(Object.keys(SOURCE_SETS).map((n) => [n, setSha(root, n)]).filter(([, v]) => v));
/** hash of the simulation: evidence produced by other `src/engine` code is stale (kept: older evidence and tests use this name) */
export const engineSha = (root) => setSha(root, 'engine');
/** hash of every route file of one map (routes/<ID>.*.route.json), or null when it has none */
export function routesSha(root, id) {
  const dir = path.join(root, 'routes'); if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(id + '.') && f.endsWith('.route.json')).sort(); if (!files.length) return null;
  const h = crypto.createHash('sha256'); for (const f of files) h.update(f).update(fold(fs.readFileSync(path.join(dir, f)))); return h.digest('hex').slice(0, 16);
}
/** the sets of `kind` (a key of DEPENDS) whose recorded hash differs from the code on disk. `stamped` = the evidence's `sources` (missing = records nothing = stale) */
export function staleSets(root, stamped, kind) {
  const now = sourceShas(root), out = [];
  for (const n of DEPENDS[kind]) if (now[n] && (stamped ?? {})[n] !== now[n]) out.push({ set: n, recorded: (stamped ?? {})[n] ?? null, now: now[n] });
  return out;
}
export const describeStale = (list) => list.map((s) => (s.recorded ? `src ${s.set} changed` : `no ${s.set} hash recorded`)).join(', ');
