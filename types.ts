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

export interface ContainerInfo {
  additional_flags: string | null;
  entrypoint: string;
  home_dir: string;
  hostname: string;
  id: string;
  image: string;
  init: boolean;
  init_path: string;
  name: string;
  nvidia: boolean;
  pull: boolean;
  replace: boolean;
  root: boolean;
  start_now: boolean;
  status: string;
  user_name: string;
  user_shell: string;
  volumes: string[];
}


export interface DependencyStatus {
  name: 'distrobox' | 'podman';
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
  containerDelete: (name: string) => Promise<void>;
  containerCommit: (name: string, imageName: string, imageTag: string) => Promise<void>;
  containerInfo: (name: string) => Promise<ContainerInfo>;
  getTerminal: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export type Page = 'my-containers' | 'create-new' | 'local-images' | 'download-images' | 'system-info';