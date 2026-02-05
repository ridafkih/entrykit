import { z } from "zod";
import { tool } from "ai";
import { db } from "@lab/database/client";
import { sessions } from "@lab/database/schema/sessions";
import { projects } from "@lab/database/schema/projects";
import { eq, ne, and, desc, or, ilike } from "drizzle-orm";
import { resolveWorkspacePathBySession } from "../../shared/path-resolver";
import { isOpencodeMessage, extractTextFromParts } from "../opencode-messages";
import type { OpencodeClient } from "../../types/dependencies";
import { SESSION_STATUS } from "../../types/session";

const inputSchema = z.object({
  query: z.string().describe("The search query to find relevant sessions"),
  limit: z.number().optional().default(5).describe("Maximum number of results to return"),
});

export function createSearchSessionsTool(opencode: OpencodeClient) {
  return tool({
    description:
      "Searches across session titles and conversation content to find relevant sessions. Returns matching sessions with relevant content snippets.",
    inputSchema,
    execute: async ({ query, limit }) => {
      const searchLimit = limit ?? 5;

      const rows = await db
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

      // Fetch all messages in parallel to avoid N+1 queries
      const messagePromises = rows.map(async (row) => {
        if (!row.opencodeSessionId) return null;
        try {
          const directory = await resolveWorkspacePathBySession(row.id);
          const response = await opencode.session.messages({
            sessionID: row.opencodeSessionId,
            directory,
          });
          return response.data ?? [];
        } catch {
          return null;
        }
      });

      const allMessages = await Promise.all(messagePromises);
      const queryLower = query.toLowerCase();

      const results: Array<{
        sessionId: string;
        projectName: string;
        title: string | null;
        relevantContent: string;
        score: number;
      }> = [];

      for (let i = 0; i < rows.length; i++) {
        if (results.length >= searchLimit) break;

        const row = rows[i]!;
        let relevantContent = "";
        let score = 0;

        if (row.title?.toLowerCase().includes(queryLower)) {
          relevantContent = row.title;
          score = 0.8;
        }

        if (row.projectName.toLowerCase().includes(queryLower)) {
          score = Math.max(score, 0.6);
        }

        const rawMessages = allMessages[i];
        if (rawMessages) {
          const messages = Array.isArray(rawMessages) ? rawMessages.filter(isOpencodeMessage) : [];

          for (const msg of messages) {
            const text = extractTextFromParts(msg.parts);
            if (text.toLowerCase().includes(queryLower)) {
              const index = text.toLowerCase().indexOf(queryLower);
              const start = Math.max(0, index - 50);
              const end = Math.min(text.length, index + query.length + 50);
              relevantContent = "..." + text.slice(start, end) + "...";
              score = 1.0;
              break;
            }
          }
        }

        if (score > 0) {
          results.push({
            sessionId: row.id,
            projectName: row.projectName,
            title: row.title,
            relevantContent,
            score,
          });
        }
      }

      results.sort((a, b) => b.score - a.score);

      return { results: results.slice(0, searchLimit) };
    },
  });
}
