/**
 * Sassy Brain — Main Process
 * Multi-provider AI testing tool for developers.
 * Two slot UI: pick any provider + model per slot, run in parallel,
 * with optional per-slot JSON overlay merged into every request body.
 *
 * (c) 2026 Sassy Consulting LLC
 */

const { app, BrowserWindow, shell, Menu, ipcMain, nativeTheme, dialog } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Store = require('electron-store');
const Providers = require('./providers');

// ── Stable machine-bound encryption key ─────────────────────────────
function getEncryptionKey() {
  const keyPath = path.join(app.getPath('userData'), '.machine-id');
  try {
    if (fs.existsSync(keyPath)) {
      const existing = fs.readFileSync(keyPath, 'utf8').trim();
      if (existing && existing.length >= 32) return existing;
    }
  } catch (_) {}
  const fresh = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });
    fs.writeFileSync(keyPath, fresh, { mode: 0o600 });
  } catch (err) {
    console.error('Sassy Brain: failed to persist machine key:', err.message);
  }
  return fresh;
}

// ── Provider keys schema (built from catalog) ──────────────────────
function buildKeysSchema() {
  const props = {};
  for (const p of Providers.CATALOG) {
    if (p.needsKey) props[p.id] = { type: 'string', default: '' };
  }
  return { type: 'object', properties: props, default: {} };
}

const ALLOWED_PROVIDERS = new Set(Providers.CATALOG.map(p => p.id));
const ALLOWED_KEY_PROVIDERS = new Set(
  Providers.CATALOG.filter(p => p.needsKey).map(p => p.id)
);

const ALLOWED_PREFS = new Set([
  'slotA', 'slotB', 'modelA', 'modelB',
  'theme', 'steeringAction',
  'showRawResponse', 'autoScroll'
]);

function isKeyProvider(p) { return typeof p === 'string' && ALLOWED_KEY_PROVIDERS.has(p); }
function isAnyProvider(p) { return typeof p === 'string' && ALLOWED_PROVIDERS.has(p); }
function isSafePrefKey(k) { return typeof k === 'string' && ALLOWED_PREFS.has(k); }

// ── Store (deferred until app.whenReady) ────────────────────────────
let store;
function createStore() {
  return new Store({
    encryptionKey: getEncryptionKey(),
    clearInvalidConfig: true,
    schema: {
      keys: buildKeysSchema(),
      preferences: {
        type: 'object',
        properties: {
          slotA: { type: 'string', default: 'anthropic' },
          slotB: { type: 'string', default: 'openai' },
          modelA: { type: 'string', default: '' },
          modelB: { type: 'string', default: '' },
          theme: { type: 'string', default: 'system' },
          steeringAction: { type: 'string', default: 'steer' },
          showRawResponse: { type: 'boolean', default: false },
          autoScroll: { type: 'boolean', default: true }
        },
        default: {}
      }
    }
  });
}

// ── Session overlays (in-memory; reset on newChat / app restart) ───
// Shape: { [providerId]: <parsed JSON object> }
const sessionOverlays = {};

// ── Active fetch controllers for abort ─────────────────────────────
const activeStreams = new Map(); // signal_id -> AbortController

// ── GPU config ─────────────────────────────────────────────────────
function configureGpuAcceleration() {
  const isHeadless = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY && os.platform() === 'linux';
  const isContainer = fs.existsSync('/.dockerenv') || process.env.container === 'docker';
  let hasGpu = false;
  try {
    if (fs.existsSync('/dev/nvidia0') || process.env.NVIDIA_VISIBLE_DEVICES) hasGpu = true;
    if (fs.existsSync('/dev/dri/card0')) hasGpu = true;
    if (os.platform() === 'win32') hasGpu = true;
  } catch (_) {}
  if (isHeadless || (isContainer && !hasGpu) || process.env.SASSY_DISABLE_GPU === 'true') {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu-compositing');
  }
}
configureGpuAcceleration();

// ── Error safety nets ──────────────────────────────────────────────
process.on('uncaughtException', (error, origin) => {
  const msg = (error && error.message) || '';
  if (msg.includes('gpu') || msg.includes('GPU') || msg.includes('vaInitialize')) {
    console.log('Sassy Brain: GPU error caught, continuing:', msg);
    return;
  }
  console.error('Sassy Brain: uncaughtException at', origin, error);
  try {
    if (app.isReady()) {
      dialog.showErrorBox('Sassy Brain — Unexpected Error',
        `${msg}\n\nThe app will keep running. Restart if things look broken.`);
    }
  } catch (_) {}
});
process.on('unhandledRejection', (reason) => {
  console.error('Sassy Brain: unhandled promise rejection:', reason);
});

// ── Single instance ────────────────────────────────────────────────
let mainWindow;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function hasAnyUsableKey() {
  try {
    const keys = store.get('keys', {});
    for (const p of Providers.CATALOG) {
      if (!p.needsKey) return true; // ollama — always usable
      if (keys[p.id]) return true;
    }
  } catch (_) {}
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1000,
    minHeight: 700,
    title: 'Sassy Brain',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      sandbox: true
    },
    icon: path.join(__dirname, 'icon.png')
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, hasAnyUsableKey() ? 'chat.html' : 'setup.html'));

  const sendTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  };
  sendTheme();
  nativeTheme.on('updated', sendTheme);

  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  try {
    store = createStore();
  } catch (err) {
    console.error('Sassy Brain: failed to create store:', err);
    dialog.showErrorBox('Sassy Brain — Config Error',
      `Could not initialize encrypted config: ${err.message}\n\nSome settings may not persist.`);
    store = new Store({ clearInvalidConfig: true });
  }
  createWindow();
}).catch(err => {
  console.error('Sassy Brain: fatal startup error:', err);
  try { dialog.showErrorBox('Sassy Brain — Startup Failed', err.message || String(err)); } catch (_) {}
  app.exit(1);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: Catalog ───────────────────────────────────────────────────
ipcMain.handle('providers:list', () => Providers.listProviders());

// ── IPC: Keys ──────────────────────────────────────────────────────
ipcMain.handle('keys:get', () => {
  const keys = store.get('keys', {});
  const out = {};
  for (const p of Providers.CATALOG) {
    if (!p.needsKey) continue;
    const v = keys[p.id];
    out[p.id] = v ? '••••' + v.slice(-4) : '';
  }
  return out;
});

ipcMain.handle('keys:has', () => {
  const keys = store.get('keys', {});
  const out = {};
  for (const p of Providers.CATALOG) {
    out[p.id] = !p.needsKey || !!keys[p.id];
  }
  return out;
});

ipcMain.handle('keys:set', (_, provider, key) => {
  if (!isKeyProvider(provider)) return { error: 'invalid provider' };
  if (typeof key !== 'string' || key.length === 0 || key.length > 2048) {
    return { error: 'invalid key' };
  }
  const keys = Object.assign({}, store.get('keys', {}));
  keys[provider] = key;
  store.set('keys', keys);
  return { ok: true };
});

ipcMain.handle('keys:clear', (_, provider) => {
  if (!isKeyProvider(provider)) return { error: 'invalid provider' };
  const keys = Object.assign({}, store.get('keys', {}));
  keys[provider] = '';
  store.set('keys', keys);
  return { ok: true };
});

// ── IPC: Preferences ───────────────────────────────────────────────
ipcMain.handle('prefs:get', () => store.get('preferences', {}));
ipcMain.handle('prefs:set', (_, key, value) => {
  if (!isSafePrefKey(key)) return { error: 'invalid pref key' };
  const t = typeof value;
  if (t !== 'string' && t !== 'number' && t !== 'boolean') {
    return { error: 'invalid pref value' };
  }
  // Further validation: slot prefs must be provider ids.
  if ((key === 'slotA' || key === 'slotB') && !isAnyProvider(value)) {
    return { error: 'invalid provider id' };
  }
  const prefs = Object.assign({}, store.get('preferences', {}));
  prefs[key] = value;
  store.set('preferences', prefs);
  return { ok: true };
});

// ── IPC: Navigation ────────────────────────────────────────────────
ipcMain.handle('nav:toChat', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'chat.html'));
  }
});
ipcMain.handle('nav:toSetup', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'setup.html'));
  }
});

// ── IPC: Shell (validated) ─────────────────────────────────────────
ipcMain.handle('shell:openExternal', (_, url) => {
  if (typeof url !== 'string') return { error: 'bad url' };
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'bad protocol' };
  } catch (_) { return { error: 'bad url' }; }
  shell.openExternal(url);
  return { ok: true };
});

// ── IPC: Session overlay management ────────────────────────────────
// The renderer supplies a JSON string per provider at session start
// (or whenever changed). The main process parses it once, validates
// it is a plain object, and keeps it in memory for the session.
ipcMain.handle('session:setOverlay', (_, provider, jsonText) => {
  if (!isAnyProvider(provider)) return { error: 'invalid provider' };
  const trimmed = String(jsonText || '').trim();
  if (!trimmed) {
    delete sessionOverlays[provider];
    return { ok: true, cleared: true };
  }
  let parsed;
  try { parsed = JSON.parse(trimmed); }
  catch (err) { return { error: 'JSON parse: ' + err.message }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'overlay must be a JSON object' };
  }
  sessionOverlays[provider] = parsed;
  return { ok: true };
});
ipcMain.handle('session:getOverlays', () => {
  const out = {};
  for (const k of Object.keys(sessionOverlays)) out[k] = sessionOverlays[k];
  return out;
});
ipcMain.handle('session:clearOverlays', () => {
  for (const k of Object.keys(sessionOverlays)) delete sessionOverlays[k];
  return { ok: true };
});

// ── IPC: Abort stream ──────────────────────────────────────────────
ipcMain.handle('ai:abort', (_, signal_id) => {
  const ctrl = activeStreams.get(signal_id);
  if (ctrl) {
    try { ctrl.abort(); } catch (_) {}
    activeStreams.delete(signal_id);
    return { ok: true };
  }
  return { ok: false };
});

// ── Stream orchestrator (shared by all providers) ──────────────────
async function runStream({ provider, model, messages, signal_id, event }) {
  const pmeta = Providers.getProvider(provider);
  if (!pmeta) return { error: `Unknown provider: ${provider}` };

  const keys = store.get('keys', {});
  let apiKey = '';
  if (pmeta.needsKey) {
    apiKey = keys[provider] || '';
    if (!apiKey) return { error: `No API key configured for ${pmeta.label}` };
  }

  // Build overlay used for this request. OpenAI-compatible providers
  // only emit the final `usage` frame when the caller opts in via
  // stream_options.include_usage — inject that unless the user's own
  // overlay already sets stream_options (respect their override).
  let overlay = sessionOverlays[provider] ? Object.assign({}, sessionOverlays[provider]) : null;
  if (Providers.needsStreamUsageOpt(provider)) {
    if (!overlay || !overlay.stream_options) {
      overlay = Object.assign({}, overlay || {}, {
        stream_options: { include_usage: true }
      });
    }
  }

  let req;
  try {
    req = Providers.buildRequest(provider, { apiKey, model, messages, stream: true, overlay });
  } catch (err) {
    return { error: err.message };
  }

  const controller = new AbortController();
  if (signal_id) activeStreams.set(signal_id, controller);

  // Collect usage/metadata across frames — later frames overwrite earlier.
  const meta = { startedAt: Date.now(), firstChunkAt: null };

  try {
    const response = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: req.body,
      signal: controller.signal
    });
    if (!response.ok) {
      const errText = await response.text();
      return { error: `${pmeta.label} ${response.status}: ${errText.slice(0, 500)}` };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let parsed;
        try { parsed = JSON.parse(data); } catch (_) { continue; }

        const frameMeta = Providers.extractStreamMeta(provider, parsed);
        if (frameMeta) {
          if (typeof frameMeta.input === 'number') meta.input = frameMeta.input;
          if (typeof frameMeta.output === 'number') meta.output = frameMeta.output;
          if (frameMeta.finishReason) meta.finishReason = frameMeta.finishReason;
        }

        const text = Providers.parseStreamChunk(provider, parsed);
        if (text && mainWindow && !mainWindow.isDestroyed()) {
          if (meta.firstChunkAt === null) meta.firstChunkAt = Date.now();
          mainWindow.webContents.send('ai:chunk', { signal_id, provider, text });
        }
      }
    }

    meta.endedAt = Date.now();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:done', { signal_id, provider, meta });
    }
    return { ok: true, meta };
  } catch (err) {
    meta.endedAt = Date.now();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:done', {
        signal_id, provider,
        aborted: err.name === 'AbortError',
        meta
      });
    }
    if (err.name === 'AbortError') return { ok: true, aborted: true, meta };
    return { error: err.message };
  } finally {
    if (signal_id) activeStreams.delete(signal_id);
  }
}

ipcMain.handle('ai:stream', async (event, opts) => runStream({ event, ...opts }));

// ── Non-streaming ──────────────────────────────────────────────────
ipcMain.handle('ai:complete', async (_, { provider, model, messages }) => {
  const pmeta = Providers.getProvider(provider);
  if (!pmeta) return { error: `Unknown provider: ${provider}` };
  const keys = store.get('keys', {});
  let apiKey = '';
  if (pmeta.needsKey) {
    apiKey = keys[provider] || '';
    if (!apiKey) return { error: `No API key configured for ${pmeta.label}` };
  }
  const overlay = sessionOverlays[provider] || null;
  let req;
  try {
    req = Providers.buildRequest(provider, { apiKey, model, messages, stream: false, overlay });
  } catch (err) {
    return { error: err.message };
  }
  const startedAt = Date.now();
  try {
    const response = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    if (!response.ok) {
      const errText = await response.text();
      return { error: `${pmeta.label} ${response.status}: ${errText.slice(0, 500)}` };
    }
    const data = await response.json();
    return {
      text: Providers.parseComplete(provider, data),
      raw: data,
      meta: Object.assign(
        { startedAt, endedAt: Date.now() },
        Providers.extractCompleteMeta(provider, data) || {}
      )
    };
  } catch (err) {
    return { error: err.message };
  }
});

// ── App info ───────────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
