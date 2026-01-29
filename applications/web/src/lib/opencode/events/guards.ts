import type { Event, EventMessagePartUpdated, EventSessionError } from "@opencode-ai/sdk/client";

export function isMessagePartUpdatedEvent(event: Event): event is EventMessagePartUpdated {
  return event.type === "message.part.updated";
}

export function isSessionErrorEvent(event: Event): event is EventSessionError {
  return event.type === "session.error";
}

export function isSessionIdleEvent(event: Event): event is Event & { type: "session.idle" } {
  return event.type === "session.idle";
}
