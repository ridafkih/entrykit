import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const providerApiKeys = pgTable("provider_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().unique(),
  encryptedKey: text("encrypted_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProviderApiKey = typeof providerApiKeys.$inferSelect;
export type NewProviderApiKey = typeof providerApiKeys.$inferInsert;
