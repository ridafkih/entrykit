import { z } from "zod";
import { tool } from "ai";
import { getSessionContainers } from "../../services/session.service";

const inputSchema = z.object({
  sessionId: z.string().describe("The session ID to get containers for"),
});

export const getContainersTool = tool({
  description: "Gets container information for a session including name, image, status, and ports.",
  inputSchema,
  execute: async ({ sessionId }) => {
    const result = await getSessionContainers(sessionId);

    if (!result) {
      return { error: "Session not found", containers: [] };
    }

    return {
      containers: result.containers.map((container) => ({
        id: container.id,
        name: container.hostname ?? container.image.split("/").pop()?.split(":")[0],
        image: container.image,
        status: container.status,
      })),
    };
  },
});
