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

export function listProcesses(server: McpServer, { docker }: ToolContext) {
  server.registerTool(
    "list_processes",
    {
      description:
        "List all running processes (containers) in the session. Shows the current status of each service including their hostname, image, and exposed ports.",
      inputSchema: {
        sessionId: z.string().describe("The Lab session ID (provided in the system prompt)"),
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

      if (data.services.length === 0) {
        return {
          content: [{ type: "text", text: "No running processes found in this session." }],
        };
      }

      const output = data.services.map((service) => ({
        hostname: service.hostname,
        image: service.image,
        status: service.status,
        ports: service.ports,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    },
  );
}
