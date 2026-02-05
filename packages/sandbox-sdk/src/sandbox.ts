import type { SandboxProvider } from "./types/provider";
import type { NetworkManager } from "./types/network";
import type { WorkspaceManager } from "./types/workspace";
import type { ContainerEventStream } from "./types/events";

export interface SandboxConfig {
  network: NetworkManager;
  workspace: WorkspaceManager;
}

export class Sandbox {
  readonly network: NetworkManager;
  readonly workspace: WorkspaceManager;

  constructor(
    public readonly provider: SandboxProvider & ContainerEventStream,
    public readonly config: SandboxConfig
  ) {
    this.network = config.network;
    this.workspace = config.workspace;
  }
}
