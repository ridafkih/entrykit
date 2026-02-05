import { assertRouteParam } from "@lab/router";
import type { RouteHandler } from "@lab/router";

export function withParams<TParams extends Record<string, string>, TContext = unknown>(
  paramKeys: (keyof TParams & string)[],
  handler: (params: TParams, request: Request, context: TContext) => Response | Promise<Response>,
): RouteHandler<TContext> {
  return (request, rawParams, context) => {
    const params = {} as Record<string, string>;
    for (const key of paramKeys) {
      params[key] = assertRouteParam(rawParams, key);
    }
    return handler(params as TParams, request, context);
  };
}
