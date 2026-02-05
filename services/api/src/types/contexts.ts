import type { ImageStore } from "@lab/context";
import type { BrowserServiceManager } from "../managers/browser-service.manager";
import type { SessionLifecycleManager } from "../managers/session-lifecycle.manager";
import type { PoolManager } from "../services/pool.manager";
import type { LogMonitor } from "../monitors/log.monitor";
import type { PromptService } from "./prompt";
import type { Sandbox, OpencodeClient, Publisher } from "./dependencies";

export interface BrowserContext {
  browserService: BrowserServiceManager;
  imageStore?: ImageStore;
}

export interface SessionContext {
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
}

export interface InfraContext {
  sandbox: Sandbox;
  opencode: OpencodeClient;
  publisher: Publisher;
}

export interface MonitorContext {
  logMonitor: LogMonitor;
}

export interface GithubContext {
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  frontendUrl?: string;
}

export interface ProxyContext {
  proxyBaseDomain: string;
}

export interface PromptContext {
  promptService?: PromptService;
}
