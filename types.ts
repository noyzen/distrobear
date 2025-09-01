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
  isIsolated: boolean;
}

export interface ContainerInfo {
  // From container backend (podman/docker inspect)
  id: string;
  name: string;
  image: string;
  status: string;
  created: string; // ISO date string
  pid: number;
  entrypoint: string;
  backend: string; // 'podman' or 'docker'
  size: string; // e.g. "1.23GB (virtual 4.56GB)"
  volumes: string[]; // Formatted as "host_path -> container_path"
  
  // From distrobox info / inferred
  home_dir: string;
  hostname: string;
  user_name: string;
  user_shell: string;
  
  // Configuration Flags
  init: boolean;
  nvidia: boolean;
  root: boolean;
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