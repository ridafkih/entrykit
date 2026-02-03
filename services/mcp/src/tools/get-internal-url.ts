import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { ToolContext } from "../types/tool";
import { config } from "../config/environment";

interface SessionServicesResponse {
  sessionId: string;
  proxyBaseDomain: string;
  services: {
    containerId: string;
    dockerId: string;
    hostname: string | null;
    image: string;
    status: string;
    ports: number[];
  }[];
}

async function getSessionServices(sessionId: string): Promise<SessionServicesResponse | null> {
  const response = await fetch(`${config.apiBaseUrl}/internal/sessions/${sessionId}/services`);
  if (!response.ok) return null;
  return response.json();
}

export function getInternalUrl(server: McpServer, _context: ToolContext) {
  server.registerTool(
    "get_internal_url",
    {
      description:
        "Get the internal URL for a service running in the session. This URL can be used with agent-browser to navigate to the service, or with curl/fetch to make HTTP requests from within the workspace container. Use list_processes first to see available services.",
      inputSchema: {
        sessionId: z.string().describe("The Lab session ID (provided in the system prompt)"),
        port: z.number().describe("The port number of the service (from list_processes)"),
      },
    },
    async (args) => {
      const data = await getSessionServices(args.sessionId);
      if (!data) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Could not find session "${args.sessionId}". Make sure the session exists.`,
            },
          ],
        };
      }

      const service = data.services.find(({ ports }) => ports.includes(args.port));
      if (!service) {
        const availablePorts = data.services.flatMap(({ ports }) => ports);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: No service found on port ${args.port}. Available ports: ${availablePorts.join(", ") || "(none)"}`,
            },
          ],
        };
      }

      // Internal URL uses the network alias format: {sessionId}--{port}
      const internalUrl = `http://${args.sessionId}--${args.port}:${args.port}`;

      return {
        content: [
          {
            type: "text",
            text: `Internal URL: ${internalUrl}\n\nYou can use this URL with:\n- agent-browser: Navigate to this URL to interact with the service\n- curl/fetch: Make HTTP requests from within the workspace container\n\n This URL is not relevant to the user.`,
          },
        ],
      };
    },
  );
}
