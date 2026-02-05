export interface SessionNetwork {
  id: string;
}

export interface SessionManager {
  createSessionNetwork(sessionId: string): Promise<SessionNetwork>;
  removeSessionNetwork(sessionId: string): Promise<void>;
  cleanupOrphanedSessionNetworks(activeSessionIds: string[]): Promise<number>;
  reconcileSessionNetworks(activeSessionIds: string[]): Promise<void>;
}
