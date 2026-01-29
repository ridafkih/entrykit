import { db } from "@lab/database/client";
import { providerApiKeys } from "@lab/database/schema/provider-api-keys";
import { eq } from "drizzle-orm";
import type { RouteHandler } from "../../utils/route-handler";

const DELETE: RouteHandler = async (_request, params) => {
  const { provider } = params;

  const [deleted] = await db
    .delete(providerApiKeys)
    .where(eq(providerApiKeys.provider, provider))
    .returning({ id: providerApiKeys.id });

  if (!deleted) {
    return Response.json({ error: "Provider not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
};

export { DELETE };
