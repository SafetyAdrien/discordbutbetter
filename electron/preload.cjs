const { contextBridge, ipcRenderer } = require('electron');

// Pont minimal expose a l'application (window.desktop) : fenetre et zoom.
contextBridge.exposeInMainWorld('desktop', {
  kind: 'electron',
  minimize: () => ipcRenderer.invoke('desktop:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('desktop:toggle-maximize'),
  close: () => ipcRenderer.invoke('desktop:close'),
  isMaximized: () => ipcRenderer.invoke('desktop:is-maximized'),
  perfStart: () => ipcRenderer.invoke('desktop:perf-start'),
  perfStop: () => ipcRenderer.invoke('desktop:perf-stop'),
  setZoom: (factor) => ipcRenderer.invoke('desktop:set-zoom', factor),
  onMaximizedChange: (cb) => {
    const h = (_e, v) => cb(v);
    ipcRenderer.on('desktop:maximized', h);
    return () => ipcRenderer.removeListener('desktop:maximized', h);
  },
});
