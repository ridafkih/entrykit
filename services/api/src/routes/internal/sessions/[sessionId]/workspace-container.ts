import { badRequestResponse, notFoundResponse } from "../../../../shared/http";
import { getWorkspaceContainerDockerId } from "../../../../utils/repositories/container.repository";
import { formatContainerWorkspacePath } from "../../../../types/session";
import type { RouteHandler } from "../../../../utils/handlers/route-handler";

const GET: RouteHandler = async (_request, params) => {
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  if (!sessionId) return badRequestResponse("Missing sessionId");

  const result = await getWorkspaceContainerDockerId(sessionId);
  if (!result) return notFoundResponse();

  return Response.json({
    dockerId: result.dockerId,
    workdir: formatContainerWorkspacePath(sessionId, result.containerId),
  });
};

export { GET };
