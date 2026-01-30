import { findProjectById, deleteProject } from "../../utils/repositories/project.repository";
import { notFoundResponse, noContentResponse } from "../../shared/http";
import type { RouteHandler } from "../../utils/handlers/route-handler";

const GET: RouteHandler = async (_request, params) => {
  const project = await findProjectById(params.projectId);
  if (!project) return notFoundResponse();
  return Response.json(project);
};

const DELETE: RouteHandler = async (_request, params) => {
  await deleteProject(params.projectId);
  return noContentResponse();
};

export { DELETE, GET };
