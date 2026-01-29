import { db } from "@lab/database/client";
import { providerApiKeys } from "@lab/database/schema/provider-api-keys";
import { eq } from "drizzle-orm";
import { decrypt } from "./crypto";

export async function getProviderApiKey(provider: string): Promise<string | null> {
  const [result] = await db
    .select({ encryptedKey: providerApiKeys.encryptedKey })
    .from(providerApiKeys)
    .where(eq(providerApiKeys.provider, provider));

  if (!result) {
    return null;
  }

  return decrypt(result.encryptedKey);
}
