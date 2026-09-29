// Validation + evidence-derived status. `npm run validate` (exit 1 on structural errors) / `npm run status` (report).
// Map status is DERIVED from validation/maps/<ID>.json; the manifest's own `status` field is never trusted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.env.HUSHFALL_ROOT ? path.resolve(process.env.HUSHFALL_ROOT) : path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
const maps = manifest.maps;
const byId = new Map(maps.map((m) => [m.id, m]));

// ---- topology ----
const main = maps.filter((m) => m.kind === 'main'), secret = maps.filter((m) => m.kind === 'secret');
const c1 = maps.filter((m) => m.campaign === 1), c2 = maps.filter((m) => m.campaign === 2);
if (maps.length !== 68) err(`expected 68 map slots, found ${maps.length}`);
if (c1.length !== 36) err(`Campaign One expected 36, found ${c1.length}`);
if (c2.length !== 32) err(`Campaign Two expected 32, found ${c2.length}`);
if (main.length !== 62) err(`expected 62 main-route maps, found ${main.length}`);
if (secret.length !== 6) err(`expected exactly 6 secret-map slots, found ${secret.length}`);
if (byId.size !== maps.length) err('duplicate map IDs');
for (const e of [1, 2, 3, 4]) {
  const em = c1.filter((m) => m.episode === e);
  if (em.filter((m) => m.kind === 'main').length !== 8 || em.filter((m) => m.kind === 'secret').length !== 1) err(`C1 episode ${e} must have 8 main + 1 secret`);
}
if (c2.filter((m) => m.kind === 'main').length !== 30 || c2.filter((m) => m.kind === 'secret').length !== 2) err('Campaign Two must have 30 main + 2 secret');
const names = new Set();
for (const m of maps) {
  if (!m.name || !m.gameplayThesis || !m.narrativePurpose) err(`${m.id}: missing name/gameplayThesis/narrativePurpose`);
  if (names.has(m.name)) err(`${m.id}: duplicate name "${m.name}"`);
  names.add(m.name);
}
// main chain: walk from C1E1M01, must visit all 62 main maps once and end with next=null at C2M30
{
  const seen = new Set(); let cur = 'C1E1M01';
  while (cur) {
    if (seen.has(cur)) { err(`main route loops at ${cur}`); break; }
    const m = byId.get(cur); if (!m) { err(`main route references missing map ${cur}`); break; }
    if (m.kind !== 'main') err(`main route reaches non-main map ${cur}`);
    seen.add(cur); cur = m.next;
  }
  if (seen.size !== 62) err(`main route visits ${seen.size} maps, expected 62`);
  if (!seen.has('C2M30')) err('main route never reaches C2M30 (final map)');
}
// secret entrances/returns
for (const s of secret) {
  const from = byId.get(s.enteredFrom), back = byId.get(s.returnsTo);
  if (!from || from.kind !== 'main') { err(`${s.id}: invalid enteredFrom ${s.enteredFrom}`); continue; }
  if (from.secretExit !== s.id) err(`${s.id}: ${from.id}.secretExit does not point back`);
  if (!back || back.kind !== 'main') { err(`${s.id}: invalid returnsTo ${s.returnsTo}`); continue; }
  if (from.next !== s.returnsTo) err(`${s.id}: returns to ${s.returnsTo} but ${from.id}.next is ${from.next}`);
}
for (const m of main) if (m.secretExit && byId.get(m.secretExit)?.kind !== 'secret') err(`${m.id}: secretExit ${m.secretExit} is not a secret slot`);

// ---- evidence-derived status ----
const ORDER = ['PLANNED', 'IMPLEMENTED', 'AGENT_VERIFIED', 'COMPLETE'];
function derive(id) {
  const f = path.join(root, 'validation', 'maps', id + '.json');
  if (!fs.existsSync(f)) return { status: 'PLANNED', why: 'no evidence file' };
  let ev; try { ev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { err(`${id}: evidence unreadable: ${e.message}`); return { status: 'PLANNED', why: 'bad evidence' }; }
  if (ev.mapId !== id) err(`${id}: evidence mapId mismatch`);
  const mapFile = path.join(root, 'maps', id + '.json');
  if (ev.mapSha && fs.existsSync(mapFile) && crypto.createHash('sha256').update(fs.readFileSync(mapFile)).digest('hex').slice(0, 16) !== ev.mapSha) return { status: ev.loads === true ? 'IMPLEMENTED' : 'PLANNED', why: 'evidence is stale: map changed since it was verified' };
  const rf = ev.canonicalRoute?.file && path.join(root, ev.canonicalRoute.file);
  if (ev.canonicalRoute?.sha && rf && fs.existsSync(rf) && crypto.createHash('sha256').update(fs.readFileSync(rf)).digest('hex').slice(0, 16) !== ev.canonicalRoute.sha) return { status: ev.loads === true ? 'IMPLEMENTED' : 'PLANNED', why: 'evidence is stale: the canonical route file changed since verification' };
  let status = 'PLANNED', why = 'map does not load';
  if (ev.loads === true) { status = 'IMPLEMENTED'; why = 'loads; verification incomplete'; }
  if (status === 'IMPLEMENTED' && ev.automated?.pass === true && ev.canonicalRoute?.reachedExit === true && ev.canonicalRoute?.file && fs.existsSync(path.join(root, ev.canonicalRoute.file))) { status = 'AGENT_VERIFIED'; why = 'automated pass + canonical route reached exit'; }
  if (status === 'AGENT_VERIFIED' && ev.humanReview?.approved === true && ev.humanReview?.by && ev.humanReview?.date && !(ev.knownBlockers?.length)) { status = 'COMPLETE'; why = 'human review recorded'; }
  return { status, why };
}
const derived = new Map(maps.map((m) => [m.id, derive(m.id)]));
for (const m of maps) if (m.status && ORDER.indexOf(m.status) > ORDER.indexOf(derived.get(m.id).status)) err(`${m.id}: manifest claims ${m.status} but evidence supports ${derived.get(m.id).status}`);

// ---- asset evidence ----
const am = path.join(root, 'assets/baked/manifest.json');
if (fs.existsSync(am)) {
  const a = JSON.parse(fs.readFileSync(am, 'utf8'));
  for (const [id, info] of Object.entries(a.assets)) {
    const f = path.join(root, 'assets/baked', id + '.png');
    if (!fs.existsSync(f)) { err(`asset ${id}: file missing`); continue; }
    const h = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    if (h !== info.sha256) warn(`asset ${id}: file hash differs from assets/baked/manifest.json (re-bake or update; bakes are only tolerance-stable)`);
  }
}

// ---- report ----
const counts = Object.fromEntries(ORDER.map((s) => [s, 0]));
for (const d of derived.values()) counts[d.status]++;
const report = { generatedFrom: 'CAMPAIGN_MANIFEST.json + validation/maps/*.json', slots: maps.length, main: main.length, secret: secret.length, counts, errors, warnings };
fs.mkdirSync(path.join(root, 'validation'), { recursive: true });
fs.writeFileSync(path.join(root, 'validation/campaign.json'), JSON.stringify({ ...report, perMap: Object.fromEntries([...derived].map(([k, v]) => [k, v.status])) }, null, 2) + '\n');
if (process.argv.includes('--status')) {
  console.log(`Maps  PLANNED ${counts.PLANNED}/68  IMPLEMENTED ${counts.IMPLEMENTED}/68  AGENT_VERIFIED ${counts.AGENT_VERIFIED}/68  COMPLETE ${counts.COMPLETE}/68`);
  console.log(`Secret maps in manifest: ${secret.length}/6 (verified: ${secret.filter((s) => ORDER.indexOf(derived.get(s.id).status) >= 2).length})`);
}
for (const w of warnings) console.warn('WARN ', w);
for (const e of errors) console.error('ERROR', e);
console.log(errors.length ? `validate: FAILED (${errors.length} errors)` : `validate: OK (topology ${maps.length} slots: C1 ${c1.length}, C2 ${c2.length}, main ${main.length}, secret ${secret.length})`);
process.exit(errors.length ? 1 : 0);
