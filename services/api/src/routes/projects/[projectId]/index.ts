import {
  findProjectByIdOrThrow,
  deleteProject,
  updateProject,
} from "../../../repositories/project.repository";
import { noContentResponse } from "@lab/http-utilities";
import { parseRequestBody } from "../../../shared/validation";
import { withParams } from "../../../shared/route-helpers";
import { z } from "zod";

const updateProjectSchema = z.object({
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
});

const GET = withParams<{ projectId: string }>(["projectId"], async ({ projectId }, _request) => {
  const project = await findProjectByIdOrThrow(projectId);
  return Response.json(project);
});

const PATCH = withParams<{ projectId: string }>(["projectId"], async ({ projectId }, request) => {
  const body = await parseRequestBody(request, updateProjectSchema);

  await findProjectByIdOrThrow(projectId);
  const project = await updateProject(projectId, {
    description: body.description,
    systemPrompt: body.systemPrompt,
  });
  return Response.json(project);
});

const DELETE = withParams<{ projectId: string }>(["projectId"], async ({ projectId }, _request) => {
  await deleteProject(projectId);
  return noContentResponse();
});

export { DELETE, GET, PATCH };
