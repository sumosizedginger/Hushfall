// FREEZE F18 (the desktop wrapper, a prototype outside the web build): where a request to the app's own scheme (hushfall://app/<path>) is allowed to read. PURE and node-testable:
// the wrapper serves the game's `dist/` folder through a custom scheme because a module script will not load from file:// in a Chromium page. A path that climbs out of the folder, names a dot file or is not a plain file is refused.
const path = require('node:path');
const fs = require('node:fs');

/** the file a url path names inside `root`, or null. `urlPath` is the path part of the url ("/", "/assets/x.js", "/a/../../b" ...). */
function resolveAppPath(root, urlPath) {
  let p; try { p = decodeURIComponent(String(urlPath || '/').split('?')[0].split('#')[0]); } catch { return null; }
  if (p.includes('\0') || p.includes('\\')) return null;
  if (p === '/' || p === '') p = '/index.html';
  const parts = p.split('/').filter(Boolean);
  if (parts.some((s) => s === '..' || s === '.' || s.startsWith('.'))) return null;
  const abs = path.resolve(root, ...parts), base = path.resolve(root);
  if (abs !== base && !abs.startsWith(base + path.sep)) return null;
  try { return fs.statSync(abs).isFile() ? abs : null; } catch { return null; }
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json' };
const typeOf = (file) => TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
module.exports = { resolveAppPath, typeOf, TYPES };
