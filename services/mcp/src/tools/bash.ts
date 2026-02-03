import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { ToolContext } from "../types/tool";
import { config } from "../config/environment";

interface WorkspaceContainerResponse {
  dockerId: string;
  workdir: string;
}

async function getWorkspaceContainer(
  sessionId: string,
): Promise<WorkspaceContainerResponse | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/internal/sessions/${sessionId}/workspace-container`,
  );
  if (!response.ok) return null;
  return response.json();
}

export function bash(server: McpServer, { docker }: ToolContext) {
  server.registerTool(
    "bash",
    {
      description:
        "Execute a bash command in the session's workspace container. Use this tool to run shell commands, install packages, build projects, or interact with the filesystem.",
      inputSchema: {
        sessionId: z.string().describe("The Lab session ID (provided in the system prompt)"),
        command: z.string().describe("The bash command to execute"),
        workdir: z
          .string()
          .optional()
          .describe("Working directory for the command (defaults to workspace root)"),
        timeout: z.number().optional().describe("Timeout in milliseconds"),
      },
    },
    async (args) => {
      const workspace = await getWorkspaceContainer(args.sessionId);
      if (!workspace) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Could not find workspace container for session "${args.sessionId}". Make sure the session exists and has a workspace container.`,
            },
          ],
        };
      }

      const exists = await docker.containerExists(workspace.dockerId);
      if (!exists) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Workspace container "${workspace.dockerId}" not found or not running`,
            },
          ],
        };
      }

      const result = await docker.exec(workspace.dockerId, {
        command: ["sh", "-c", args.command],
        workdir: args.workdir || workspace.workdir,
      });

      if (result.exitCode !== 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Exit code: ${result.exitCode}\n\nStdout:\n${result.stdout}\n\nStderr:\n${result.stderr}`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: result.stdout }],
      };
    },
  );
}
