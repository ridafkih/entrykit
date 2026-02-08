import { logger } from "./logging";
import { registerAdapter, getAllAdapters } from "./platforms";
import { imessageAdapter } from "./platforms/imessage/adapter";
import type { env } from "./env";

type SetupOptions = {
  env: (typeof env)["inferOut"];
};

type SetupFunction = (options: SetupOptions) => unknown;

export const setup = (({ env }) => {
  const config = {
    apiUrl: env.API_URL,
    apiWsUrl: env.API_WS_URL,
    imessageEnabled: env.IMESSAGE_ENABLED !== "false",
    imessageWatchedContacts: env.IMESSAGE_WATCHED_CONTACTS?.split(",").filter(Boolean) ?? [],
    imessageContextMessages: parseInt(env.IMESSAGE_CONTEXT_MESSAGES ?? "20", 10),
    staleSessionThresholdMs: parseInt(env.STALE_SESSION_THRESHOLD_MS ?? "86400000", 10),
  };

  if (config.imessageEnabled) {
    registerAdapter(imessageAdapter);
  }

  const adapters = getAllAdapters();
  logger.info({
    event_name: "platform_bridge.adapters_registered",
    count: adapters.length,
  });

  return { config, adapters };
}) satisfies SetupFunction;
