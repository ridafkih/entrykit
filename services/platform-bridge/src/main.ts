import { logger } from "./logging";
import { messageRouter } from "./bridge/message-router";
import { responseSubscriber } from "./bridge/response-subscriber";
import { sessionTracker } from "./bridge/session-tracker";
import { multiplayerClient } from "./clients/multiplayer";
import { getAllAdapters } from "./platforms";
import type { setup } from "./setup";
import type { env } from "./env";

type MainOptions = {
  env: (typeof env)["inferOut"];
  extras: ReturnType<typeof setup>;
};

type MainFunction = (options: MainOptions) => unknown;

export const main = (async ({ extras }) => {
  const { config, adapters } = extras;

  multiplayerClient.connect();

  for (const adapter of adapters) {
    try {
      await adapter.initialize();
      await adapter.startListening((message) => messageRouter.handleIncomingMessage(message));
      logger.info({
        event_name: "platform_bridge.adapter_started",
        platform: adapter.platform,
      });
    } catch (error) {
      logger.error({
        event_name: "platform_bridge.adapter_start_failed",
        platform: adapter.platform,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const cleanupInterval = setInterval(async () => {
    try {
      const cleaned = await sessionTracker.cleanupStaleMappings();
      if (cleaned > 0) {
        logger.info({
          event_name: "platform_bridge.stale_mappings_cleaned",
          count: cleaned,
        });
      }
    } catch (error) {
      logger.error({
        event_name: "platform_bridge.cleanup_error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, 3600000);

  logger.info({ event_name: "platform_bridge.startup" });

  return () => {
    logger.info({ event_name: "platform_bridge.shutdown" });
    clearInterval(cleanupInterval);

    for (const adapter of getAllAdapters()) {
      try {
        adapter.stopListening();
      } catch (error) {
        logger.error({
          event_name: "platform_bridge.adapter_stop_failed",
          platform: adapter.platform,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    responseSubscriber.unsubscribeAll();
    multiplayerClient.disconnect();
  };
}) satisfies MainFunction;
