import {
  findContainersByProjectId,
  createContainer,
  createContainerPorts,
} from "../../../utils/repositories/container.repository";
import type { RouteHandler } from "../../../utils/handlers/route-handler";

const GET: RouteHandler = async (_request, params) => {
  const containers = await findContainersByProjectId(params.projectId);
  return Response.json(containers);
};

const POST: RouteHandler = async (request, params) => {
  const body = await request.json();
  const container = await createContainer({
    projectId: params.projectId,
    image: body.image,
    hostname: body.hostname,
  });

  if (body.ports && Array.isArray(body.ports) && body.ports.length > 0) {
    await createContainerPorts(container.id, body.ports);
  }

  return Response.json(container, { status: 201 });
};

export { GET, POST };
