import type { ImageManager } from "./image";
import type { ContainerManager } from "./container-manager";
import type { VolumeManager } from "./volume";
import type { NetworkCreateOptions } from "./network";
import type { ExecOptions, ExecResult } from "./exec";

export interface ImageConfig {
  workdir: string;
  entrypoint: string[] | null;
  cmd: string[] | null;
}

export interface NetworkInfo {
  name: string;
  labels: Record<string, string>;
}

export interface SandboxProvider extends ImageManager, ContainerManager, VolumeManager {
  createNetwork(name: string, options?: NetworkCreateOptions): Promise<void>;
  removeNetwork(name: string): Promise<void>;
  networkExists(name: string): Promise<boolean>;
  connectToNetwork(
    containerId: string,
    networkName: string,
    options?: { aliases?: string[] },
  ): Promise<void>;
  disconnectFromNetwork(containerId: string, networkName: string): Promise<void>;
  isConnectedToNetwork(containerIdOrName: string, networkName: string): Promise<boolean>;
  listNetworks(options?: { labels?: string[] }): Promise<NetworkInfo[]>;

  exec(containerId: string, options: ExecOptions): Promise<ExecResult>;
}
