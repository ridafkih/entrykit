import { opencode } from "../../clients/opencode";
import type { RouteHandler } from "../../utils/handlers/route-handler";

const DELETE: RouteHandler = async (_request, params) => {
  const provider = Array.isArray(params.provider) ? params.provider[0] : params.provider;
  if (!provider) return new Response("Missing provider", { status: 400 });

  await opencode.auth.remove({ providerID: provider });

  return new Response(null, { status: 204 });
};

export { DELETE };
