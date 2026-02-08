import type { RouteHandler as BaseRouteHandler, RouteModule as BaseRouteModule } from "@lab/router";
import type { widelogger } from "@lab/widelogger";
import type { DaemonManager } from "./daemon";

export type { HttpMethod } from "@lab/router";

export type Widelog = ReturnType<typeof widelogger>["widelog"];

export interface RouteContext {
  daemonManager: DaemonManager;
  widelog: Widelog;
}

export type RouteHandler = BaseRouteHandler<RouteContext>;
export type RouteModule = BaseRouteModule<RouteContext>;
