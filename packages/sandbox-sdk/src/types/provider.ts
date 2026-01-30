import type {
  ContainerCreateOptions,
  ContainerInfo,
  ExitResult,
  LogChunk,
} from "./container";
import type { NetworkCreateOptions } from "./network";
import type { ExecOptions, ExecResult } from "./exec";

export interface SandboxProvider {
  pullImage(
    ref: string,
    onProgress?: (event: { status: string; progress?: string }) => void,
  ): Promise<void>;
  imageExists(ref: string): Promise<boolean>;

  createContainer(options: ContainerCreateOptions): Promise<string>;
  startContainer(id: string): Promise<void>;
  stopContainer(id: string, timeout?: number): Promise<void>;
  removeContainer(id: string, force?: boolean): Promise<void>;
  restartContainer(id: string, timeout?: number): Promise<void>;
  inspectContainer(id: string): Promise<ContainerInfo>;
  waitContainer(id: string): Promise<ExitResult>;
  containerExists(id: string): Promise<boolean>;
  streamLogs(id: string, options?: { tail?: number }): AsyncGenerator<LogChunk>;

  createVolume(name: string, labels?: Record<string, string>): Promise<void>;
  removeVolume(name: string): Promise<void>;
  volumeExists(name: string): Promise<boolean>;
  cloneVolume(source: string, target: string): Promise<void>;

  createNetwork(name: string, options?: NetworkCreateOptions): Promise<void>;
  removeNetwork(name: string): Promise<void>;
  networkExists(name: string): Promise<boolean>;
  connectToNetwork(containerId: string, networkName: string): Promise<void>;
  disconnectFromNetwork(containerId: string, networkName: string): Promise<void>;

  exec(containerId: string, options: ExecOptions): Promise<ExecResult>;
}
