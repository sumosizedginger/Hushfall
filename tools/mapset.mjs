// The maps that EXIST, discovered from the repository, so no tool needs a hard-coded list (Gate 3, R1/R3: adding a map must not mean editing a tool).
// A map exists when maps/<ID>.json does. Its routes are routes/<ID>.<name>.route.json; its source is maps-src/<ID>.level.mjs; its tour is maps-src/<ID>.views.json.
// Kind and episode come from CAMPAIGN_MANIFEST.json (design intent) with the id as the fallback (C1E1M03 = campaign 1, episode 1, main map 3; ...S01 = secret).
import fs from 'node:fs';
import path from 'node:path';

export const MAP_ID = /^C\dE\d[MS]\d\d$|^C\d[MS]\d\d$/;
const parseId = (id) => { const m = /^C(\d)(?:E(\d))?([MS])(\d\d)$/.exec(id); return m ? { campaign: +m[1], episode: m[2] ? +m[2] : null, kind: m[3] === 'S' ? 'secret' : 'main', number: +m[4] } : null; };

export function listMaps(root) {
  const mapsDir = path.join(root, 'maps'), routesDir = path.join(root, 'routes'), srcDir = path.join(root, 'maps-src');
  const manifestFile = path.join(root, 'CAMPAIGN_MANIFEST.json');
  const manifest = fs.existsSync(manifestFile) ? new Map(JSON.parse(fs.readFileSync(manifestFile, 'utf8')).maps.map((m) => [m.id, m])) : new Map();
  const ids = fs.existsSync(mapsDir) ? fs.readdirSync(mapsDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).filter((id) => MAP_ID.test(id)).sort() : [];
  const routeFiles = fs.existsSync(routesDir) ? fs.readdirSync(routesDir).filter((f) => f.endsWith('.route.json')) : [];
  return ids.map((id) => {
    const p = parseId(id), man = manifest.get(id);
    return {
      id, campaign: p?.campaign ?? null, episode: man?.episode ?? p?.episode ?? null, kind: man?.kind ?? p?.kind ?? 'main', name: man?.name ?? null,
      mapFile: path.join('maps', id + '.json'),
      routes: routeFiles.filter((f) => f.startsWith(id + '.')).map((f) => f.slice(id.length + 1, -'.route.json'.length)).sort(),
      hasSource: fs.existsSync(path.join(srcDir, id + '.level.mjs')), hasViews: fs.existsSync(path.join(srcDir, id + '.views.json')),
    };
  });
}

/** the ids named on a command line: explicit ids, or `--all`; unknown ids are an error (a typo must not silently check nothing) */
export function pickMaps(root, args) {
  const all = listMaps(root);
  if (args.includes('--all')) return all;
  const want = args.filter((a) => MAP_ID.test(a));
  const bad = want.filter((id) => !all.some((m) => m.id === id));
  if (bad.length) throw new Error(`no such map in maps/: ${bad.join(', ')} (compile it first: node tools/mapkit/compile.mjs <ID>)`);
  return want.map((id) => all.find((m) => m.id === id));
}
