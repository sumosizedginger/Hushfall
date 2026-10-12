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
