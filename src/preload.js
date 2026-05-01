/**
 * Sassy Brain — Preload
 * Secure IPC bridge. Uses only contextBridge + ipcRenderer → works with sandbox:true.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sassy', {
  providers: {
    list: () => ipcRenderer.invoke('providers:list')
  },
  keys: {
    get: () => ipcRenderer.invoke('keys:get'),
    has: () => ipcRenderer.invoke('keys:has'),
    set: (provider, key) => ipcRenderer.invoke('keys:set', provider, key),
    clear: (provider) => ipcRenderer.invoke('keys:clear', provider)
  },
  prefs: {
    get: () => ipcRenderer.invoke('prefs:get'),
    set: (key, value) => ipcRenderer.invoke('prefs:set', key, value)
  },
  nav: {
    toChat: () => ipcRenderer.invoke('nav:toChat'),
    toSetup: () => ipcRenderer.invoke('nav:toSetup')
  },
  session: {
    setOverlay: (provider, jsonText) => ipcRenderer.invoke('session:setOverlay', provider, jsonText),
    getOverlays: () => ipcRenderer.invoke('session:getOverlays'),
    clearOverlays: () => ipcRenderer.invoke('session:clearOverlays')
  },
  ai: {
    stream: (opts) => ipcRenderer.invoke('ai:stream', opts),
    complete: (opts) => ipcRenderer.invoke('ai:complete', opts),
    abort: (signal_id) => ipcRenderer.invoke('ai:abort', signal_id),
    onChunk: (cb) => ipcRenderer.on('ai:chunk', (_, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on('ai:done', (_, data) => cb(data)),
    removeChunkListeners: () => ipcRenderer.removeAllListeners('ai:chunk'),
    removeDoneListeners: () => ipcRenderer.removeAllListeners('ai:done')
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    platform: () => ipcRenderer.invoke('app:platform')
  },
  onThemeChange: (cb) => ipcRenderer.on('theme-updated', (_, theme) => cb(theme))
});
