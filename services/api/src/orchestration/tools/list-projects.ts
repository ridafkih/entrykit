import { z } from "zod";
import { tool } from "ai";
import { listProjects } from "../../services/project.service";

export const listProjectsTool = tool({
  description: "Lists all available projects with their IDs, names, and descriptions",
  inputSchema: z.object({}),
  execute: async () => {
    const projects = await listProjects();
    return {
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
      })),
    };
  },
});
