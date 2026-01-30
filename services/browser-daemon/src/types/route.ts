import type { DaemonManager } from "./daemon";

export type HttpMethod = "GET" | "POST" | "DELETE";

export interface RouteContext {
  daemonManager: DaemonManager;
}

export type RouteHandler = (
  request: Request,
  params: Record<string, string>,
  context: RouteContext,
) => Response | Promise<Response>;

export type RouteModule = Partial<Record<HttpMethod, RouteHandler>>;
