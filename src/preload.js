/**
 * Sassy Brain — Preload (context bridge)
 * Secure IPC bridge. No node in renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sassy', {
  keys: {
    get: () => ipcRenderer.invoke('keys:get'),
    has: () => ipcRenderer.invoke('keys:has'),
    set: (provider, key) => ipcRenderer.invoke('keys:set', provider, key),
    clear: (provider) => ipcRenderer.invoke('keys:clear', provider),
    getRaw: (provider) => ipcRenderer.invoke('keys:getRaw', provider)
  },
  prefs: {
    get: () => ipcRenderer.invoke('prefs:get'),
    set: (key, value) => ipcRenderer.invoke('prefs:set', key, value)
  },
  nav: {
    toChat: () => ipcRenderer.invoke('nav:toChat'),
    toSetup: () => ipcRenderer.invoke('nav:toSetup')
  },
  ai: {
    stream: (opts) => ipcRenderer.invoke('ai:stream', opts),
    complete: (opts) => ipcRenderer.invoke('ai:complete', opts),
    onChunk: (cb) => ipcRenderer.on('ai:chunk', (_, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on('ai:done', (_, data) => cb(data)),
    removeChunkListeners: () => ipcRenderer.removeAllListeners('ai:chunk'),
    removeDoneListeners: () => ipcRenderer.removeAllListeners('ai:done')
  },
  github: {
    test: () => ipcRenderer.invoke('github:test')
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    platform: () => ipcRenderer.invoke('app:platform')
  },
  onThemeChange: (cb) => ipcRenderer.on('theme-updated', (_, theme) => cb(theme))
});
