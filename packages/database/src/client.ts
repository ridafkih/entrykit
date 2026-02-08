import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve, dirname } from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(databaseUrl);
export const db = drizzle(client);

export type Database = typeof db;

const migrationsFolder = resolve(dirname(new URL(import.meta.url).pathname), "migrations");

export async function runMigrations() {
  await migrate(db, { migrationsFolder });
}
