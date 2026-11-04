/*
 * Pont vers la fenetre de bureau, quelle que soit la coque : Electron
 * (window.desktop, expose par electron/preload.cjs) ou Tauri (API @tauri-apps).
 */
interface ElectronDesktop {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  setZoom(factor: number): Promise<void>;
  onMaximizedChange(cb: (maximized: boolean) => void): () => void;
}

const electron = (typeof window !== 'undefined' ? (window as unknown as { desktop?: ElectronDesktop }).desktop : undefined);
export const isElectron = !!electron;

export interface DesktopWindow {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  /** Appelle `cb` quand la fenetre est agrandie / restauree ; renvoie le desabonnement. */
  onMaximizedChange(cb: (maximized: boolean) => void): Promise<() => void>;
}

export async function getDesktopWindow(): Promise<DesktopWindow> {
  if (electron) {
    return {
      minimize: () => electron.minimize(),
      toggleMaximize: () => electron.toggleMaximize(),
      close: () => electron.close(),
      isMaximized: () => electron.isMaximized(),
      onMaximizedChange: async (cb) => electron.onMaximizedChange(cb),
    };
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const w = getCurrentWindow();
  return {
    minimize: () => w.minimize(),
    toggleMaximize: () => w.toggleMaximize(),
    close: () => w.close(),
    isMaximized: () => w.isMaximized(),
    onMaximizedChange: async (cb) => {
      const sync = () => void w.isMaximized().then(cb);
      return w.onResized(sync);
    },
  };
}

export async function setDesktopZoom(factor: number): Promise<void> {
  if (electron) return electron.setZoom(factor);
  const { getCurrentWebview } = await import('@tauri-apps/api/webview');
  return getCurrentWebview().setZoom(factor);
}
