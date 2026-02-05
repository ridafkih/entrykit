import type { Handler, InfraContext } from "../types/route";

const GET: Handler<InfraContext> = async (_request, _params, ctx) => {
  const { data } = await ctx.opencode.provider.list();
  return Response.json(data);
};

export { GET };
