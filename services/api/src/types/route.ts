import type { RouteHandler as BaseRouteHandler, RouteModule as BaseRouteModule } from "@lab/router";
import type {
  BrowserContext,
  SessionContext,
  InfraContext,
  MonitorContext,
  GithubContext,
  ProxyContext,
  PromptContext,
} from "./contexts";

export type {
  BrowserContext,
  SessionContext,
  InfraContext,
  MonitorContext,
  GithubContext,
  ProxyContext,
  PromptContext,
} from "./contexts";

export type { HttpMethod } from "@lab/router";

export interface RouteContext
  extends
    BrowserContext,
    SessionContext,
    InfraContext,
    MonitorContext,
    GithubContext,
    ProxyContext,
    PromptContext {}

export type Handler<TContext = unknown> = BaseRouteHandler<TContext>;
/** @deprecated Use Handler<SomeContext & AnotherContext> */
export type RouteHandler = BaseRouteHandler<RouteContext>;
export type RouteModule = BaseRouteModule<RouteContext>;
