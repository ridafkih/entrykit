import type { RouteHandler as BaseRouteHandler, RouteModule as BaseRouteModule } from "@lab/router";
import type { DaemonManager } from "./daemon";

export type { HttpMethod } from "@lab/router";

export interface RouteContext {
  daemonManager: DaemonManager;
}

export type RouteHandler = BaseRouteHandler<RouteContext>;
export type RouteModule = BaseRouteModule<RouteContext>;
