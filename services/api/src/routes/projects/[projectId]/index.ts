import {
  findProjectById,
  deleteProject,
  updateProject,
} from "../../../utils/repositories/project.repository";
import { notFoundResponse, noContentResponse, badRequestResponse } from "../../../shared/http";
import type { RouteHandler } from "../../../utils/handlers/route-handler";

const GET: RouteHandler = async (_request, params) => {
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  if (!projectId) return badRequestResponse("Missing projectId");

  const project = await findProjectById(projectId);
  if (!project) return notFoundResponse();
  return Response.json(project);
};

const PATCH: RouteHandler = async (request, params) => {
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  if (!projectId) return badRequestResponse("Missing projectId");

  const body = await request.json();
  const project = await updateProject(projectId, {
    description: body.description,
    systemPrompt: body.systemPrompt,
  });
  if (!project) return notFoundResponse();
  return Response.json(project);
};

const DELETE: RouteHandler = async (_request, params) => {
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  if (!projectId) return badRequestResponse("Missing projectId");

  await deleteProject(projectId);
  return noContentResponse();
};

export { DELETE, GET, PATCH };
