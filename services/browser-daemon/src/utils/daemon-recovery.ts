import {
  isDaemonRunning,
  cleanupSocket,
  getSocketDir,
  getStreamPortFile,
} from "agent-browser";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { DaemonSession } from "../types/daemon";

export interface RecoveryCallbacks {
  onRecover: (sessionId: string, port: number) => void;
}

export function recoverSession(sessionId: string, callbacks: RecoveryCallbacks): DaemonSession | null {
  try {
    const streamPortPath = getStreamPortFile(sessionId);
    if (!existsSync(streamPortPath)) {
      console.debug(`[DaemonRecovery] Cannot recover ${sessionId}: no stream port file`);
      return null;
    }

    const port = parseInt(readFileSync(streamPortPath, "utf-8").trim(), 10);
    if (isNaN(port)) {
      console.debug(`[DaemonRecovery] Cannot recover ${sessionId}: invalid port in file`);
      return null;
    }

    if (!isDaemonRunning(sessionId)) {
      console.debug(`[DaemonRecovery] Cannot recover ${sessionId}: daemon not running`);
      cleanupSocket(sessionId);
      return null;
    }

    callbacks.onRecover(sessionId, port);
    console.log(`[DaemonRecovery] Recovered: ${sessionId} on port ${port}`);
    return { sessionId, port, ready: isDaemonRunning(sessionId) };
  } catch (error) {
    console.warn(`[DaemonRecovery] Failed to recover ${sessionId}:`, error);
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
