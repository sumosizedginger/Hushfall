// What this player has done, across every campaign run: the best on each map at each difficulty, the challenges met, the documents found. It is kept
// apart from the saves: a new game does not forget it.
// Pure: the shell reads and writes the storage. It drives the map select.
const KEY = 'hushfall.profile';
export const PROFILE_VERSION = 1;
export const DIFFS = ['easy', 'normal', 'hard'];
export const CHALLENGES = {
  noDamage: 'Untouched: no damage taken',
  allSecrets: 'Every secret',
  allKills: 'Every creature',
  underPar: 'Under par',
};
const RANKS = ['C', 'B', 'A', 'S'];
export const defaultProfile = () => ({ version: PROFILE_VERSION, maps: {} });
const num = (x) => (Number.isFinite(x) && x >= 0 ? x : 0);

export function sanitizeProfile(raw) {
  const out = defaultProfile();
  if (!raw || raw.version !== PROFILE_VERSION || typeof raw.maps !== 'object' || !raw.maps) return out;
  for (const [id, m] of Object.entries(raw.maps)) {
    if (!m || typeof m !== 'object' || typeof m.byDiff !== 'object' || !m.byDiff) continue;
    const row = { byDiff: {}, docs: Array.isArray(m.docs) ? m.docs.filter((d) => typeof d === 'string') : [] };
    for (const d of DIFFS) {
      const b = m.byDiff[d];
      if (!b || typeof b !== 'object') continue;
      row.byDiff[d] = {
        rank: RANKS.includes(b.rank) ? b.rank : 'C',
        time: num(b.time),
        kills: num(b.kills),
        secrets: num(b.secrets),
        done: Object.fromEntries(
          Object.keys(CHALLENGES)
            .filter((k) => b.done?.[k] === true)
            .map((k) => [k, true]),
        ),
      };
    }
    out.maps[id] = row;
  }
  return out;
}

export function loadProfile(storage) {
  try {
    const t = storage?.getItem(KEY);
    return t == null ? defaultProfile() : sanitizeProfile(JSON.parse(t));
  } catch {
    return defaultProfile();
  }
}
export function saveProfile(storage, profile) {
  try {
    storage?.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/** the challenges a finished run met */
export function challengesOf(end, par) {
  const t = end.total ?? {};
  return {
    ...(end.damageTaken === 0 ? { noDamage: true } : {}),
    ...(t.secrets > 0 && end.secrets >= t.secrets ? { allSecrets: true } : {}),
    ...(t.enemies > 0 && end.kills >= t.enemies ? { allKills: true } : {}),
    ...(par > 0 && end.time <= par ? { underPar: true } : {}),
  };
}

/** a map finished: the profile with the best of this run kept, nothing ever made worse */
export function recordFinish(profile, mapId, difficulty, { end, rank, par, docs = [] }) {
  const m = profile.maps[mapId] ?? { byDiff: {}, docs: [] },
    was = m.byDiff[difficulty],
    best = {
      rank: was && RANKS.indexOf(was.rank) > RANKS.indexOf(rank) ? was.rank : RANKS.includes(rank) ? rank : 'C',
      time: was ? Math.min(was.time, num(end.time)) : num(end.time),
      kills: Math.max(was?.kills ?? 0, num(end.kills)),
      secrets: Math.max(was?.secrets ?? 0, num(end.secrets)),
      done: { ...(was?.done ?? {}), ...challengesOf(end, par) },
    };
  return {
    ...profile,
    maps: { ...profile.maps, [mapId]: { byDiff: { ...m.byDiff, [difficulty]: best }, docs: [...new Set([...m.docs, ...docs])] } },
  };
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * the map select: every map this player has finished, by campaign and episode, in the order of the campaign. `manifest` = CAMPAIGN, `maps` = id ->
 * parsed map, `isDocument` = (speaker) -> bool.
 * -> [{ title, rows: [{ id, name, par, secretsTotal, docs: { found, total }, diffs: { easy: { rank, time, secrets, done: [labels] } | null, ... } }]
 * }]
 */
export function mapRows(manifest, maps, profile, isDocument) {
  const groups = new Map();
  for (const slot of manifest.maps ?? []) {
    const m = profile.maps[slot.id],
      map = maps[slot.id];
    if (!m || !map || !Object.keys(m.byDiff).length) continue;
    const camp = manifest.campaigns?.find((c) => c.id === slot.campaign),
      title = camp?.episodes?.find((e) => e.episode === slot.episode)?.title ?? camp?.name ?? 'Campaign';
    if (!groups.has(title)) groups.set(title, []);
    const docsTotal = (map.messages ?? []).filter((x) => isDocument(x.speaker || '')).length;
    groups.get(title).push({
      id: slot.id,
      name: map.name,
      par: map.par?.time ? mmss(map.par.time) : null,
      secretsTotal: (map.secrets ?? []).length,
      docs: { found: m.docs.length, total: docsTotal },
      diffs: Object.fromEntries(
        DIFFS.map((d) => {
          const b = m.byDiff[d];
          return [d, b ? { rank: b.rank, time: mmss(b.time), secrets: b.secrets, done: Object.keys(b.done).map((k) => CHALLENGES[k]) } : null];
        }),
      ),
    });
  }
  return [...groups].map(([title, rows]) => ({ title, rows }));
}
