import type { RouteHandler } from "../types/route";

export const GET: RouteHandler = ({ context: { daemonManager, widelog } }) => {
  const sessions = daemonManager.getAllSessions();
  widelog.set("daemon.count", sessions.length);
  return Response.json({ daemons: sessions });
};
