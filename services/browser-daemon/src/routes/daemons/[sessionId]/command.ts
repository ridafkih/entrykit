import type { Command } from "agent-browser/dist/types.js";
import type { RouteHandler } from "../../../utils/route-handler";
import { notFoundResponse, badRequestResponse, serviceUnavailableResponse } from "../../../shared/http";

export const POST: RouteHandler = async (request, params, { daemonManager }) => {
  const sessionId = params.sessionId!;

  const session = daemonManager.getSession(sessionId);
  if (!session) {
    return notFoundResponse("Session not found");
  }

  if (!daemonManager.isReady(sessionId)) {
    return serviceUnavailableResponse("Session not ready");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  if (typeof body !== "object" || body === null || !("id" in body) || !("action" in body)) {
    return badRequestResponse("Command must have 'id' and 'action' fields");
  }

  const command = body as Command;

  console.log(`[Command] ${sessionId} -> ${command.action}`);
  const response = await daemonManager.executeCommand(sessionId, command);
  console.log(`[Command] ${sessionId} <- ${response.success ? "success" : "error"}`);

  return Response.json(response);
};
