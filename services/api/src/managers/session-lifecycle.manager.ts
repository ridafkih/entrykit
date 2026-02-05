import {
  initializeSessionContainers,
  type InitializeSessionContainersDeps,
} from "../docker/containers";
import { cleanupSession, type CleanupSessionDeps } from "../services/session-cleanup";
import {
  cleanupSessionNetwork,
  cleanupOrphanedNetworks,
  type NetworkContainerNames,
} from "../docker/network";
import type { BrowserServiceManager } from "./browser-service.manager";
import type { ProxyManager } from "../services/proxy";
import type { Sandbox } from "../types/dependencies";
import type { DeferredPublisher } from "../shared/deferred-publisher";

export interface SessionLifecycleConfig {
  browserSocketVolume: string;
  containerNames: NetworkContainerNames;
}

export class SessionLifecycleManager {
  constructor(
    private readonly config: SessionLifecycleConfig,
    private readonly sandbox: Sandbox,
    private readonly proxyManager: ProxyManager,
    private readonly browserServiceManager: BrowserServiceManager,
    private readonly deferredPublisher: DeferredPublisher,
  ) {}

  private getContainerDeps(): InitializeSessionContainersDeps {
    const { containerNames, browserSocketVolume } = this.config;
    return {
      containerNames,
      browserSocketVolume,
      sandbox: this.sandbox,
      publisher: this.deferredPublisher.get(),
      proxyManager: this.proxyManager,
    };
  }

  private getCleanupDeps(): CleanupSessionDeps {
    const { containerNames } = this.config;
    return {
      sandbox: this.sandbox,
      publisher: this.deferredPublisher.get(),
      proxyManager: this.proxyManager,
      cleanupSessionNetwork: (sessionId: string) =>
        cleanupSessionNetwork(sessionId, containerNames, this.sandbox),
    };
  }

  async initialize(): Promise<void> {
    await cleanupOrphanedNetworks(this.config.containerNames, this.sandbox);
  }

  async initializeSession(sessionId: string, projectId: string): Promise<void> {
    await initializeSessionContainers(
      sessionId,
      projectId,
      this.browserServiceManager.service,
      this.getContainerDeps(),
    );
  }

  async cleanupSession(sessionId: string): Promise<void> {
    await cleanupSession(sessionId, this.browserServiceManager.service, this.getCleanupDeps());
  }
}
