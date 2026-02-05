import { z } from "zod";
import { tool } from "ai";
import { db } from "@lab/database/client";
import { sessions } from "@lab/database/schema/sessions";
import { projects } from "@lab/database/schema/projects";
import { eq, ne, and, desc } from "drizzle-orm";
import { SESSION_STATUS } from "../../types/session";

const inputSchema = z.object({
  projectId: z.string().optional().describe("Optional project ID to filter sessions by"),
  limit: z.number().optional().default(10).describe("Maximum number of sessions to return"),
});

export const listSessionsTool = tool({
  description:
    "Lists recent sessions, optionally filtered by project. Returns session ID, project name, title, status, and creation time.",
  inputSchema,
  execute: async ({ projectId, limit }) => {
    const conditions = [
      ne(sessions.status, SESSION_STATUS.DELETING),
      ne(sessions.status, SESSION_STATUS.POOLED),
    ];

    if (projectId) {
      conditions.push(eq(sessions.projectId, projectId));
    }

    const rows = await db
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

    return {
      sessions: rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        projectName: row.projectName,
        title: row.title,
        status: row.status,
        createdAt: row.createdAt?.toISOString(),
      })),
    };
  },
});
