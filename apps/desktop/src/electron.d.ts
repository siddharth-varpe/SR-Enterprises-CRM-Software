declare module 'electron' {
  export interface BrowserWindowOptions {
    title?: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    minWidth?: number;
    minHeight?: number;
    show?: boolean;
    backgroundColor?: string;
    webPreferences?: {
      preload?: string;
      contextIsolation?: boolean;
      nodeIntegration?: boolean;
      sandbox?: boolean;
      devTools?: boolean;
    };
  }

  export interface WebContents {
    setWindowOpenHandler(handler: (details: { url: string }) => { action: 'deny' | 'allow' }): void;
    on(event: 'will-navigate', listener: (event: { preventDefault: () => void }, url: string) => void): void;
  }

  export class BrowserWindow {
    constructor(options?: BrowserWindowOptions);
    webContents: WebContents;
    maximize(): void;
    isMaximized(): boolean;
    isMinimized(): boolean;
    restore(): void;
    focus(): void;
    show(): void;
    getBounds(): { width: number; height: number; x: number; y: number };
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    static getAllWindows(): BrowserWindow[];
  }

  export const app: {
    isPackaged: boolean;
    getVersion(): string;
    getPath(name: string): string;
    requestSingleInstanceLock(): boolean;
    quit(): void;
    exit(code?: number): void;
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
  };

  export const dialog: {
    showMessageBoxSync(options: {
      type: 'error' | 'info' | 'warning' | 'question';
      title: string;
      message: string;
      detail?: string;
      buttons: string[];
      defaultId?: number;
      cancelId?: number;
    }): number;
  };

  export const ipcMain: {
    handle(channel: string, listener: (event: any, ...args: any[]) => any): void;
  };

  export const ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
  };

  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: any): void;
  };

  export const shell: {
    openExternal(url: string): Promise<void>;
  };
}
