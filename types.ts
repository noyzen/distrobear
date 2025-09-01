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
  
  // Configuration Flags
  init: boolean;
  nvidia: boolean;
  root: boolean;
}

export interface ExportableApplication {
  name: string; // Display name, e.g., "Mozilla Firefox"
  appName: string; // The .desktop file name, e.g., "firefox.desktop"
  containerName: string;
  isExported: boolean;
}

export interface ApplicationList {
  applications: ExportableApplication[];
  unscannedContainers: string[];
}


export interface DependencyStatus {
  name: 'distrobox' | 'podman';
  isInstalled: boolean;
}

export interface DependencyCheckResult {
  dependencies: DependencyStatus[];
  needsSetup: boolean;
}

export interface LocalImage {
  repository: string;
  tag: string;
  id: string;
  size: string;
  created: string;
}

export interface CreateContainerOptions {
  name: string;
  image: string;
  init: boolean;
  nvidia: boolean;
  isolated: boolean;
  customHome: string;
  volumes: { hostPath: string; containerPath: string }[];
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
  listApplications: () => Promise<ApplicationList>;
  applicationExport: (args: { containerName: string, appName: string }) => Promise<void>;
  applicationUnexport: (args: { containerName: string, appName: string }) => Promise<void>;
  listLocalImages: () => Promise<LocalImage[]>;
  imageDelete: (imageIdentifier: string) => Promise<void>;
  imageExport: (imageIdentifier: string) => Promise<{ success: boolean; message: string }>;
  imageImport: () => Promise<{ success: boolean; message: string }>;
  containerCreate: (options: CreateContainerOptions) => Promise<void>;
  onCreationLog: (callback: (log: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export type Page = 'my-containers' | 'create-new' | 'applications' | 'local-images' | 'download-images' | 'system-info';