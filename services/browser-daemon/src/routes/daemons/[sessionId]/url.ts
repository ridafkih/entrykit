import { UrlResponse } from "@lab/browser-protocol";
import type { RouteHandler } from "../../../utils/route-handler";
import { getCurrentUrl } from "../../../utils/agent-browser";
import { notFoundResponse, errorResponse } from "../../../shared/http";

export const GET: RouteHandler = async (_request, params, { daemonManager }) => {
  const sessionId = params.sessionId!;

  const session = daemonManager.getSession(sessionId);
  if (!session) {
    return notFoundResponse("Session not found");
  }

  try {
    const url = await getCurrentUrl(sessionId);
    const response: typeof UrlResponse._type = { url };
    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message);
  }
};
