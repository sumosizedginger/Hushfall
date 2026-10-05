// One command per map (Gate 3, R2). The fast loop a map goes through from a drawn level to a verdict, in the order that fails soonest:
//   npm run map -- <ID> [--browser]     compile maps-src/<ID>.level.mjs -> maps/<ID>.json, the plan image, (real-game evidence with --browser), verify-map (routes x 3 difficulties,
//                                       reachability, viability, gate-skip, ammo slack, robustness, quality contract), validate -> ONE verdict line and the first failing reason
//   npm run map:new -- <ID>             scaffold maps-src/<ID>.level.mjs, its views and a route stub, and a brief in design/EPISODE<n>.md, from CAMPAIGN_MANIFEST.json (never overwrites)
//   npm run map -- --list               every map that exists, with its derived status
// Status is DERIVED by tools/validate.mjs from the evidence; this tool never types one. COMPLETE is the owner's: an agent never awards it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { listMaps, MAP_ID } from './mapset.mjs';

const root = process.env.HUSHFALL_ROOT ? path.resolve(process.env.HUSHFALL_ROOT) : path.resolve(import.meta.dirname, '..');           // HUSHFALL_ROOT lets the tests scaffold into a scratch project
const args = process.argv.slice(2), node = process.execPath;
const run = (script, ...a) => { const t0 = Date.now(), r = spawnSync(node, [path.join(root, script), ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); return { ok: r.status === 0, code: r.status, out: (r.stdout ?? '') + (r.stderr ?? ''), seconds: (Date.now() - t0) / 1000 }; };
const firstFail = (out) => (out.split('\n').find((l) => /^FAIL\b/.test(l)) ?? out.split('\n').filter(Boolean).slice(-1)[0] ?? '').trim().slice(0, 400);
const derived = () => { const f = path.join(root, 'validation/campaign.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).perMap ?? {} : {}; };

if (args[0] === '--list' || args.length === 0) {
  run('tools/validate.mjs', '--no-bundles'); const st = derived();
  for (const m of listMaps(root)) console.log(`${m.id}  ${(st[m.id] ?? '?').padEnd(15)} ${m.kind.padEnd(6)} routes: ${m.routes.join(', ') || 'none'}${m.hasSource ? '' : '  (no maps-src source)'}  ${m.name ?? ''}`);
  process.exit(0);
}

if (args[0] === 'new') {
  const id = args[1]; if (!MAP_ID.test(id ?? '')) { console.error('usage: npm run map:new -- <ID>   e.g. C1E2M01'); process.exit(2); }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8')), man = manifest.maps.find((m) => m.id === id);
  if (!man) { console.error(`${id} is not in CAMPAIGN_MANIFEST.json (the manifest is the 68-slot design intent; add the slot there first)`); process.exit(2); }
  const src = path.join(root, 'maps-src', id + '.level.mjs'), views = path.join(root, 'maps-src', id + '.views.json'), route = path.join(root, 'routes', id + '.main.route.json');
  for (const f of [src, views, route, path.join(root, 'maps', id + '.json')]) if (fs.existsSync(f)) { console.error(`refusing to overwrite ${path.relative(root, f)}`); process.exit(2); }
  for (const d of ['maps-src', 'routes', 'design']) fs.mkdirSync(path.join(root, d), { recursive: true });
  const ep = manifest.campaigns?.[man.campaign - 1]?.episodes?.find((e) => e.episode === man.episode), epTitle = ep?.title ?? `Campaign ${man.campaign}`;
  const W = 40, H = 30, px = 4, pz = 15, ex = 35, ez = 15;
  fs.writeFileSync(src, [
    `// ${id} ${man.name.toUpperCase()}: ${man.gameplayThesis}. ${man.narrativePurpose}.`,
    `// SCAFFOLD (npm run map:new): a bare room from the player to the exit. Design it: the brief in design/ first, then rooms, objects, triggers, messages, quality. New idea of this map: TODO.`,
    `// Cell coordinates (x = column, z = row); rooms with L.room([x0,z0,x1,z1], { floor, wall }); objects with L.put / L.putAll (legend in tools/mapkit/compile.mjs); see maps-src/C1E1M03.level.mjs.`,
    `import { Level } from '../tools/mapkit/builder.mjs';`,
    ``,
    `const L = new Level(${W}, ${H});`,
    `L.room([2, 12, 37, 18], { floor: '.', wall: '#' });                                      // TODO: the whole map`,
    `L.put(${px}, ${pz}, '@'); L.put(${ex}, ${ez}, '>');`,
    ``,
    `const layers = L.layers();`,
    ``,
    `export default {`,
    `  id: '${id}', name: '${man.name}', version: 1, ceilingHeight: 3.4, par: { time: 600 },                      // TODO: par from the owner's clear times`,
    `  atmosphere: { fog: '#20262e', fogDensity: 0.012, sky: 'overcast' },`,
    `  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },`,
    `  intro: { title: '${man.name.toUpperCase()}', lines: ['TODO: two lines that set the scene.'] },`,
    `  outro: 'TODO: one line toward ${man.next ?? 'the end'}.',`,
    `  objective: 'TODO: the objective line.',`,
    `  ...layers,`,
    `  messages: [],`,
    `  quality: { enemies: [0, 0], botSeconds: [10, 600], mechanics: [], skins: 1 },                                // TODO: the contract this map must meet (see another map's quality block)`,
    `};`, ``,
  ].join('\n'));
  fs.writeFileSync(views, JSON.stringify([{ name: '01-arrival', x: px + 0.5, z: pz + 0.5, yaw: 'east' }], null, 2) + '\n');
  fs.writeFileSync(route, JSON.stringify([{ op: 'goto', at: [ex, ez] }]) + '\n');
  const brief = path.join(root, 'design', `EPISODE${man.episode ?? ''}.md`);
  const entry = `\n**${id.slice(-3)} ${man.name} (${man.kind}): ${man.gameplayThesis}.** New: TODO (ONE new idea the player has not met). ${man.narrativePurpose}. Look: TODO.\n`;
  if (fs.existsSync(brief)) fs.appendFileSync(brief, entry); else fs.writeFileSync(brief, `# Episode ${man.episode ?? ''} — ${epTitle} (design brief)\n\nIntent, not status: status is derived from \`validation/maps/<ID>.json\`.\n\n## Maps\n${entry}`);
  console.log(`scaffolded ${id} ${man.name}:\n  maps-src/${id}.level.mjs\n  maps-src/${id}.views.json\n  routes/${id}.main.route.json\n  design/EPISODE${man.episode ?? ''}.md (brief entry)\nnext: design it, then  npm run map -- ${id} --browser`);
  process.exit(0);
}

// ---- the per-map loop ------------------------------------------------------------------------------------------------------------------
const id = args.find((a) => MAP_ID.test(a)); if (!id) { console.error('usage: npm run map -- <ID> [--browser]   |   npm run map:new -- <ID>   |   npm run map -- --list'); process.exit(2); }
const withBrowser = args.includes('--browser'), steps = [], T0 = Date.now();
const stop = (step, why) => { console.log(`\n${id}: STOPPED at ${step}: ${why}\n  steps: ${steps.map((s) => `${s.name} ${s.seconds.toFixed(1)}s`).join(', ')}`); process.exit(1); };
const step = (name, script, ...a) => { process.stdout.write(`[${id}] ${name} ... `); const r = run(script, ...a); steps.push({ name, seconds: r.seconds }); console.log(r.ok ? `ok (${r.seconds.toFixed(1)}s)` : 'FAILED'); return r; };

if (fs.existsSync(path.join(root, 'maps-src', id + '.level.mjs'))) { const r = step('compile', 'tools/mapkit/compile.mjs', id); if (!r.ok) stop('compile', firstFail(r.out) || r.out.trim().split('\n').slice(0, 3).join(' | ')); }
else if (!fs.existsSync(path.join(root, 'maps', id + '.json'))) stop('compile', `neither maps-src/${id}.level.mjs nor maps/${id}.json exists (npm run map:new -- ${id})`);
step('plan image', 'tools/mapkit/mapview.mjs', id);                                               // appearance aid only: never stops the loop
if (withBrowser) { const r = step('real-game evidence', 'tools/dev/browser-map.mjs', id); if (!r.ok) stop('real-game evidence', firstFail(r.out)); }
const v = step('verify-map', 'tools/verify-map.mjs', id);
const val = step('validate', 'tools/validate.mjs', '--no-bundles'); const status = derived()[id] ?? 'unknown';
const fails = v.out.split('\n').filter((l) => /^FAIL\b/.test(l));
const total = ((Date.now() - T0) / 1000).toFixed(0);
console.log(`\n${id}: ${status} (derived by validate, never typed) in ${total}s${withBrowser ? '' : '  [real-game evidence not run: add --browser]'}`);
if (fails.length) { console.log(`  first failing gate: ${fails[0].slice(0, 300)}${fails.length > 1 ? `\n  (+${fails.length - 1} more: node tools/verify-map.mjs ${id})` : ''}`); process.exit(1); }
if (!val.ok) { console.log(`  validate: ${firstFail(val.out)}`); process.exit(1); }
console.log(`  steps: ${steps.map((s) => `${s.name} ${s.seconds.toFixed(1)}s`).join(', ')}`);
process.exit(status === 'AGENT_VERIFIED' || (!withBrowser && status === 'IMPLEMENTED') ? 0 : 1);
