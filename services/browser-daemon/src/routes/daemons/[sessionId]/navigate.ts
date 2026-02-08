import { z } from "zod";
import { NotFoundError, ServiceUnavailableError } from "../../../shared/errors";
import { parseRequestBody } from "../../../shared/validation";
import type { RouteHandler } from "../../../types/route";

const navigateBody = z.object({
  url: z.string().url(),
});

export const POST: RouteHandler = async (request, params, { daemonManager, widelog }) => {
  const sessionId = params.sessionId!;
  widelog.set("session.id", sessionId);

  const session = daemonManager.getSession(sessionId);
  if (!session) {
    throw new NotFoundError("Daemon session", sessionId);
  }

  if (!daemonManager.isReady(sessionId)) {
    throw new ServiceUnavailableError("Daemon not ready", "DAEMON_NOT_READY");
  }

  const { url } = await parseRequestBody(request, navigateBody);
  widelog.set("navigation.url", url);

  daemonManager.navigate(sessionId, url);
  return Response.json({ sessionId, navigated: true });
};
