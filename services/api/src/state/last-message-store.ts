import { createStore } from "./create-store";
import type { Publisher } from "../types/dependencies";

const store = createStore<string>({ shouldSet: Boolean });

export function getLastMessage(sessionId: string): string | undefined {
  return store.get(sessionId);
}

export function setLastMessage(sessionId: string, message: string): void {
  store.set(sessionId, message);
}

export function clearLastMessage(sessionId: string): void {
  store.clear(sessionId);
}

export function setAndPublishLastMessage(
  sessionId: string,
  message: string,
  publisher: Publisher,
): void {
  setLastMessage(sessionId, message);
  publisher.publishDelta("sessionMetadata", { uuid: sessionId }, { lastMessage: message });
}
