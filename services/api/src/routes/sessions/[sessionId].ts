import { docker } from "../../clients/docker";
import { notFoundResponse, noContentResponse, badRequestResponse } from "../../shared/http";
import {
  findSessionById,
  updateSessionOpencodeId,
  updateSessionTitle,
} from "../../utils/repositories/session.repository";
import { findSessionContainersBySessionId } from "../../utils/repositories/container.repository";
import { cleanupSession } from "../../utils/session/session-cleanup";
import { config } from "../../config/environment";
import type { RouteHandler } from "../../utils/handlers/route-handler";

function buildContainerUrls(sessionId: string, ports: Record<string, number>): string[] {
  return Object.keys(ports).map(
    (containerPort) => `http://${sessionId}--${containerPort}.${config.proxyBaseDomain}`,
  );
}

const GET: RouteHandler = async (_request, params) => {
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  if (!sessionId) return badRequestResponse("Missing sessionId");

  try {
    const session = await findSessionById(sessionId);
    if (!session) return notFoundResponse();

    const containers = await findSessionContainersBySessionId(sessionId);

    const containersWithStatus = await Promise.all(
      containers.map(async (container) => {
        if (!container.dockerId) return { ...container, info: null, urls: [] };
        const info = await docker.inspectContainer(container.dockerId);
        const urls = info?.ports ? buildContainerUrls(sessionId, info.ports) : [];
        return { ...container, info, urls };
      }),
    );

    return Response.json({ ...session, containers: containersWithStatus });
  } catch {
    return notFoundResponse();
  }
};

const PATCH: RouteHandler = async (request, params) => {
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  if (!sessionId) return badRequestResponse("Missing sessionId");

  try {
    let session = await findSessionById(sessionId);
    if (!session) return notFoundResponse();

    const body = await request.json();

    if (typeof body.opencodeSessionId === "string") {
      const workspaceDirectory =
        typeof body.workspaceDirectory === "string" ? body.workspaceDirectory : undefined;
      session = await updateSessionOpencodeId(
        sessionId,
        body.opencodeSessionId,
        workspaceDirectory,
      );
    }

    if (typeof body.title === "string") {
      session = await updateSessionTitle(sessionId, body.title);
    }

    return Response.json(session);
  } catch {
    return notFoundResponse();
  }
};

const DELETE: RouteHandler = async (_request, params, context) => {
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  if (!sessionId) return badRequestResponse("Missing sessionId");

  try {
    const session = await findSessionById(sessionId);
    if (!session) return notFoundResponse();

    await cleanupSession(sessionId, context.browserService);
    return noContentResponse();
  } catch {
    return notFoundResponse();
  }
};

export { DELETE, GET, PATCH };
