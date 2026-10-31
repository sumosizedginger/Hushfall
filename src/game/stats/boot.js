// THE STATS, IN THE BROWSER (PT-077): load sql.js (SQLite compiled to WebAssembly; MIT licence, THIRD_PARTY_NOTICES.md) and the browser's IndexedDB, then open the stats service. Browser only (Vite's `?url`).
// Any failure here only switches the stats off: the game never waits on them or stops because of them (main.js gives this a few seconds and goes on without it).
import { StatsService } from './service.js';

/** the stats' place in IndexedDB: one database 'hushfall-stats', one store, one key holding the exported bytes. A write is only "done" when its transaction completes. */
export function idbStore(name = 'hushfall-stats', storeName = 'stats', key = 'db') {
  const idb = globalThis.indexedDB; if (!idb) return null;
  const open = () => new Promise((res, rej) => { const rq = idb.open(name, 1); rq.onupgradeneeded = () => rq.result.createObjectStore(storeName); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error ?? new Error('IndexedDB would not open')); });
  return {
    async load() { const db = await open(); try { return await new Promise((res, rej) => { const rq = db.transaction(storeName, 'readonly').objectStore(storeName).get(key); rq.onsuccess = () => res(rq.result ? new Uint8Array(rq.result) : null); rq.onerror = () => rej(rq.error); }); } finally { db.close(); } },
    async save(bytes) { const db = await open(); try { await new Promise((res, rej) => { const tx = db.transaction(storeName, 'readwrite'); tx.objectStore(storeName).put(bytes, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error ?? new Error('the write failed')); tx.onabort = () => rej(tx.error ?? new Error('the write was abandoned')); }); } finally { db.close(); } },
    persist: () => (navigator.storage?.persist ? navigator.storage.persist() : Promise.resolve(false)),
  };
}

export async function bootStats(ref) {
  const [mod, wasm] = await Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm-browser.wasm?url')]);
  const initSqlJs = mod.default ?? mod, SQL = await initSqlJs({ locateFile: () => wasm.default });
  return StatsService.open({ SQL, store: idbStore(), ref });
}
