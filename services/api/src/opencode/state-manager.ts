import {
  setInferenceStatus,
  clearInferenceStatus,
  INFERENCE_STATUS,
} from "../state/inference-status-store";
import { setLastMessage, clearLastMessage } from "../state/last-message-store";

export function updateInferenceGenerating(sessionId: string): void {
  setInferenceStatus(sessionId, INFERENCE_STATUS.GENERATING);
}

export function updateInferenceIdle(sessionId: string): void {
  setInferenceStatus(sessionId, INFERENCE_STATUS.IDLE);
}

export function updateLastMessage(sessionId: string, message: string): void {
  setLastMessage(sessionId, message);
}

export function clearSessionState(sessionId: string): void {
  clearInferenceStatus(sessionId);
  clearLastMessage(sessionId);
}
