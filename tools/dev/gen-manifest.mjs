// One-time bootstrap of CAMPAIGN_MANIFEST.json. After creation the manifest is hand-edited; this refuses to overwrite it.
import fs from 'node:fs';
const outUrl = new URL('../../CAMPAIGN_MANIFEST.json', import.meta.url);
if (fs.existsSync(outUrl)) { console.error('CAMPAIGN_MANIFEST.json exists; refusing to overwrite'); process.exit(1); }

// "Name | gameplay thesis | narrative purpose"
const EPISODES = [
  { title: 'Port Marrow', theme: 'Fog-bound harbour town on the first night of the Hush. Human scale, salt and lamplight.',
    maps: [
      'Marrow Quay | Teach movement and the flare cannon on a quiet pier that turns wrong; first Tollbearers; the tower bell glimpsed | Normal life ends; the Hush becomes audible',
      'Customs Hall | Key hunt through a looping hall with ambush closets | Evidence of the harvest: manifests, bodies counted twice',
      'Fishmarket Rows | Dense stalls, flanking pressure, sightline management | The town tried to flee and was herded',
      'The Drowned Chandlery | Flooded cellars, water hazard, first secret exit | Alien residue in the water table',
      'Lamplighter Hill | Vertical switchback streets, ranged pressure from above | Survivors signalling by lamp',
      'Ferry Terminal | Wide open set-piece, first elite | The evacuation that never left',
      'Signal House | Tight interior, scarce ammo, radio narrative | First clear transmission: the Vael intent',
      'Bell Tower of St. Orrin | First Cantor encounter; sever the ring | The Bell is a machine; Episode 1 climax',
    ],
    secret: 'The Lighthouse Cellar | Quiet cache room behind an unremarkable wall | Warden Calder family history' },
  { title: 'The Salt Works', theme: 'Industrial evaporation works and rail yards repurposed as processing.',
    maps: [
      'Brine Gate | Checkpoint assault across open ground | The processing site is guarded and organised',
      'Evaporation Pans | Open salt flats with hazard channels | Hunting parties working the pans',
      'Rail Yard | Moving-train route puzzle under fire | Bodies shipped inland by rail',
      'Kiln Row | Heat hazards, narrow furnaces, secret exit | Kilns used to cook Tollbearer shells',
      'The Cradle Annex | First cradle-pod reveal, stealth-to-brawl | The Grafting mechanism shown, not told',
      'Pump Cathedral | Verticality and catwalk combat | The Works drains something from the sea',
      'Slurry Undercroft | Dark close-quarters, light management | The Hush is thickest underground',
      'The Grafting Floor | Boss: Graft-Mother | Episode 2 climax; the production line breaks',
    ],
    secret: 'The Rime Vault | Cold-storage vault, puzzle-lite | Pre-invasion Marrow research the Wardens hid' },
  { title: 'The Choir Ships', theme: 'Living alien vessels grown from grafted bell-chitin.',
    maps: [
      'Landing Scar | Crater approach, crossfire lanes | First look at a grounded Choir Ship',
      'Ribbed Corridors | Organic maze, door-gates that breathe | The ship is a body',
      'Gill Gardens | Spore hazards, snipers on high ledges | Where captured humans are kept docile',
      'Marrow Nave | Cathedral-scale arena, secret exit | The ship rehearses the Song',
      'Resonance Loom | Timing platforms and sound-lock doors | How the Hush is tuned',
      'The Choir Loft | Suppression enemies, cover-to-cover advance | Tollbearers arranged as instruments',
      'Spore Foundry | Enemy spawner denial | Mass production of the next wave',
      "The Cantor's Throat | Boss: Grand Cantor | Episode 3 climax; the Choir Ship falls",
    ],
    secret: "The Choirless Chamber | Silent inverse of the ship | A Vael defector's message" },
  { title: 'The Hollow Sky', theme: 'Orbital wrecks and the Gate the Song is opening.',
    maps: [
      'Ascent Tether | Vertical climb with falling hazards | Leaving the world behind',
      'Wreck Belt | Low-gravity drifts between hulks | Earlier invasions, other worlds',
      'Cold Dock | Vacuum doors and airlock puzzles | Vael staging area for the main fleet',
      'Mirror Array | Light-beam routing, secret exit | The Gate is focused through a mirror array',
      'Drift Orchard | Open zero-g arena | The Vael grow Tollbearers in orbit',
      "Gatekeeper's Approach | Gauntlet of elites | The last defence",
      'The Hollow Stair | Long vertical set-piece | The Gate itself, seen',
      'Gate Warden | Boss: Gate Warden; the Gate opens | Campaign One climax; the player follows through',
    ],
    secret: "The Quiet Room | Contemplative, near enemy-free | Ines's choice, foreshadowed" },
];
// Campaign Two "The Long Descent": Act A Threshold 1-8, Act B Sounding Deep 9-16, Act C Hive-Song 17-24, Act D Root Bell 25-30
const C2 = [
  'Threshold Beach | Arrival firefight with no retreat | The Gate exit into Anselm-Nine',
  'Glass Steppe | Wide-open traversal | The Vael world is dying and quiet',
  'Cantor Outpost | Fortified assault | First view of Vael as people',
  'Tuning Fork Fields | Sound-lure hazards | The Song is an economy',
  'The Reliquary Road | Ambush corridors | Tollbearer graves from earlier worlds',
  'Chitin Aqueduct | Water-traversal combat | The Vael lifeline',
  'Bellwright Yard | Enemy factory denial | Where the Bells are grown',
  'Threshold Ascent | Vertical assault | Act A close: entering the Sounding Deep',
  'Sounding Deep Gate | Cavern-city entry | Act B: Vael civilisation at scale',
  'Echo Markets | Dense crowds of neutral-seeming Vael | Civilians who do not want the Song',
  'Undercantor Halls | Politics through architecture | The Vael are divided',
  'The Drowned Choir | Flooded set-piece, secret exit | A mass of earlier conversions',
  'Lantern Ossuary | Dark maze, light management | Remains of lost expeditions',
  'Harmonic Gardens | Environmental audio puzzles | The Song gardened like a crop',
  'Ash Basilica | Elite gauntlet | Vael zealots who want the Grafting',
  'Sounding Deep Heart | Boss: Sub-Cantor | Act B close',
  'The Hive-Song Approach | Long approach under suppression | Act C: the Song organ system',
  'Nerve Cathedral | Neural-lattice traversal | The Song runs on stolen minds',
  'Bone Loom | Timing and gates | Manufacture of Tollbearers at scale',
  'Vein Rail | Fast-traversal set-piece | The Song circulates',
  'Pulse Foundry | Heavy industry fight | Weaponised human resonance',
  'Mourning Halls | Emotional low-point, low ammo | Loss of allies',
  'The Reprise | Callback map to Port Marrow | The Song reproduces the harbour town',
  'Choir of One | Boss: Hive Cantor | Act C close',
  'Root Bell Descent | Long vertical dive | Act D: the source of the Song',
  'Silent Roots | Stealth-to-brawl | Vael hold-outs in silence',
  'Fault Line | Collapsing environment | The world answers the Bell',
  'Last Tide | Wave-survival set-piece | The final stand',
  'The Root Bell | Boss: the Root Bell, multi-phase | The Song is broken',
  'The Unrung Gate | Epilogue traversal, no combat | Ending sequence; Ines closes the Gate',
];
const C2_SECRETS = [
  "The Silent Orchard | Hidden garden, resource cache | A Vael grave-tender's testimony",
  "Ines's Lamp | Reflective callback | The lamp from the title art",
];
const C2_SECRET_FROM = [12, 23];   // main-map order holding the secret exit; return goes to order+1

const parse = (line) => { const [name, gameplayThesis, narrativePurpose] = line.split(' | '); return { name, gameplayThesis, narrativePurpose }; };
const n2 = (n) => String(n).padStart(2, '0');
const slots = [];

EPISODES.forEach((ep, ei) => {
  const e = ei + 1;
  ep.maps.forEach((line, i) => {
    const o = i + 1, id = `C1E${e}M${n2(o)}`;
    const next = o < 8 ? `C1E${e}M${n2(o + 1)}` : (e < 4 ? `C1E${e + 1}M01` : 'C2M01');
    slots.push({ id, campaign: 1, episode: e, kind: 'main', order: o, ...parse(line), next, secretExit: o === 4 ? `C1E${e}S01` : null, status: 'PLANNED' });
  });
  slots.push({ id: `C1E${e}S01`, campaign: 1, episode: e, kind: 'secret', order: 9, ...parse(ep.secret), next: null, returnsTo: `C1E${e}M05`, enteredFrom: `C1E${e}M04`, status: 'PLANNED' });
});
C2.forEach((line, i) => {
  const o = i + 1, si = C2_SECRET_FROM.indexOf(o);
  slots.push({ id: `C2M${n2(o)}`, campaign: 2, episode: null, kind: 'main', order: o, ...parse(line), next: o < 30 ? `C2M${n2(o + 1)}` : null, secretExit: si >= 0 ? `C2S${n2(si + 1)}` : null, status: 'PLANNED' });
});
C2_SECRETS.forEach((line, i) => {
  const from = C2_SECRET_FROM[i];
  slots.push({ id: `C2S${n2(i + 1)}`, campaign: 2, episode: null, kind: 'secret', order: 31 + i, ...parse(line), next: null, returnsTo: `C2M${n2(from + 1)}`, enteredFrom: `C2M${n2(from)}`, status: 'PLANNED' });
});

const manifest = {
  schema: 1,
  title: 'HUSHFALL',
  note: 'Design intent only. `status` here is NOT authoritative: published status is derived from validation/maps/*.json by `npm run validate`.',
  campaigns: [
    { id: 1, name: 'Port Marrow to the Hollow Sky', episodes: EPISODES.map((ep, i) => ({ episode: i + 1, title: ep.title, theme: ep.theme })) },
    { id: 2, name: 'The Long Descent', acts: ['A: Threshold (1-8)', 'B: The Sounding Deep (9-16)', 'C: The Hive-Song (17-24)', 'D: The Root Bell (25-30)'] },
  ],
  maps: slots,
};
fs.writeFileSync(outUrl, JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote', slots.length, 'slots');
