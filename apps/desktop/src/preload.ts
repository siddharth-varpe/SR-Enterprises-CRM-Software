import { contextBridge, ipcRenderer } from 'electron';

// Explicitly type and expose secure desktop API
export interface DesktopBridgeApi {
  getAppVersion: () => Promise<string>;
  getPlatform: () => string;
  getAppStatus: () => Promise<{ status: string; backendUrl: string }>;
  openExternalUrl: (url: string) => Promise<boolean>;
}

const desktopApi: DesktopBridgeApi = {
  getAppVersion: () => ipcRenderer.invoke('crm:get-app-version'),
  getPlatform: () => process.platform,
  getAppStatus: () => ipcRenderer.invoke('crm:get-app-status'),
  openExternalUrl: (url: string) => {
    // Validate scheme before sending to IPC
    if (typeof url !== 'string' || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      return Promise.reject(new Error('Invalid URL protocol. Only https:// and http:// are allowed.'));
    }
    return ipcRenderer.invoke('crm:open-external-url', url);
  },
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
