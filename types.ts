export interface OSInfo {
  arch: string;
  hostname: string;
  platform: string;
  release: string;
  totalmem: number;
  freemem: number;
}

export interface IElectronAPI {
  getOSInfo: () => Promise<OSInfo>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
