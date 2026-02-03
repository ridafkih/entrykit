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

export function getExternalUrl(server: McpServer, _context: ToolContext) {
  server.registerTool(
    "get_external_url",
    {
      description:
        "Get the external URL for a service running in the session. This is the public URL that a user would need to visit in their browser to access the exposed service. Use list_processes first to see available services and their ports.",
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

      // External URL uses the proxy domain format: http://{sessionId}--{port}.{proxyBaseDomain}
      const externalUrl = `http://${args.sessionId}--${args.port}.${data.proxyBaseDomain}`;

      return {
        content: [
          {
            type: "text",
            text: `External URL: ${externalUrl}\n\nShare this URL with the user so they can access the service in their browser.`,
          },
        ],
      };
    },
  );
}
