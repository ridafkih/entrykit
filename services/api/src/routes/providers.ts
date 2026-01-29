import { db } from "@lab/database/client";
import { providerApiKeys } from "@lab/database/schema/provider-api-keys";
import { eq } from "drizzle-orm";
import { encrypt } from "../utils/crypto";
import type { RouteHandler } from "../utils/route-handler";

const GET: RouteHandler = async () => {
  const providers = await db
    .select({
      id: providerApiKeys.id,
      provider: providerApiKeys.provider,
      createdAt: providerApiKeys.createdAt,
      updatedAt: providerApiKeys.updatedAt,
    })
    .from(providerApiKeys);

  return Response.json(providers);
};

const POST: RouteHandler = async (request) => {
  const body = await request.json();

  if (!body.provider || typeof body.provider !== "string") {
    return Response.json({ error: "provider is required" }, { status: 400 });
  }

  if (!body.apiKey || typeof body.apiKey !== "string") {
    return Response.json({ error: "apiKey is required" }, { status: 400 });
  }

  const encryptedKey = encrypt(body.apiKey);

  const [result] = await db
    .insert(providerApiKeys)
    .values({
      provider: body.provider,
      encryptedKey,
    })
    .onConflictDoUpdate({
      target: providerApiKeys.provider,
      set: {
        encryptedKey,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: providerApiKeys.id,
      provider: providerApiKeys.provider,
      createdAt: providerApiKeys.createdAt,
      updatedAt: providerApiKeys.updatedAt,
    });

  return Response.json(result, { status: 201 });
};

export { GET, POST };
