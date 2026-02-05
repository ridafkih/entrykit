import { createStore } from "./create-store";

export const INFERENCE_STATUS = {
  IDLE: "idle",
  GENERATING: "generating",
} as const;

export type InferenceStatus = (typeof INFERENCE_STATUS)[keyof typeof INFERENCE_STATUS];

const store = createStore<InferenceStatus>({ defaultValue: INFERENCE_STATUS.IDLE });

export function getInferenceStatus(sessionId: string): InferenceStatus {
  return store.get(sessionId) as InferenceStatus;
}

export function setInferenceStatus(sessionId: string, status: InferenceStatus): void {
  store.set(sessionId, status);
}

export function clearInferenceStatus(sessionId: string): void {
  store.clear(sessionId);
}
