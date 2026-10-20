// PLAY THE BUILD LOCALLY (PT-071, R23 packaging): serves the production build (dist/) on localhost with the right types, for a tester without a web host, for the desktop wrapper later and for the packaging check.
//   npm run build  then  node tools/dev/serve-dist.mjs [port] [--no-open]      (port 0 = any free port; the address is printed)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..'), dist = path.join(root, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json' };

/** a request path -> a file inside dist, or null (never outside it) */
export function resolveInDist(urlPath, base = dist) {
  let p; try { p = decodeURIComponent(String(urlPath).split('?')[0].split('#')[0]); } catch { return null; }
  if (p.includes('\0')) return null; if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(base, '.' + path.posix.normalize('/' + p.replace(/\\/g, '/')));
  return file.startsWith(path.resolve(base) + path.sep) || file === path.resolve(base) ? file : null;
}

export function makeServer(base = dist) {
  return http.createServer((req, res) => {
    const file = resolveInDist(req.url, base);
    if (!file || req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(file ? 405 : 403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-cache' });
      if (req.method === 'HEAD') return res.end(); fs.createReadStream(file).pipe(res);
    });
  });
}

if (process.argv[1] && process.argv[1].split(String.fromCharCode(92)).join('/').endsWith('serve-dist.mjs')) {
  if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('dist/ has no index.html: run `npm run build` first'); process.exit(1); }
  const args = process.argv.slice(2), port = Number(args.find((a) => /^\d+$/.test(a)) ?? 4173), server = makeServer();
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}/`; console.log(`HUSHFALL is at ${url}  (Ctrl-C stops it)`);
    if (!args.includes('--no-open')) { try { const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]; spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).unref(); } catch { /* the address is printed */ } }
  });
}
