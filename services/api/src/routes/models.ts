import type { Handler, InfraContext } from "../types/route";

const GET: Handler<InfraContext> = async (_request, _params, ctx) => {
  const response = await ctx.opencode.provider.list();

  if (response.error || !response.data) {
    throw new Error("Failed to fetch providers");
  }

  const { all, connected } = response.data;
  const connectedSet = new Set(connected);

  const models = all
    .filter((provider) => connectedSet.has(provider.id))
    .flatMap((provider) =>
      Object.values(provider.models ?? {}).map((model) => ({
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        name: model.name,
      })),
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  return Response.json({ models });
};

export { GET };
