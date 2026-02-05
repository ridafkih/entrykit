import { findActiveSessionsForReconciliation } from "../repositories/session.repository";
import type { Sandbox } from "../types/dependencies";

export async function createSessionNetwork(sessionId: string, sandbox: Sandbox): Promise<string> {
  const network = await sandbox.session.createSessionNetwork(sessionId);
  return network.id;
}

export async function cleanupSessionNetwork(sessionId: string, sandbox: Sandbox): Promise<void> {
  await sandbox.session.removeSessionNetwork(sessionId);
}

export async function cleanupOrphanedNetworks(sandbox: Sandbox): Promise<number> {
  const activeSessions = await findActiveSessionsForReconciliation();
  const activeSessionIds = new Set(activeSessions.map(({ id }) => id));

  return sandbox.session.cleanupOrphanedSessionNetworks([...activeSessionIds]);
}

export async function reconcileNetworkConnections(sandbox: Sandbox): Promise<void> {
  const activeSessions = await findActiveSessionsForReconciliation();
  await sandbox.session.reconcileSessionNetworks(activeSessions.map((session) => session.id));
}
