import { z } from "zod";
import type { Handler, BrowserContext, SessionContext, InfraContext } from "../../types/route";
import { findProjectByIdOrThrow } from "../../repositories/project.repository";
import { spawnSession } from "../../orchestration/session-spawner";
import { initiateConversation } from "../../orchestration/conversation-initiator";
import { parseRequestBody } from "../../shared/validation";

const createSessionRequestSchema = z.object({
  projectId: z.string().min(1),
  taskSummary: z.string().optional(),
  modelId: z.string().optional(),
});

const POST: Handler<BrowserContext & SessionContext & InfraContext> = async (
  request,
  _params,
  context,
) => {
  const { projectId, taskSummary, modelId } = await parseRequestBody(
    request,
    createSessionRequestSchema,
  );

  const project = await findProjectByIdOrThrow(projectId);

  const { session } = await spawnSession({
    projectId,
    taskSummary: taskSummary ?? "New session",
    browserService: context.browserService,
    sessionLifecycle: context.sessionLifecycle,
    poolManager: context.poolManager,
    publisher: context.publisher,
  });

  if (taskSummary) {
    await initiateConversation({
      sessionId: session.id,
      task: taskSummary,
      modelId,
      opencode: context.opencode,
      publisher: context.publisher,
    });
  }

  return Response.json(
    {
      sessionId: session.id,
      projectId: project.id,
      projectName: project.name,
    },
    { status: 201 },
  );
};

export { POST };
