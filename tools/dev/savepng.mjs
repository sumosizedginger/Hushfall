// Screenshot to a file, tolerant of a transient Windows file lock. A tracked review PNG can be held open for a moment by another process (an editor's diff view, a
// file watcher, antivirus): puppeteer's own `screenshot({ path })` then throws "UNKNOWN: unknown error, open ..." and aborts a multi-minute gate for a reason that has
// nothing to do with the game. Capture to memory once, then retry the WRITE a few times; a file that stays locked still fails loudly (never silently skipped).
import fs from 'node:fs';

const TRANSIENT = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES', 'EMFILE']);
export async function savePng(page, file, { tries = 6 } = {}) {
  const buf = await page.screenshot();
  for (let i = 1; ; i++) {
    try { fs.writeFileSync(file, buf); return file; }
    catch (e) { if (!TRANSIENT.has(e.code) || i >= tries) throw e; await new Promise((r) => setTimeout(r, 250 * i)); }
  }
}
