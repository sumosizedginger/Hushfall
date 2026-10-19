// THE RECORD (PT-037, the owner: players are going to want the lore and the story). Every message a player receives (a voice on the radio, a log, a placard, a note) is remembered in the run's progress by its id and
// replayed in the pause menu and on the title, map by map, in the order of the campaign. Pure: no DOM, no sim. The text is NOT stored (only `progress.record = { mapId: [messageId, ...] }`): it is read from the map
// at display time, so correcting a line corrects the Record, and a save never carries prose.

/** a message just received on a map -> the progress with it remembered (the same object when it was already there) */
export function recordAdd(progress, mapId, id) {
  if (!mapId || typeof id !== 'string' || !id) return progress;
  const list = progress.record?.[mapId] ?? [];
  if (list.includes(id) || list.length >= 400) return progress;
  return { ...progress, record: { ...(progress.record ?? {}), [mapId]: [...list, id] } };
}

/** a found document (a log, a placard, a ledger, a note, a drawing) as opposed to a voice: the Record sets them apart */
export const isDocument = (speaker) => /\b(LOG|LOGS|NOTE|NOTES|NOTICE|MANIFEST|LEDGER|REGISTER|BOOK|DRAWING|PLACARD|BOARD|INSCRIPTION|PLATE|TALLY)\b/.test(speaker || '');

/**
 * The Record as the screen shows it: a group per map that has entries, in manifest order, each entry resolved from the map's own messages in the order the MAP lists them (the order a player meets them).
 * `maps` = { id: map with .messages }, `manifest` = CAMPAIGN_MANIFEST. A message that no longer exists is skipped. -> [{ mapId, name, campaign, entries: [{ id, speaker, text, document }] }]
 */
export function recordView(manifest, maps, progress) {
  const rec = progress?.record ?? {}, out = [];
  for (const m of manifest.maps) {
    const seen = rec[m.id]; if (!seen?.length) continue;
    const msgs = maps[m.id]?.messages ?? [];
    const entries = msgs.filter((x) => seen.includes(x.id)).map((x) => ({ id: x.id, speaker: x.speaker || '', text: x.text, document: isDocument(x.speaker) }));
    if (entries.length) out.push({ mapId: m.id, name: m.name, campaign: m.campaign, entries });
  }
  return out;
}

/** how many messages the Record holds, and how many of them are found documents */
export function recordCounts(view) {
  let all = 0, docs = 0;
  for (const g of view) for (const e of g.entries) { all++; if (e.document) docs++; }
  return { all, docs };
}

// ---- PT-054 (the owner, 2026-10-19: "no way to tell when or where it was said"; the Journal "does not track items or weapons you pick up"): WHEN and WHERE, and what was picked up. Both live in the run's progress, next to the Record, as small arrays of numbers.
//   progress.recordAt = { mapId: { messageId: [seconds into the level, cell x, cell z] } }          the LATEST receipt of each message (a replayed map overwrites it: the Log of the map being played is about this attempt)
//   progress.found    = { mapId: [[pickup kind, seconds, cell x, cell z], ...] }                    the ledger of the attempt being played (a fresh start of the map empties it; a save carries it); at most FOUND_MAX entries, the oldest dropped first
export const FOUND_MAX = 300;
/** where and when a message arrived: the player's seconds into the level and cell */
export function recordAtAdd(progress, mapId, id, t, cx, cz) {
  if (!mapId || typeof id !== 'string' || !id || ![t, cx, cz].every(Number.isFinite)) return progress;
  const at = progress.recordAt?.[mapId] ?? {}; if (!(id in at) && Object.keys(at).length >= 400) return progress;
  return { ...progress, recordAt: { ...(progress.recordAt ?? {}), [mapId]: { ...at, [id]: [Math.max(0, Math.round(t)), Math.round(cx), Math.round(cz)] } } };
}
/** a pickup: the kind, when, where */
export function foundAdd(progress, mapId, kind, t, cx, cz) {
  if (!mapId || typeof kind !== 'string' || !kind || ![t, cx, cz].every(Number.isFinite)) return progress;
  const list = [...(progress.found?.[mapId] ?? []), [kind, Math.max(0, Math.round(t)), Math.round(cx), Math.round(cz)]]; while (list.length > FOUND_MAX) list.shift();
  return { ...progress, found: { ...(progress.found ?? {}), [mapId]: list } };
}
/** a fresh start of a map: its ledger and the times of its messages belong to the attempt before */
export function attemptReset(progress, mapId) {
  if (!progress?.found?.[mapId] && !progress?.recordAt?.[mapId]) return progress;
  const { [mapId]: _f, ...found } = progress.found ?? {}, { [mapId]: _r, ...recordAt } = progress.recordAt ?? {}, out = { ...progress };
  if (Object.keys(found).length) out.found = found; else delete out.found; if (Object.keys(recordAt).length) out.recordAt = recordAt; else delete out.recordAt; return out;
}
