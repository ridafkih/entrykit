import { findSessionById } from "../repositories/session.repository";
import { getProjectSystemPrompt } from "../repositories/project.repository";
import { proxyManager, isProxyInitialized } from "../proxy";
import type { RouteInfo } from "../../types/proxy";

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

export function getServiceRoutes(sessionId: string): RouteInfo[] {
  if (!isProxyInitialized()) return [];

  try {
    return proxyManager.getUrls(sessionId);
  } catch {
    return [];
  }
}
