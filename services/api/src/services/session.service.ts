import {
  findSessionById,
  findSessionsWithProject,
  searchSessionsWithProject,
} from "../repositories/session.repository";
import { getSessionContainersWithDetails } from "../repositories/container-session.repository";

export async function getSession(sessionId: string) {
  return findSessionById(sessionId);
}

export async function listSessions(params: { projectId?: string; limit?: number }) {
  return findSessionsWithProject(params);
}

export async function searchSessions(params: { query: string; limit?: number }) {
  return searchSessionsWithProject(params);
}

export async function getSessionContainers(sessionId: string) {
  const session = await findSessionById(sessionId);
  if (!session) return null;

  const containers = await getSessionContainersWithDetails(sessionId);
  return { session, containers };
}
