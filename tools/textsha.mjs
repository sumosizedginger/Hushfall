// Content hashes for evidence freshness. Text files are hashed with CRLF folded to LF, so a checkout with different line endings (git autocrlf on Windows) does not turn
// every piece of evidence stale (audit R11). Used by verify-map, validate and the browser check so they always agree.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const fold = (buf) => Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
/** 16 hex chars of sha256 over the file's text, line endings folded */
export const textSha = (file) => crypto.createHash('sha256').update(fold(fs.readFileSync(file))).digest('hex').slice(0, 16);
/** hash of every source file of the simulation (src/engine/*.js): evidence produced by other engine code is stale */
export function engineSha(root) {
  const dir = path.join(root, 'src/engine'), h = crypto.createHash('sha256');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js')).sort()) h.update(f).update(fold(fs.readFileSync(path.join(dir, f))));
  return h.digest('hex').slice(0, 16);
}
