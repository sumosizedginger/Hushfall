// PT-049 U2 (the owner: "the writing is on the screen while the game continues to move at full speed, so you can't really read" ... "we need a menu or something like in an RPG"), DECIDED 2026-10-15: the simulation clock is NEVER slowed for text.
// A message is shown as before (comms.js), and ALSO written to the Journal's log; the HUD says how many have not been read; Tab opens the Journal and pauses, so the player reads when they want to. This module is the Log's model, PURE (no DOM, no sim):
// the messages received on the map being played, NEWEST FIRST, the ones that arrived since the Journal was last opened marked new, and how many belong to earlier maps (the Record holds them).
import { isDocument } from './record.js';

/** `maps` = { id: map with .messages }, `progress.record` = { mapId: [messageId ...] in the order they were received }, `unread` = a Set of message ids received since the last time the Journal opened */
export function journalLog({ maps, progress, mapId, unread = new Set() }) {
  const ids = progress?.record?.[mapId] ?? [], byId = new Map((maps?.[mapId]?.messages ?? []).map((m) => [m.id, m])), entries = [];
  for (const id of [...ids].reverse()) { const m = byId.get(id); if (m) entries.push({ id, speaker: m.speaker || '', text: m.text, document: isDocument(m.speaker), isNew: unread.has(id) }); }
  let earlier = 0; for (const [k, v] of Object.entries(progress?.record ?? {})) if (k !== mapId && Array.isArray(v)) earlier += v.length;
  return { entries, newCount: entries.filter((e) => e.isNew).length, earlier };
}
/** the tab the Journal opens on: the Log when something has not been read, otherwise the Map */
export const openTab = (newCount) => (newCount > 0 ? 'log' : 'map');
