import { isDaemonRunning, cleanupSocket, getSocketDir, getStreamPortFile } from "agent-browser";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { DaemonSession } from "../types/daemon";
import { logger } from "../logging";
import { getErrorMessage } from "../shared/errors";

export interface RecoveryCallbacks {
  onRecover: (sessionId: string, streamPort: number, cdpPort?: number) => void;
}

function getCdpPortFile(sessionId: string): string {
  return `${getSocketDir()}/${sessionId}.cdp`;
}

export function recoverSession(
  sessionId: string,
  callbacks: RecoveryCallbacks,
): DaemonSession | null {
  try {
    const streamPortPath = getStreamPortFile(sessionId);
    if (!existsSync(streamPortPath)) {
      logger.debug({
        event_name: "daemon.recovery_skipped",
        session_id: sessionId,
        reason: "no stream port file",
      });
      return null;
    }

    const streamPort = parseInt(readFileSync(streamPortPath, "utf-8").trim(), 10);
    if (isNaN(streamPort)) {
      logger.debug({
        event_name: "daemon.recovery_skipped",
        session_id: sessionId,
        reason: "invalid port in file",
      });
      return null;
    }

    const cdpPortPath = getCdpPortFile(sessionId);
    let cdpPort: number | undefined;
    if (existsSync(cdpPortPath)) {
      const parsed = parseInt(readFileSync(cdpPortPath, "utf-8").trim(), 10);
      if (!isNaN(parsed)) {
        cdpPort = parsed;
      }
    }

    if (!isDaemonRunning(sessionId)) {
      logger.debug({
        event_name: "daemon.recovery_skipped",
        session_id: sessionId,
        reason: "daemon not running",
      });
      cleanupSocket(sessionId);
      return null;
    }

    callbacks.onRecover(sessionId, streamPort, cdpPort);
    logger.info({
      event_name: "daemon.session_recovered",
      session_id: sessionId,
      stream_port: streamPort,
      cdp_port: cdpPort,
    });
    return {
      sessionId,
      port: streamPort,
      cdpPort: cdpPort ?? 0,
      ready: isDaemonRunning(sessionId),
    };
  } catch (error) {
    logger.warn({
      event_name: "daemon.recovery_failed",
      session_id: sessionId,
      error_message: getErrorMessage(error),
    });
    return null;
  }
}

export function discoverExistingSessions(callbacks: RecoveryCallbacks): void {
  const socketDir = getSocketDir();
  if (!existsSync(socketDir)) return;

  const files = readdirSync(socketDir);
  const streamFiles = files.filter((file) => file.endsWith(".stream"));

  for (const streamFile of streamFiles) {
    const sessionId = streamFile.replace(".stream", "");
    if (sessionId === "default") continue;
    recoverSession(sessionId, callbacks);
  }
}
