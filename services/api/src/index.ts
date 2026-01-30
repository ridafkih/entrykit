import { server, browserService, shutdownBrowserService } from "./clients/server";
import { startContainerMonitor } from "./utils/monitors/container.monitor";
import { startOpenCodeMonitor } from "./utils/monitors/opencode.monitor";
import { cleanupOrphanedSessions } from "./utils/browser/state-store";

console.log(`API server running on http://localhost:${server.port}`);

cleanupOrphanedSessions().catch((error) => {
  console.warn("[Startup] Failed to cleanup orphaned browser sessions:", error);
});

startContainerMonitor();
startOpenCodeMonitor();

async function gracefulShutdown() {
  shutdownBrowserService(browserService);
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
