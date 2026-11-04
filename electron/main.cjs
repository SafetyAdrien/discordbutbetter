// Coque Electron (meme technologie que Discord Desktop : Chromium + Node).
// Fenetre sans decoration (barre dessinee par l'app), icone de zone de
// notification, instance unique, liens externes dans le navigateur systeme.
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, protocol, net, nativeImage, screen, session, desktopCapturer } = require('electron');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.ELECTRON_DEV_URL || (process.env.ELECTRON_DEV ? 'http://localhost:8080' : null);
const DIST = path.join(__dirname, '..', 'dist');
const ICON = path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.png');

// Dossier de donnees FIGE. Par defaut Electron le derive du "name" de package.json : le renommer (ou changer
// d'appId / productName) ferait repartir l'app d'un profil vide (session, reglages, brouillons perdus). On le fixe
// sur le dossier deja utilise par les versions installees ; il ne depend plus du nom du paquet.
app.setPath('userData', path.join(app.getPath('appData'), 'vite_react_shadcn_ts'));

const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');

// Sauvegarde automatique avant chaque mise a jour : a la premiere ouverture d'une nouvelle version (le build est
// identifie par l'empreinte de dist/index.html), les donnees locales sont copiees dans userData/backups avant que
// l'app ne les ouvre. Les 5 dernieres copies sont conservees.
const BACKUP_ITEMS = ['Local Storage', 'IndexedDB', 'Session Storage', 'Cookies', 'Cookies-journal', 'window-state.json'];
const BACKUPS_KEPT = 5;
function backupBeforeUpdate() {
  try {
    const dir = app.getPath('userData');
    const buildId = require('node:crypto').createHash('sha1').update(fs.readFileSync(path.join(DIST, 'index.html'))).digest('hex').slice(0, 10);
    const marker = path.join(dir, 'last-build.json');
    let last = null;
    try { last = JSON.parse(fs.readFileSync(marker, 'utf8')).buildId; } catch { /* premier lancement */ }
    if (last === buildId) return;
    if (BACKUP_ITEMS.some((n) => fs.existsSync(path.join(dir, n)))) {
      const root = path.join(dir, 'backups');
      const dest = path.join(root, `${new Date().toISOString().replace(/[:.]/g, '-')}_avant-${buildId}`);
      fs.mkdirSync(dest, { recursive: true });
      for (const n of BACKUP_ITEMS) {
        const src = path.join(dir, n);
        if (fs.existsSync(src)) fs.cpSync(src, path.join(dest, n), { recursive: true });
      }
      const old = fs.readdirSync(root).sort().slice(0, -BACKUPS_KEPT);
      for (const o of old) fs.rmSync(path.join(root, o), { recursive: true, force: true });
    }
    fs.writeFileSync(marker, JSON.stringify({ buildId, at: new Date().toISOString() }));
  } catch (e) { console.error('[backup] sauvegarde avant mise a jour impossible :', e.message); }
}

// Wayland natif quand il est disponible ; GPU active par defaut.
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
// WebRTCPipeWireCapturer : capture d'ecran / de fenetre via le portail xdg (Wayland) ; sans lui getDisplayMedia
// ne renvoie aucune source et le partage d'ecran n'apparait jamais.
app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations,WebRTCPipeWireCapturer');

protocol.registerSchemesAsPrivileged([
  // codeCache : le JavaScript compile par V8 est conserve entre deux lancements (demarrage plus rapide des suivants).
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
]);

let win = null;
let tray = null;
let quitting = false;

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); } catch { return {}; }
}
function saveState() {
  if (!win) return;
  const maximized = win.isMaximized();
  const b = maximized ? (loadState().bounds ?? win.getNormalBounds()) : win.getBounds();
  try { fs.writeFileSync(STATE_FILE(), JSON.stringify({ bounds: b, maximized })); } catch { /* disque indisponible */ }
}

function isExternal(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'app:') return false;
    if (DEV_URL && u.origin === new URL(DEV_URL).origin) return false;
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function showMain() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  const st = loadState();
  const visible = st.bounds && screen.getAllDisplays().some((d) => {
    const a = d.workArea; const b = st.bounds;
    return b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y;
  });
  win = new BrowserWindow({
    width: visible ? st.bounds.width : 1280,
    height: visible ? st.bounds.height : 800,
    x: visible ? st.bounds.x : undefined,
    y: visible ? st.bounds.y : undefined,
    minWidth: 940,
    minHeight: 500,
    frame: false,
    show: false,
    backgroundColor: '#2c2d32',
    title: 'Discord but Better',
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  if (st.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());

  // F12 / Ctrl+Maj+I : outils de developpement (profil de performance, console).
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
      e.preventDefault();
    }
  });

  win.loadURL(DEV_URL ?? 'app://localhost/');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (isExternal(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // Fermer = masquer dans la zone de notification (appels et notifications continuent).
  win.on('close', (e) => {
    saveState();
    if (!quitting) { e.preventDefault(); win.hide(); }
  });
  win.on('resize', () => win.webContents.send('desktop:maximized', win.isMaximized()));
  win.on('maximize', () => win.webContents.send('desktop:maximized', true));
  win.on('unmaximize', () => win.webContents.send('desktop:maximized', false));
  win.on('closed', () => { win = null; });
}

function createTray() {
  const img = nativeImage.createFromPath(ICON).resize({ width: 22, height: 22 });
  tray = new Tray(img);
  tray.setToolTip('Discord but Better');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ouvrir', click: showMain },
    { label: 'Quitter', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', showMain);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showMain);
  app.whenReady().then(() => {
    backupBeforeUpdate();
    // app://localhost/... sert dist/ avec repli SPA (BrowserRouter).
    protocol.handle('app', (req) => {
      const { pathname } = new URL(req.url);
      let file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
      if (!file.startsWith(DIST)) return new Response('Forbidden', { status: 403 });
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
      return net.fetch(pathToFileURL(file).toString());
    });

    ipcMain.handle('desktop:minimize', () => win?.minimize());
    ipcMain.handle('desktop:toggle-maximize', () => { if (win?.isMaximized()) win.unmaximize(); else win?.maximize(); });
    ipcMain.handle('desktop:close', () => win?.close());
    ipcMain.handle('desktop:is-maximized', () => !!win?.isMaximized());
    // Zoom de Chromium : sans recalcul JS, quasi instantane.
    ipcMain.handle('desktop:set-zoom', (_e, factor) => { win?.webContents.setZoomFactor(Math.min(5, Math.max(0.25, Number(factor) || 1))); });

    // Profil de performance (Alt+Maj+R dans l'app) : profil CPU JavaScript + trace du moteur
    // (mise en page, style, peinture, rasterisation). Renvoie un resume court.
    let profiling = false;
    let perfBase = [];
    ipcMain.handle('desktop:perf-start', async () => {
      if (!win || profiling) return false;
      profiling = true;
      const dbg = win.webContents.debugger;
      try { dbg.attach('1.3'); } catch { /* deja attache */ }
      await dbg.sendCommand('Profiler.enable');
      await dbg.sendCommand('Profiler.setSamplingInterval', { interval: 500 });
      await dbg.sendCommand('Profiler.start');
      await dbg.sendCommand('Performance.enable');
      perfBase = (await dbg.sendCommand('Performance.getMetrics')).metrics;
      return true;
    });
    ipcMain.handle('desktop:perf-stop', async () => {
      if (!win || !profiling) return null;
      profiling = false;
      const dbg = win.webContents.debugger;
      const out = { js: [], engine: [], longest: [] };
      try {
        const { profile } = await dbg.sendCommand('Profiler.stop');
        const byId = new Map(profile.nodes.map((n) => [n.id, n]));
        const self = new Map();
        profile.samples.forEach((id, i) => {
          const n = byId.get(id);
          if (!n || n.callFrame.functionName === '(idle)') return;
          const url = (n.callFrame.url || '').split('/').slice(-1)[0].split('?')[0];
          const k = `${n.callFrame.functionName || '(anonyme)'} ${url}:${n.callFrame.lineNumber}`;
          self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0));
        });
        out.js = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${(v / 1000).toFixed(0)} ms ${k}`);
        await dbg.sendCommand('Profiler.disable');
      } catch (e) { out.js = [`profil JS indisponible : ${e.message}`]; }
      try {
        const now = (await dbg.sendCommand('Performance.getMetrics')).metrics;
        const base = Object.fromEntries(perfBase.map((m) => [m.name, m.value]));
        const names = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount', 'Nodes'];
        out.engine = names.map((n) => { const m = now.find((x) => x.name === n); if (!m) return null; const d = m.value - (base[n] || 0); return /Duration/.test(n) ? `${(d * 1000).toFixed(0)} ms ${n}` : `${Math.round(d)} ${n}`; }).filter(Boolean);
        await dbg.sendCommand('Performance.disable');
      } catch (e) { out.engine = [`metriques indisponibles : ${e.message}`]; }
      try { dbg.detach(); } catch { /* deja detache */ }
      return out;
    });

    // Partage d'ecran : sans gestionnaire, Electron refuse getDisplayMedia. Sous Wayland le
    // selecteur est celui du systeme (portail) ; sous X11 on partage l'ecran principal.
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } }).then((sources) => {
        if (!sources.length) {
          console.error('[screen-share] aucune source de capture (portail refuse ou annule)');
          return callback({});
        }
        callback({ video: sources[0] });
      }).catch((err) => {
        console.error('[screen-share] getSources a echoue :', err && err.message);
        callback({});
      });
    });

    createWindow();
    createTray();
  });
  app.on('before-quit', () => { quitting = true; saveState(); });
  app.on('window-all-closed', () => { /* reste dans la zone de notification */ });
}
