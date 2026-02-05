import { findSessionsByProjectId } from "../../../repositories/session.repository";
import { spawnSession } from "../../../orchestration/session-spawner";
import { withParams } from "../../../shared/route-helpers";
import type { BrowserContext, SessionContext, InfraContext } from "../../../types/route";

const GET = withParams<{ projectId: string }>(["projectId"], async ({ projectId }, _request) => {
  const sessions = await findSessionsByProjectId(projectId);
  return Response.json(sessions);
});

const POST = withParams<{ projectId: string }, BrowserContext & SessionContext & InfraContext>(
  ["projectId"],
  async ({ projectId }, request, context) => {
    const body = await request.json();

    const result = await spawnSession({
      projectId,
      taskSummary: body.initialMessage || body.title || "",
      browserService: context.browserService,
      sessionLifecycle: context.sessionLifecycle,
      poolManager: context.poolManager,
      publisher: context.publisher,
    });

    return Response.json(
      {
        ...result.session,
        containers: result.containers,
      },
      { status: 201 },
    );
  },
);

export { GET, POST };
