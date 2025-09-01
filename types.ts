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
  isAutostartEnabled: boolean;
}

export interface DependencyStatus {
  name: 'distrobox' | 'podman' | 'docker';
  isInstalled: boolean;
}

export interface DependencyCheckResult {
  dependencies: DependencyStatus[];
  needsSetup: boolean;
}

export interface IElectronAPI {
  getOSInfo: () => Promise<OSInfo>;
  listContainers: () => Promise<Container[]>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => void;
  checkDependencies: () => Promise<DependencyCheckResult>;
  installDependencies: () => Promise<void>;
  onInstallationLog: (callback: (log: string) => void) => void;
  containerStart: (name: string) => Promise<void>;
  containerStop: (name: string) => Promise<void>;
  containerAutostartEnable: (name: string) => Promise<void>;
  containerAutostartDisable: (name: string) => Promise<void>;
  containerEnter: (name: string) => Promise<void>;
  getTerminal: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export type Page = 'my-containers' | 'create-new' | 'local-images' | 'download-images' | 'system-info';