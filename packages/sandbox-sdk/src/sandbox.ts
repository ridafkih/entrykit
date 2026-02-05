import type { SandboxProvider } from "./types/provider";
import type { NetworkManager } from "./types/network";
import type { WorkspaceManager } from "./types/workspace";
import type { ContainerEventStream } from "./types/events";
import type { RuntimeManager } from "./types/runtime";
import type { SessionManager } from "./types/session";

export interface SandboxConfig {
  network: NetworkManager;
  workspace: WorkspaceManager;
  runtime: RuntimeManager;
  session: SessionManager;
}

export class Sandbox {
  readonly network: NetworkManager;
  readonly workspace: WorkspaceManager;
  readonly runtime: RuntimeManager;
  readonly session: SessionManager;

  constructor(
    public readonly provider: SandboxProvider & ContainerEventStream,
    public readonly config: SandboxConfig
  ) {
    this.network = config.network;
    this.workspace = config.workspace;
    this.runtime = config.runtime;
    this.session = config.session;
  }
}
