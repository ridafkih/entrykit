import { z } from "zod";
import { tool } from "ai";
import { findSessionById } from "../../repositories/session.repository";
import type { DaemonController } from "@lab/browser-protocol";

export interface GetSessionScreenshotToolContext {
  daemonController: DaemonController;
}

const inputSchema = z.object({
  sessionId: z.string().describe("The session ID to get a screenshot from"),
  fullPage: z
    .boolean()
    .optional()
    .describe(
      "Set to true to capture the ENTIRE scrollable page in one image. Default is false (viewport only). Use this when you need to see all content on a long page.",
    ),
});

export function createGetSessionScreenshotTool(context: GetSessionScreenshotToolContext) {
  return tool({
    description:
      "Gets a screenshot of the browser for a session. Set fullPage: true to capture the ENTIRE scrollable page in one image (recommended for long pages). Otherwise captures just the visible viewport.",
    inputSchema,
    execute: async ({ sessionId, fullPage }) => {
      const session = await findSessionById(sessionId);

      if (!session) {
        return { error: "Session not found", hasScreenshot: false };
      }

      const commandId = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await context.daemonController.executeCommand<{ base64?: string }>(sessionId, {
        id: commandId,
        action: "screenshot",
        fullPage: fullPage ?? false,
      });

      if (!result.success || !result.data?.base64) {
        return {
          error: result.error || "Failed to capture screenshot",
          hasScreenshot: false,
        };
      }

      return {
        hasScreenshot: true,
        screenshot: {
          data: result.data.base64,
          encoding: "base64" as const,
          format: "png",
        },
      };
    },
  });
}
