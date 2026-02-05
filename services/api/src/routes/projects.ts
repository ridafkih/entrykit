import { findAllProjectsWithContainers, createProject } from "../repositories/project.repository";
import type { Handler, InfraContext } from "../types/route";

const GET: Handler = async () => {
  const projects = await findAllProjectsWithContainers();
  return Response.json(projects);
};

const POST: Handler<InfraContext> = async (request, _params, ctx) => {
  const body = await request.json();
  const project = await createProject({
    name: body.name,
    description: body.description,
    systemPrompt: body.systemPrompt,
  });

  ctx.publisher.publishDelta("projects", {
    type: "add",
    project: { id: project.id, name: project.name },
  });

  return Response.json(project, { status: 201 });
};

export { GET, POST };
