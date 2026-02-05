import { db } from "@lab/database/client";
import { sessions } from "@lab/database/schema/sessions";
import { projects } from "@lab/database/schema/projects";
import { eq, ne, and, desc, or, ilike } from "drizzle-orm";
import { findSessionById } from "../repositories/session.repository";
import { getSessionContainersWithDetails } from "../repositories/container-session.repository";
import { SESSION_STATUS } from "../types/session";

export async function getSession(sessionId: string) {
  return findSessionById(sessionId);
}

export async function listSessions({ projectId, limit }: { projectId?: string; limit?: number }) {
  const conditions = [
    ne(sessions.status, SESSION_STATUS.DELETING),
    ne(sessions.status, SESSION_STATUS.POOLED),
  ];

  if (projectId) {
    conditions.push(eq(sessions.projectId, projectId));
  }

  return db
    .select({
      id: sessions.id,
      projectId: sessions.projectId,
      projectName: projects.name,
      title: sessions.title,
      status: sessions.status,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .innerJoin(projects, eq(sessions.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(desc(sessions.createdAt))
    .limit(limit ?? 10);
}

export async function searchSessions({ query, limit }: { query: string; limit?: number }) {
  const searchLimit = limit ?? 5;

  return db
    .select({
      id: sessions.id,
      projectId: sessions.projectId,
      projectName: projects.name,
      title: sessions.title,
      opencodeSessionId: sessions.opencodeSessionId,
      status: sessions.status,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .innerJoin(projects, eq(sessions.projectId, projects.id))
    .where(
      and(
        ne(sessions.status, SESSION_STATUS.DELETING),
        ne(sessions.status, SESSION_STATUS.POOLED),
        or(ilike(sessions.title, `%${query}%`), ilike(projects.name, `%${query}%`)),
      ),
    )
    .orderBy(desc(sessions.createdAt))
    .limit(searchLimit * 2);
}

export async function getSessionContainers(sessionId: string) {
  const session = await findSessionById(sessionId);
  if (!session) return null;

  const containers = await getSessionContainersWithDetails(sessionId);
  return { session, containers };
}
