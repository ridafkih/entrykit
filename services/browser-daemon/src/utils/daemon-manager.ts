import { isDaemonRunning } from "agent-browser";
import type { Subprocess } from "bun";
import type { DaemonManager, DaemonManagerConfig, DaemonSession, StartResult, StopResult } from "../types/daemon";
import { spawnDaemon, killSubprocess, killByPidFile } from "./daemon-process";
import { recoverSession, discoverExistingSessions } from "./daemon-recovery";

export type { DaemonManager, DaemonManagerConfig, DaemonSession, StartResult, StopResult } from "../types/daemon";

export function createDaemonManager(config: DaemonManagerConfig): DaemonManager {
  const activeSessions = new Map<string, number>();
  const daemonProcesses = new Map<string, Subprocess>();
  let nextStreamPort = config.baseStreamPort + 1;

  const allocatePort = (): number => nextStreamPort++;

  const recoveryCallbacks = {
    onRecover: (sessionId: string, port: number) => {
      activeSessions.set(sessionId, port);
      if (port >= nextStreamPort) {
        nextStreamPort = port + 1;
      }
    },
  };

  const killDaemonProcess = (sessionId: string): boolean => {
    const subprocess = daemonProcesses.get(sessionId);
    if (subprocess) {
      const killed = killSubprocess(subprocess, sessionId);
      daemonProcesses.delete(sessionId);
      if (killed) return true;
    }
    return killByPidFile(sessionId);
  };

  discoverExistingSessions(recoveryCallbacks);

  return {
    async start(sessionId: string): Promise<StartResult> {
      const existingPort = activeSessions.get(sessionId);
      if (existingPort !== undefined) {
        return { type: "already_running", sessionId, port: existingPort, ready: isDaemonRunning(sessionId) };
      }

      const port = allocatePort();
      activeSessions.set(sessionId, port);

      const subprocess = spawnDaemon({ sessionId, port, profileDir: config.profileDir });
      daemonProcesses.set(sessionId, subprocess);

      subprocess.exited.then((exitCode) => {
        console.log(`[DaemonManager] Exited: ${sessionId} (code ${exitCode})`);
        daemonProcesses.delete(sessionId);
        activeSessions.delete(sessionId);
      });

      console.log(`[DaemonManager] Starting: ${sessionId} on port ${port}`);
      return { type: "started", sessionId, port, ready: false };
    },

    stop(sessionId: string): StopResult {
      const wasTracked = activeSessions.has(sessionId);
      const killed = killDaemonProcess(sessionId);
      activeSessions.delete(sessionId);

      if (!wasTracked && !killed) {
        return { type: "not_found", sessionId };
      }

      console.log(`[DaemonManager] Stopped: ${sessionId}`);
      return { type: "stopped", sessionId };
    },

    getSession(sessionId: string): DaemonSession | null {
      const port = activeSessions.get(sessionId);
      if (port === undefined) return null;
      return { sessionId, port, ready: isDaemonRunning(sessionId) };
    },

    getOrRecoverSession(sessionId: string): DaemonSession | null {
      return this.getSession(sessionId) ?? recoverSession(sessionId, recoveryCallbacks);
    },

    getAllSessions(): DaemonSession[] {
      return [...activeSessions.entries()].map(([sessionId, port]) => ({
        sessionId,
        port,
        ready: isDaemonRunning(sessionId),
      }));
    },

    isRunning(sessionId: string): boolean {
      return activeSessions.has(sessionId) && isDaemonRunning(sessionId);
    },

    isReady(sessionId: string): boolean {
      return activeSessions.has(sessionId) && isDaemonRunning(sessionId);
    },
  };
}
