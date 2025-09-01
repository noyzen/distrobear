export interface OSInfo {
  arch: string;
  hostname: string;
  platform: string;
  release: string;
  totalmem: number;
  freemem: number;
}

export interface Container {
  name: string;
  status: string;
  image: string;
}

export interface IElectronAPI {
  getOSInfo: () => Promise<OSInfo>;
  listContainers: () => Promise<Container[]>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export type Page = 'my-containers' | 'create-new' | 'local-images' | 'download-images' | 'system-info';