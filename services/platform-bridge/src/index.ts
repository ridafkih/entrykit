import { config } from "./config/environment";
import { messageRouter } from "./bridge/message-router";
import { responseSubscriber } from "./bridge/response-subscriber";
import { sessionTracker } from "./bridge/session-tracker";
import { multiplayerClient } from "./clients/multiplayer";
import { registerAdapter, getAllAdapters } from "./platforms";
import { imessageAdapter } from "./platforms/imessage/adapter";

async function main() {
  console.log("[PlatformBridge] Starting service...");

  multiplayerClient.connect();

  if (config.imessageEnabled) {
    registerAdapter(imessageAdapter);
  }

  const adapters = getAllAdapters();
  console.log(`[PlatformBridge] Registered ${adapters.length} platform adapter(s)`);

  for (const adapter of adapters) {
    try {
      await adapter.initialize();
      await adapter.startListening((message) => messageRouter.handleIncomingMessage(message));
      console.log(`[PlatformBridge] Started ${adapter.platform} adapter`);
    } catch (error) {
      console.error(`[PlatformBridge] Failed to start ${adapter.platform} adapter:`, error);
    }
  }

  const cleanupInterval = setInterval(async () => {
    try {
      const cleaned = await sessionTracker.cleanupStaleMappings();
      if (cleaned > 0) {
        console.log(`[PlatformBridge] Cleaned up ${cleaned} stale mappings`);
      }
    } catch (error) {
      console.error("[PlatformBridge] Cleanup error:", error);
    }
  }, 3600000);

  console.log(`[PlatformBridge] Service running on port ${config.port}`);

  async function gracefulShutdown() {
    console.log("[PlatformBridge] Shutting down...");

    clearInterval(cleanupInterval);

    for (const adapter of getAllAdapters()) {
      try {
        await adapter.stopListening();
      } catch (error) {
        console.error(`[PlatformBridge] Error stopping ${adapter.platform}:`, error);
      }
    }

    responseSubscriber.unsubscribeAll();
    multiplayerClient.disconnect();

    console.log("[PlatformBridge] Shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

main().catch((error) => {
  console.error("[PlatformBridge] Fatal error:", error);
  process.exit(1);
});
