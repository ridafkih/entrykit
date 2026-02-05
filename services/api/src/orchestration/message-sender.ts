import { findSessionById } from "../repositories/session.repository";
import { resolveWorkspacePathBySession } from "../shared/path-resolver";
import { setLastMessage } from "../state/last-message-store";
import type { OpencodeClient, Publisher } from "../types/dependencies";

export interface SendMessageOptions {
  sessionId: string;
  opencodeSessionId: string;
  content: string;
  modelId?: string;
  opencode: OpencodeClient;
  publisher: Publisher;
}

export async function sendMessageToSession(options: SendMessageOptions): Promise<void> {
  const { sessionId, opencodeSessionId, content, modelId, opencode, publisher } = options;

  const workspacePath = await resolveWorkspacePathBySession(sessionId);
  const [providerID, modelID] = modelId?.split("/") ?? [];

  const promptResponse = await opencode.session.promptAsync({
    sessionID: opencodeSessionId,
    directory: workspacePath,
    model: providerID && modelID ? { providerID, modelID } : undefined,
    parts: [{ type: "text", text: content }],
  });

  if (promptResponse.error) {
    throw new Error(`Failed to send message to session: ${JSON.stringify(promptResponse.error)}`);
  }

  setLastMessage(sessionId, content);
  publisher.publishDelta("sessionMetadata", { uuid: sessionId }, { lastMessage: content });
}
