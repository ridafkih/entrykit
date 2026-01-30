import { cleanupSocket, getSocketDir, getPidFile, isDaemonRunning } from "agent-browser";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Subprocess } from "bun";

export interface SpawnOptions {
  sessionId: string;
  port: number;
  profileDir?: string;
}

export function spawnDaemon(options: SpawnOptions): Subprocess {
  const { sessionId, port, profileDir } = options;
  const daemonPath = require.resolve("agent-browser/dist/daemon.js");

  const env: Record<string, string> = {
    ...process.env,
    AGENT_BROWSER_DAEMON: "1",
    AGENT_BROWSER_SESSION: sessionId,
    AGENT_BROWSER_STREAM_PORT: String(port),
    AGENT_BROWSER_SOCKET_DIR: getSocketDir(),
  } as Record<string, string>;

  if (profileDir) {
    const profilePath = join(profileDir, sessionId);
    if (!existsSync(profilePath)) {
      mkdirSync(profilePath, { recursive: true });
    }
    env.AGENT_BROWSER_PROFILE = profilePath;
  }

  return Bun.spawn(["bun", "run", daemonPath], {
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });
}

export function killSubprocess(subprocess: Subprocess, sessionId: string): boolean {
  try {
    subprocess.kill("SIGTERM");
    cleanupSocket(sessionId);
    return true;
  } catch (error) {
    console.warn(`[DaemonProcess] Failed to kill subprocess for ${sessionId}:`, error);
    return false;
  }
}

export function killByPidFile(sessionId: string): boolean {
  try {
    const pidFile = getPidFile(sessionId);
    if (!existsSync(pidFile)) return false;

    const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
    if (isNaN(pid)) return false;

    process.kill(pid, "SIGTERM");
    cleanupSocket(sessionId);
    return true;
  } catch (error) {
    console.warn(`[DaemonProcess] Failed to kill process for ${sessionId}:`, error);
    return false;
  }
}

export async function waitForSocket(sessionId: string, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  const pollInterval = 50;

  while (Date.now() - start < timeoutMs) {
    if (isDaemonRunning(sessionId)) return;
    await Bun.sleep(pollInterval);
  }

  throw new Error(`Timeout waiting for daemon socket: ${sessionId}`);
}
