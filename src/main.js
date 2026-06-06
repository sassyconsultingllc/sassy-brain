/**
 * Sassy Brain — Main Process v0.2.0
 * Multi-AI consensus engine. 5 providers: Claude, Grok, Gemini, Mistral, HuggingFace.
 * 
 * Architecture derived from Grok-Desktop (AnRkey/Grok-Desktop, ISC License)
 * with substantial modifications for multi-model consensus, async steering,
 * and API-driven chat (not webview wrapper).
 * 
 * (c) 2026 Sassy Consulting LLC
 */

const { app, BrowserWindow, shell, Menu, ipcMain, nativeTheme, session, dialog } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

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
// clearInvalidConfig: if a prior install left a config encrypted with a
// different key (or otherwise corrupted), electron-store would JSON.parse
// the garbage and crash startup. With this flag, conf catches the
// SyntaxError, wipes the file, and continues with defaults.
function makeStore() {
  return new Store({
    encryptionKey: 'sassy-brain-v2-' + os.hostname(),
    clearInvalidConfig: true,
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
    }
    }
  });
}

let store;
try {
  store = makeStore();
} catch (err) {
  // Belt and suspenders. clearInvalidConfig already handles SyntaxError,
  // but if anything else throws (schema mismatch, fs error), fall back to
  // an empty plaintext store so the app still launches.
  console.error('Sassy Brain: store init failed, falling back to fresh store:', err);
  store = new Store({ clearInvalidConfig: true });
}

// ── GPU acceleration ─────────────────────────────────────────────
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

process.on('uncaughtException', (error) => {
  if (error.message && (error.message.includes('gpu') || error.message.includes('GPU') || error.message.includes('vaInitialize'))) return;
  throw error;
});

// ── Single instance lock ────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
  });
}

// ── Window management ───────────────────────────────────────────
let mainWindow;

function createWindow() {
  const keys = store.get('keys', {});
  const hasAnyKey = Object.keys(PROVIDERS).some(p => keys[p]);
  const forceChat = process.env.SASSY_FORCE_CHAT === '1';
  console.log(`[brain] hasAnyKey=${hasAnyKey} forceChat=${forceChat} -> loading ${(hasAnyKey || forceChat) ? 'chat.html' : 'setup.html'}`);

  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 650,
    title: 'Sassy Brain', backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, spellcheck: true, sandbox: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, (hasAnyKey || forceChat) ? 'chat.html' : 'setup.html'));

  const sendTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  };
  sendTheme();
  nativeTheme.on('updated', sendTheme);
  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('file://')) { event.preventDefault(); shell.openExternal(url); } });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: Provider definitions ───────────────────────────────────────
ipcMain.handle('providers:list', () => PROVIDERS);

// ── IPC: Key Management ─────────────────────────────────────────────
ipcMain.handle('keys:get', () => {
  const keys = store.get('keys', {});
  const masked = {};
  for (const [k, v] of Object.entries(keys)) masked[k] = v ? '••••' + v.slice(-4) : '';
  return masked;
});

ipcMain.handle('keys:has', () => {
  const keys = store.get('keys', {});
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

  try {
    const response = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    if (!response.ok) { const errText = await response.text(); return { error: `${provider} API error ${response.status}: ${errText}` }; }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
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
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);

// ── SassyMCP mesh bridge ────────────────────────────────────────────
// Sassy Brain talks to the SassyMCP coordination layer (mesh, phone, brain).
// Auto-locates SassyMCP so the mesh works standalone, in priority order:
//   SASSYMCP_EXE -> bundled exe (resources/sassymcp/) -> PATH -> standard
//   install dirs -> dev python (SASSYMCP_PYTHON/venv, with SASSYMCP_REPO).
// A bundled/installed exe runs as `sassymcp.exe mesh <cmd>`; a python
// interpreter as `python -m sassymcp.<module> <cmd>`.
let _runner = null; // { kind:'exe'|'py', path, repo? } | { path:null } when none
function _fileMaybe(p) { try { return p && fs.existsSync(p) ? p : null; } catch (_) { return null; } }

// Resolve an executable on PATH without spawning a shell (no injection surface).
function _onPath(name) {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat'] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) { const hit = _fileMaybe(path.join(dir, name + ext)); if (hit) return hit; }
  }
  return null;
}

function resolveRunner() {
  if (_runner !== null) return _runner.path ? _runner : null;
  const set = (r) => { _runner = r || { path: null }; return r; };
  let p = _fileMaybe(process.env.SASSYMCP_EXE);
  if (p) return set({ kind: 'exe', path: p });
  try { p = _fileMaybe(path.join(process.resourcesPath || '', 'sassymcp', 'sassymcp.exe')); if (p) return set({ kind: 'exe', path: p }); } catch (_) {}
  p = _onPath('sassymcp');
  if (p) return set({ kind: 'exe', path: p });
  for (const dir of [process.env.LOCALAPPDATA, process.env['ProgramFiles'], process.env['ProgramFiles(x86)'], 'C:\\Program Files']) {
    p = _fileMaybe(dir && path.join(dir, 'SassyMCP', 'sassymcp.exe')); if (p) return set({ kind: 'exe', path: p });
  }
  p = _fileMaybe(process.env.SASSYMCP_PYTHON);
  if (p) return set({ kind: 'py', path: p, repo: _fileMaybe(process.env.SASSYMCP_REPO) || 'V:\\Projects\\SassyMCP' });
  p = _fileMaybe('V:\\Projects\\SassyMCP\\.venv\\Scripts\\python.exe');
  if (p) return set({ kind: 'py', path: p, repo: 'V:\\Projects\\SassyMCP' });
  set(null);
  return null;
}

function _meshArgs(runner, cmd, extra) {
  if (runner.kind === 'exe') return ['mesh', cmd].concat(extra || []);
  if (cmd === 'brain') return ['-m', 'sassymcp._brain_status'];
  if (cmd === 'phone') return ['-m', 'sassymcp._phone_status'];
  return ['-m', 'sassymcp.modules.coordination', cmd].concat(extra || []);
}

function runMesh(cmd, extra, timeoutMs = 12000) {
  const runner = resolveRunner();
  if (!runner) return Promise.resolve({ error: 'SassyMCP not found — install it or set SASSYMCP_EXE to enable the mesh.' });
  const args = _meshArgs(runner, cmd, extra);
  const opts = { shell: false };
  if (runner.kind === 'py' && runner.repo) opts.cwd = runner.repo;
  return new Promise((resolve) => {
    let out = '', err = '', done = false;
    const finish = (v) => { if (done) return; done = true; clearTimeout(timer); if (v && v.error) console.log(`[mesh] ${cmd} -> ERR ${v.error}`); resolve(v); };
    let proc;
    try { proc = spawn(runner.path, args, opts); }
    catch (e) { return resolve({ error: `cannot launch SassyMCP (${runner.path}): ${e.message}` }); }
    const timer = setTimeout(() => { try { proc.kill(); } catch (_) {} finish({ error: `timed out after ${timeoutMs}ms` }); }, timeoutMs);
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', (e) => finish({ error: `spawn failed: ${e.message}` }));
    proc.on('close', (code) => { try { finish(JSON.parse(out)); } catch (e) { finish({ error: `exit ${code}: ${(err || out || 'no output').slice(0, 300)}` }); } });
  });
}

ipcMain.handle('mesh:board', () => runMesh('board'));
ipcMain.handle('mesh:brain', () => runMesh('brain'));
ipcMain.handle('mesh:phone', () => runMesh('phone'));
ipcMain.handle('mesh:announce', (_, peer = {}) => runMesh('announce', [
  '--id', peer.id || 'sassy-brain',
  '--name', peer.name || 'Sassy Brain',
  '--platform', peer.platform || 'desktop',
  '--caps', peer.caps || 'consensus,chat',
  '--ttl', '600',
]));
ipcMain.handle('mesh:locate', () => { const r = resolveRunner(); return r ? { found: true, kind: r.kind, path: r.path } : { found: false }; });
ipcMain.handle('mesh:openHome', () => {
  const home = process.env.SASSYMCP_HOME || path.join(os.homedir(), '.sassymcp');
  shell.openPath(home);
  return { ok: true, home };
});
