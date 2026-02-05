import { getChangeType } from "../types/file";
import type { Publisher } from "../types/dependencies";
import type { SessionDiffEvent } from "./event-parser";
import type { InferenceStatus } from "../state/session-state-store";

export function publishSessionDiff(
  publisher: Publisher,
  sessionId: string,
  event: SessionDiffEvent,
): void {
  for (const diff of event.properties.diff) {
    publisher.publishDelta(
      "sessionChangedFiles",
      { uuid: sessionId },
      {
        type: "add",
        file: {
          path: diff.file,
          originalContent: diff.before,
          currentContent: diff.after,
          status: "pending" as const,
          changeType: getChangeType(diff.before, diff.after),
        },
      },
    );
  }
}

export function publishInferenceStatus(
  publisher: Publisher,
  sessionId: string,
  inferenceStatus: InferenceStatus,
  lastMessage?: string,
): void {
  const delta: Record<string, string> = { inferenceStatus };
  if (lastMessage) {
    delta.lastMessage = lastMessage;
  }
  publisher.publishDelta("sessionMetadata", { uuid: sessionId }, delta);
}

export function publishSessionCompletion(publisher: Publisher, sessionId: string): void {
  publisher.publishEvent(
    "sessionComplete",
    { uuid: sessionId },
    { sessionId, completedAt: Date.now() },
  );
}
