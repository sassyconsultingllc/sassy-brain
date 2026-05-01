/**
<<<<<<< HEAD
 * Sassy Brain — Main Process
 * Multi-provider AI testing tool for developers.
 * Two slot UI: pick any provider + model per slot, run in parallel,
 * with optional per-slot JSON overlay merged into every request body.
 *
=======
 * Sassy Brain — Main Process v0.2.0
 * Multi-AI consensus engine. 5 providers: Claude, Grok, Gemini, Mistral, HuggingFace.
 * 
 * Architecture derived from Grok-Desktop (AnRkey/Grok-Desktop, ISC License)
 * with substantial modifications for multi-model consensus, async steering,
 * and API-driven chat (not webview wrapper).
 * 
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
 * (c) 2026 Sassy Consulting LLC
 */

const { app, BrowserWindow, shell, Menu, ipcMain, nativeTheme, dialog } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Store = require('electron-store');
const Providers = require('./providers');

<<<<<<< HEAD
// ── Stable machine-bound encryption key ─────────────────────────────
function getEncryptionKey() {
  const keyPath = path.join(app.getPath('userData'), '.machine-id');
  try {
    if (fs.existsSync(keyPath)) {
      const existing = fs.readFileSync(keyPath, 'utf8').trim();
      if (existing && existing.length >= 32) return existing;
=======
// ── Provider Definitions ─────────────────────────────────────────
const PROVIDERS = {
  anthropic: {
    name: 'Claude',
    color: '#d97706',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-5-20250414'],
    keyPrefix: 'sk-ant-',
    keyHint: 'console.anthropic.com/settings/keys',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    free: false
  },
  grok: {
    name: 'Grok',
    color: '#3b82f6',
    defaultModel: 'grok-3-fast',
    models: ['grok-3-fast', 'grok-3', 'grok-3-mini'],
    keyPrefix: 'xai-',
    keyHint: 'console.x.ai',
    keyUrl: 'https://console.x.ai/',
    free: false
  },
  gemini: {
    name: 'Gemini',
    color: '#4285f4',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    keyPrefix: 'AI',
    keyHint: 'aistudio.google.com/apikey',
    keyUrl: 'https://aistudio.google.com/apikey',
    free: true
  },
  mistral: {
    name: 'Mistral',
    color: '#ff7000',
    defaultModel: 'mistral-small-latest',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'open-mistral-nemo'],
    keyPrefix: '',
    keyHint: 'console.mistral.ai/api-keys',
    keyUrl: 'https://console.mistral.ai/api-keys',
    free: true
  },
  huggingface: {
    name: 'HuggingFace',
    color: '#ffcc00',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    models: ['meta-llama/Llama-3.3-70B-Instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct'],
    keyPrefix: 'hf_',
    keyHint: 'huggingface.co/settings/tokens',
    keyUrl: 'https://huggingface.co/settings/tokens',
    free: true
  }
};

// ── Encrypted config store ──────────────────────────────────────
const store = new Store({
  encryptionKey: 'sassy-brain-v2-' + os.hostname(),
  schema: {
    keys: {
      type: 'object',
      properties: {
        github: { type: 'string', default: '' },
        anthropic: { type: 'string', default: '' },
        grok: { type: 'string', default: '' },
        gemini: { type: 'string', default: '' },
        mistral: { type: 'string', default: '' },
        huggingface: { type: 'string', default: '' }
      },
      default: {}
    },
    preferences: {
      type: 'object',
      properties: {
        consensusTurns: { type: 'number', default: 2 },
        claudeModel: { type: 'string', default: 'claude-sonnet-4-20250514' },
        grokModel: { type: 'string', default: 'grok-3-fast' },
        geminiModel: { type: 'string', default: 'gemini-2.0-flash' },
        mistralModel: { type: 'string', default: 'mistral-small-latest' },
        huggingfaceModel: { type: 'string', default: 'meta-llama/Llama-3.3-70B-Instruct' },
        theme: { type: 'string', default: 'system' },
        defaultMode: { type: 'string', default: 'consensus' },
        steeringAction: { type: 'string', default: 'steer' },
        codeExecution: { type: 'boolean', default: true },
        consensusProviders: { type: 'array', default: ['anthropic', 'grok'] }
      },
      default: {}
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
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

<<<<<<< HEAD
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
=======
// ── GPU acceleration ─────────────────────────────────────────────
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
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

<<<<<<< HEAD
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
=======
process.on('uncaughtException', (error) => {
  if (error.message && (error.message.includes('gpu') || error.message.includes('GPU') || error.message.includes('vaInitialize'))) return;
  throw error;
});

// ── Single instance lock ────────────────────────────────────────
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
  });
}

<<<<<<< HEAD
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
=======
// ── Window management ───────────────────────────────────────────
let mainWindow;

function createWindow() {
  const keys = store.get('keys', {});
  const hasAnyKey = Object.keys(PROVIDERS).some(p => keys[p]);

  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 650,
    title: 'Sassy Brain', backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, spellcheck: true, sandbox: false
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
    },
    icon: path.join(__dirname, 'icon.png')
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, hasAnyKey ? 'chat.html' : 'setup.html'));

<<<<<<< HEAD
  mainWindow.loadFile(path.join(__dirname, hasAnyUsableKey() ? 'chat.html' : 'setup.html'));

=======
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
  const sendTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  };
  sendTheme();
  nativeTheme.on('updated', sendTheme);
<<<<<<< HEAD

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
=======
  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('file://')) { event.preventDefault(); shell.openExternal(url); } });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
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

<<<<<<< HEAD
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
=======
// ── IPC: Provider definitions ───────────────────────────────────────
ipcMain.handle('providers:list', () => PROVIDERS);

// ── IPC: Key Management ─────────────────────────────────────────────
ipcMain.handle('keys:get', () => {
  const keys = store.get('keys', {});
  const masked = {};
  for (const [k, v] of Object.entries(keys)) masked[k] = v ? '••••' + v.slice(-4) : '';
  return masked;
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
});

ipcMain.handle('keys:has', () => {
  const keys = store.get('keys', {});
<<<<<<< HEAD
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
=======
  const result = {};
  for (const k of [...Object.keys(PROVIDERS), 'github']) result[k] = !!keys[k];
  return result;
});

ipcMain.handle('keys:set', (_, provider, key) => { const keys = store.get('keys', {}); keys[provider] = key; store.set('keys', keys); return true; });
ipcMain.handle('keys:clear', (_, provider) => { const keys = store.get('keys', {}); keys[provider] = ''; store.set('keys', keys); return true; });
ipcMain.handle('keys:getRaw', (_, provider) => { return store.get('keys', {})[provider] || ''; });

// ── IPC: Preferences ────────────────────────────────────────────────
ipcMain.handle('prefs:get', () => store.get('preferences', {}));
ipcMain.handle('prefs:set', (_, key, value) => { const prefs = store.get('preferences', {}); prefs[key] = value; store.set('preferences', prefs); return true; });

// ── IPC: Navigation ─────────────────────────────────────────────────
ipcMain.handle('nav:toChat', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadFile(path.join(__dirname, 'chat.html')); });
ipcMain.handle('nav:toSetup', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadFile(path.join(__dirname, 'setup.html')); });

// ── API Call Helpers ────────────────────────────────────────────────
function buildRequest(provider, messages, model, stream = false) {
  const keys = store.get('keys', {});
  const prefs = store.get('preferences', {});
  const apiKey = keys[provider];
  if (!apiKey) return { error: `No ${provider} API key configured` };

  let url, headers, body;
  switch (provider) {
    case 'anthropic':
      url = 'https://api.anthropic.com/v1/messages';
      headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
      body = { model: model || prefs.claudeModel || PROVIDERS.anthropic.defaultModel, max_tokens: 4096, stream, messages };
      break;
    case 'grok':
      url = 'https://api.x.ai/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
      body = { model: model || prefs.grokModel || PROVIDERS.grok.defaultModel, stream, messages };
      break;
    case 'gemini':
      url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
      body = { model: model || prefs.geminiModel || PROVIDERS.gemini.defaultModel, stream, messages };
      break;
    case 'mistral':
      url = 'https://api.mistral.ai/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
      body = { model: model || prefs.mistralModel || PROVIDERS.mistral.defaultModel, stream, messages };
      break;
    case 'huggingface':
      const hfModel = model || prefs.huggingfaceModel || PROVIDERS.huggingface.defaultModel;
      url = `https://api-inference.huggingface.co/models/${hfModel}/v1/chat/completions`;
      headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
      body = { model: hfModel, stream, messages, max_tokens: 4096 };
      break;
    default:
      return { error: `Unknown provider: ${provider}` };
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
  }
  return { url, headers, body: JSON.stringify(body) };
}

function parseStreamChunk(provider, parsed) {
  if (provider === 'anthropic') {
    return (parsed.type === 'content_block_delta' && parsed.delta?.text) ? parsed.delta.text : '';
  }
  return parsed.choices?.[0]?.delta?.content || '';
}

function parseCompleteResponse(provider, data) {
  if (provider === 'anthropic') return data.content?.map(c => c.text).join('') || '';
  return data.choices?.[0]?.message?.content || '';
}

// ── IPC: Streaming API calls ────────────────────────────────────────
ipcMain.handle('ai:stream', async (event, { provider, messages, model, signal_id }) => {
  const req = buildRequest(provider, messages, model, true);
  if (req.error) return req;

<<<<<<< HEAD
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

=======
  try {
    const response = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    if (!response.ok) { const errText = await response.text(); return { error: `${provider} API error ${response.status}: ${errText}` }; }

>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
<<<<<<< HEAD

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
=======
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parseStreamChunk(provider, parsed);
          if (text && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('ai:chunk', { signal_id, provider, text });
        } catch (_) {}
      }
    }
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('ai:done', { signal_id, provider });
    return { ok: true };
  } catch (err) { return { error: err.message }; }
});

// ── IPC: Non-streaming call for consensus rounds ────────────────────
ipcMain.handle('ai:complete', async (_, { provider, messages, model }) => {
  const req = buildRequest(provider, messages, model, false);
  if (req.error) return req;
  try {
    const response = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    if (!response.ok) { const errText = await response.text(); return { error: `${provider} ${response.status}: ${errText}` }; }
    const data = await response.json();
    return { text: parseCompleteResponse(provider, data) };
  } catch (err) { return { error: err.message }; }
});

// ── IPC: GitHub API ─────────────────────────────────────────────────
ipcMain.handle('github:test', async () => {
  const key = store.get('keys', {}).github;
  if (!key) return { error: 'No GitHub key' };
  try {
    const res = await fetch('https://api.github.com/user', { headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/vnd.github+json' } });
    if (!res.ok) return { error: `GitHub ${res.status}` };
    const data = await res.json();
    return { login: data.login, name: data.name };
  } catch (err) { return { error: err.message }; }
});

// ── IPC: App info ───────────────────────────────────────────────────
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
