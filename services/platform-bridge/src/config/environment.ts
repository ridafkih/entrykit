import {
  getRequiredEnv,
  getOptionalEnvInt,
  getOptionalEnvBool,
  getOptionalEnvList,
} from "@lab/env-config";

export const config = {
  port: getOptionalEnvInt("PORT", 3040),
  apiUrl: getRequiredEnv("API_URL"),
  apiWsUrl: getRequiredEnv("API_WS_URL"),
  databaseUrl: getRequiredEnv("DATABASE_URL"),

  imessageEnabled: getOptionalEnvBool("IMESSAGE_ENABLED", true),
  imessageWatchedContacts: getOptionalEnvList("IMESSAGE_WATCHED_CONTACTS"),
  imessageContextMessages: getOptionalEnvInt("IMESSAGE_CONTEXT_MESSAGES", 20),

  staleSessionThresholdMs: getOptionalEnvInt("STALE_SESSION_THRESHOLD_MS", 86400000),
};

export type Config = typeof config;
