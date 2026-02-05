import {
  getInferenceStatus,
  setInferenceStatus,
  clearInferenceStatus,
  type InferenceStatus,
} from "./inference-status-store";
import { getLastMessage, setLastMessage, clearLastMessage } from "./last-message-store";

export interface SessionState {
  inferenceStatus: InferenceStatus;
  lastMessage?: string;
}

export function getSessionState(sessionId: string): SessionState {
  return {
    inferenceStatus: getInferenceStatus(sessionId),
    lastMessage: getLastMessage(sessionId),
  };
}

export function updateSessionState(sessionId: string, updates: Partial<SessionState>): void {
  if (updates.inferenceStatus !== undefined) {
    setInferenceStatus(sessionId, updates.inferenceStatus);
  }
  if (updates.lastMessage !== undefined) {
    setLastMessage(sessionId, updates.lastMessage);
  }
}

export function clearAllSessionState(sessionId: string): void {
  clearInferenceStatus(sessionId);
  clearLastMessage(sessionId);
}
