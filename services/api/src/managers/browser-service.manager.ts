import type { DaemonController, BrowserSessionState } from "@lab/browser-protocol";
import {
  bootstrapBrowserService,
  shutdownBrowserService,
  type BrowserBootstrapResult,
} from "../browser/bootstrap";
import { cleanupOrphanedSessions } from "../browser/state-store";
import type { BrowserService } from "../browser/browser-service";
import type { DeferredPublisher } from "../shared/deferred-publisher";

export interface BrowserServiceConfig {
  apiUrl: string;
  wsHost: string;
  cleanupDelayMs: number;
  reconcileIntervalMs: number;
  maxRetries: number;
}

export class BrowserServiceManager {
  private result: BrowserBootstrapResult | null = null;

  constructor(
    private readonly config: BrowserServiceConfig,
    private readonly deferredPublisher: DeferredPublisher,
  ) {}

  get isInitialized(): boolean {
    return this.result !== null;
  }

  get service(): BrowserService {
    if (!this.result) {
      throw new Error("BrowserServiceManager not initialized - call initialize() first");
    }
    return this.result.browserService;
  }

  get daemonController(): DaemonController {
    if (!this.result) {
      throw new Error("BrowserServiceManager not initialized - call initialize() first");
    }
    return this.result.daemonController;
  }

  async initialize(): Promise<void> {
    if (this.result) {
      throw new Error("BrowserServiceManager already initialized");
    }

    await cleanupOrphanedSessions();

    const { apiUrl, wsHost, cleanupDelayMs, reconcileIntervalMs, maxRetries } = this.config;

    this.result = await bootstrapBrowserService({
      browserApiUrl: apiUrl,
      browserWsHost: wsHost,
      cleanupDelayMs,
      reconcileIntervalMs,
      maxRetries,
      publishFrame: (sessionId: string, frame: string, timestamp: number) => {
        this.deferredPublisher
          .get()
          .publishEvent(
            "sessionBrowserFrames",
            { uuid: sessionId },
            { type: "frame" as const, data: frame, timestamp },
          );
      },
      publishStateChange: (sessionId: string, state: BrowserSessionState) => {
        this.deferredPublisher.get().publishSnapshot(
          "sessionBrowserState",
          { uuid: sessionId },
          {
            desiredState: state.desiredState,
            currentState: state.currentState,
            streamPort: state.streamPort ?? undefined,
            errorMessage: state.errorMessage ?? undefined,
          },
        );
      },
    });
  }

  startReconciler(): void {
    this.service.startReconciler();
  }

  shutdown(): void {
    if (!this.result) return;
    shutdownBrowserService(this.result.browserService);
  }
}
