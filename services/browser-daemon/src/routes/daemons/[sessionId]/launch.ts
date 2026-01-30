import type { RouteHandler } from "../../../utils/route-handler";
import { getCurrentUrl } from "../../../utils/agent-browser";
import { notFoundResponse, badRequestResponse, errorResponse } from "../../../shared/http";

export const POST: RouteHandler = async (_request, params, { daemonManager }) => {
  const sessionId = params.sessionId;
  if (!sessionId) {
    return badRequestResponse("Session ID required");
  }

  const session = daemonManager.getOrRecoverSession(sessionId);
  if (!session) {
    return notFoundResponse("Session not found");
  }

  try {
    const url = await getCurrentUrl(sessionId);
    return Response.json({ sessionId, launched: true, url, port: session.port, ready: session.ready });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message);
  }
};
