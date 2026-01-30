import type { RouteInfo } from "../../types/proxy";
import type { PromptContext, ServiceRoute } from "../../types/prompt";

export interface CreatePromptContextParams {
  sessionId: string;
  projectId: string;
  routeInfos: RouteInfo[];
  projectSystemPrompt: string | null;
}

export function createPromptContext(params: CreatePromptContextParams): PromptContext {
  const serviceRoutes: ServiceRoute[] = params.routeInfos.map((route) => ({
    port: route.containerPort,
    url: route.url,
  }));

  return {
    sessionId: params.sessionId,
    projectId: params.projectId,
    serviceRoutes,
    projectSystemPrompt: params.projectSystemPrompt,
  };
}
