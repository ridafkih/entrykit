import { findSessionById } from "../repositories/session.repository";
import { getProjectSystemPrompt } from "../repositories/project.repository";
import type { ProxyManager } from "../services/proxy.service";
import type { RouteInfo } from "../types/proxy";

export interface SessionData {
  sessionId: string;
  projectId: string;
  projectSystemPrompt: string | null;
}

export async function getSessionData(labSessionId: string): Promise<SessionData | null> {
  const session = await findSessionById(labSessionId);
  if (!session) return null;

  const systemPrompt = await getProjectSystemPrompt(session.projectId);

  return {
    sessionId: labSessionId,
    projectId: session.projectId,
    projectSystemPrompt: systemPrompt,
  };
}

export async function getServiceRoutes(
  sessionId: string,
  proxyManager: ProxyManager | null,
): Promise<RouteInfo[]> {
  if (!proxyManager) return [];

  try {
    return await proxyManager.getUrls(sessionId);
  } catch {
    return [];
  }
}
