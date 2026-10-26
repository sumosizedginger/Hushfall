// FREEZE F18: THE DESKTOP WRAPPER (a prototype, outside the web build; see README.md). One window around the production build (`npm run build` -> dist/), served through a custom scheme so module scripts and fetch work, with the web page kept exactly as it ships:
// no Node in the page (contextIsolation, no nodeIntegration, sandbox), no new windows, no navigation away from the app's own scheme, pointer lock allowed (it is a first-person game), F11 or Alt+Enter for fullscreen.
// `--smoke` loads the page in a hidden window, waits for the game's title screen and exits 0 (or 1): nothing opens on the screen and the mouse is never touched.
const { app, BrowserWindow, protocol, net, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { resolveAppPath, typeOf } = require('./appfiles.cjs');

const SMOKE = process.argv.includes('--smoke');
const argRoot = process.argv.find((a) => a.startsWith('--root='))?.slice(7);
const ROOT = path.resolve(argRoot ?? path.join(__dirname, '..', '..', 'dist'));
const SCHEME = 'hushfall', ORIGIN = `${SCHEME}://app`;

protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

function serve() {
  protocol.handle(SCHEME, (req) => {
    const file = resolveAppPath(ROOT, new URL(req.url).pathname);
    if (!file) return new Response('not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString()).then((r) => new Response(r.body, { status: r.status, headers: { 'content-type': typeOf(file), 'cache-control': 'no-store' } }));
  });
}

function makeWindow() {
  const win = new BrowserWindow({ width: 1280, height: 720, minWidth: 800, minHeight: 450, backgroundColor: '#05060a', show: !SMOKE, autoHideMenuBar: true, title: 'HUSHFALL',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false, backgroundThrottling: false } });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });         // a link in the page opens in the user's browser, never in the game's window
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN + '/')) e.preventDefault(); });
  win.webContents.on('before-input-event', (e, input) => { if (input.type !== 'keyDown') return; if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  win.loadURL(ORIGIN + '/index.html');
  return win;
}

async function smoke(win) {
  const fail = (m) => { console.error('SMOKE FAIL: ' + m); app.exit(1); };
  const timer = setTimeout(() => fail('no title screen within 60 s'), 60000);
  win.webContents.on('render-process-gone', (_e, d) => fail('renderer gone: ' + d.reason));
  win.webContents.on('console-message', (e) => { if (e.level === 'error') console.error('page error: ' + e.message); });
  win.webContents.once('did-finish-load', async () => {
    try {
      for (let i = 0; i < 120; i++) {
        const state = await win.webContents.executeJavaScript('({ title: !!document.querySelector("#screen-title"), shown: document.body.dataset.screen || "", lock: typeof document.body.requestPointerLock })');
        if (state.title && state.shown) { clearTimeout(timer); console.log('SMOKE OK: screen ' + state.shown + ', pointer lock ' + state.lock); return app.exit(0); }
        await new Promise((r) => setTimeout(r, 500));
      }
      fail('the title screen never showed');
    } catch (err) { fail(String(err)); }
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'pointerLock' || permission === 'fullscreen'));
  serve();
  const win = makeWindow();
  if (SMOKE) smoke(win);
});
app.on('window-all-closed', () => app.quit());
