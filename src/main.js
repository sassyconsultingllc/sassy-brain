/**
 * Sassy Brain — Main Process
 * Multi-AI consensus engine. Claude + Grok debate, you get truth.
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
const Store = require('electron-store');

// ── Encrypted config store ──────────────────────────────────────────
const store = new Store({
  encryptionKey: 'sassy-brain-v1-' + os.hostname(),
  schema: {
    keys: {
      type: 'object',
      properties: {
        github: { type: 'string', default: '' },
        anthropic: { type: 'string', default: '' },
        grok: { type: 'string', default: '' }
      },
      default: {}
    },
    preferences: {
      type: 'object',
      properties: {
        consensusTurns: { type: 'number', default: 2 },
        claudeModel: { type: 'string', default: 'claude-sonnet-4-20250514' },
        grokModel: { type: 'string', default: 'grok-3' },
        theme: { type: 'string', default: 'system' },
        defaultMode: { type: 'string', default: 'consensus' },
        steeringAction: { type: 'string', default: 'steer' }
      },
      default: {}
    }
  }
});

// ── GPU acceleration (from Grok-Desktop) ────────────────────────────
function configureGpuAcceleration() {
  const isHeadless = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY && os.platform() === 'linux';
  const isContainer = fs.existsSync('/.dockerenv') || process.env.container === 'docker';

  let hasGpu = false;
  try {
    if (fs.existsSync('/dev/nvidia0') || process.env.NVIDIA_VISIBLE_DEVICES) hasGpu = true;
    if (fs.existsSync('/dev/dri/card0')) hasGpu = true;
    if (os.platform() === 'win32') hasGpu = true; // Assume GPU on Windows
  } catch (_) {}

  const shouldDisable = isHeadless || (isContainer && !hasGpu) || process.env.SASSY_DISABLE_GPU === 'true';

  if (shouldDisable) {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu-compositing');
    console.log('Sassy Brain: GPU acceleration disabled');
  }
}

configureGpuAcceleration();

// GPU crash handler
let gpuRestartAttempted = false;
process.on('uncaughtException', (error) => {
  if (error.message && (error.message.includes('gpu') || error.message.includes('GPU') || error.message.includes('vaInitialize'))) {
    console.log('Sassy Brain: GPU error caught, continuing:', error.message);
    return;
  }
  throw error;
});

// ── Single instance lock ────────────────────────────────────────────
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

// ── Window management ───────────────────────────────────────────────
let mainWindow;

function createWindow() {
  const keys = store.get('keys', {});
  const hasKeys = keys.anthropic || keys.grok;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: 'Sassy Brain',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      sandbox: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  Menu.setApplicationMenu(null);

  if (!hasKeys) {
    mainWindow.loadFile(path.join(__dirname, 'setup.html'));
  } else {
    mainWindow.loadFile(path.join(__dirname, 'chat.html'));
  }

  // Theme sync
  const sendTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  };
  sendTheme();
  nativeTheme.on('updated', sendTheme);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // Security: restrict navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Security: block new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: Key Management ────────────────────────────────────────────
ipcMain.handle('keys:get', () => {
  const keys = store.get('keys', {});
  return {
    github: keys.github ? '••••' + keys.github.slice(-4) : '',
    anthropic: keys.anthropic ? '••••' + keys.anthropic.slice(-4) : '',
    grok: keys.grok ? '••••' + keys.grok.slice(-4) : ''
  };
});

ipcMain.handle('keys:has', () => {
  const keys = store.get('keys', {});
  return {
    github: !!keys.github,
    anthropic: !!keys.anthropic,
    grok: !!keys.grok
  };
});

ipcMain.handle('keys:set', (_, provider, key) => {
  const keys = store.get('keys', {});
  keys[provider] = key;
  store.set('keys', keys);
  return true;
});

ipcMain.handle('keys:clear', (_, provider) => {
  const keys = store.get('keys', {});
  keys[provider] = '';
  store.set('keys', keys);
  return true;
});

ipcMain.handle('keys:getRaw', (_, provider) => {
  const keys = store.get('keys', {});
  return keys[provider] || '';
});

// ── IPC: Preferences ───────────────────────────────────────────────
ipcMain.handle('prefs:get', () => store.get('preferences', {}));
ipcMain.handle('prefs:set', (_, key, value) => {
  const prefs = store.get('preferences', {});
  prefs[key] = value;
  store.set('preferences', prefs);
  return true;
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

// ── IPC: Streaming API calls (the actual engine) ────────────────────
// These run in main process to avoid CORS and keep keys out of renderer

ipcMain.handle('ai:stream', async (event, { provider, messages, model, signal_id }) => {
  const keys = store.get('keys', {});
  const prefs = store.get('preferences', {});

  let url, headers, body;

  if (provider === 'anthropic') {
    const apiKey = keys.anthropic;
    if (!apiKey) return { error: 'No Anthropic API key configured' };

    url = 'https://api.anthropic.com/v1/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    body = JSON.stringify({
      model: model || prefs.claudeModel || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      stream: true,
      messages
    });
  } else if (provider === 'grok') {
    const apiKey = keys.grok;
    if (!apiKey) return { error: 'No Grok API key configured' };

    url = 'https://api.x.ai/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    body = JSON.stringify({
      model: model || prefs.grokModel || 'grok-3',
      stream: true,
      messages
    });
  } else {
    return { error: `Unknown provider: ${provider}` };
  }

  try {
    const response = await fetch(url, { method: 'POST', headers, body });

    if (!response.ok) {
      const errText = await response.text();
      return { error: `${provider} API error ${response.status}: ${errText}` };
    }

    // Stream chunks back to renderer via IPC events
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
          let text = '';

          if (provider === 'anthropic') {
            // Anthropic SSE format
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              text = parsed.delta.text;
            }
          } else if (provider === 'grok') {
            // OpenAI-compatible SSE format
            if (parsed.choices?.[0]?.delta?.content) {
              text = parsed.choices[0].delta.content;
            }
          }

          if (text && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai:chunk', { signal_id, provider, text });
          }
        } catch (_) {}
      }
    }

    // Signal completion
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:done', { signal_id, provider });
    }

    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
});

// ── IPC: Non-streaming call for consensus rounds ────────────────────
ipcMain.handle('ai:complete', async (_, { provider, messages, model }) => {
  const keys = store.get('keys', {});
  const prefs = store.get('preferences', {});

  let url, headers, body;

  if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': keys.anthropic,
      'anthropic-version': '2023-06-01'
    };
    body = JSON.stringify({
      model: model || prefs.claudeModel || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages
    });
  } else if (provider === 'grok') {
    url = 'https://api.x.ai/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keys.grok}`
    };
    body = JSON.stringify({
      model: model || prefs.grokModel || 'grok-3',
      messages
    });
  }

  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    if (!response.ok) {
      const errText = await response.text();
      return { error: `${provider} ${response.status}: ${errText}` };
    }
    const data = await response.json();

    let text = '';
    if (provider === 'anthropic') {
      text = data.content?.map(c => c.text).join('') || '';
    } else if (provider === 'grok') {
      text = data.choices?.[0]?.message?.content || '';
    }

    return { text };
  } catch (err) {
    return { error: err.message };
  }
});

// ── IPC: GitHub API ─────────────────────────────────────────────────
ipcMain.handle('github:test', async () => {
  const key = store.get('keys', {}).github;
  if (!key) return { error: 'No GitHub key' };

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) return { error: `GitHub ${res.status}` };
    const data = await res.json();
    return { login: data.login, name: data.name };
  } catch (err) {
    return { error: err.message };
  }
});

// ── IPC: App info ───────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
