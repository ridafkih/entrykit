import type { RouteHandler } from "../types/route";

export const GET: RouteHandler = () => {
  return Response.json({ status: "ok" });
};

export const HEAD: RouteHandler = () => {
  return new Response(null, { status: 200 });
};
