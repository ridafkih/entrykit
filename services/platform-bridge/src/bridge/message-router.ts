import { apiClient } from "../clients/api";
import { sessionTracker } from "./session-tracker";
import { responseSubscriber } from "./response-subscriber";
import type { IncomingPlatformMessage, MessagingMode, PlatformType } from "../types/messages";
import { getAdapter } from "../platforms";

export class MessageRouter {
  async handleIncomingMessage(message: IncomingPlatformMessage): Promise<void> {
    const { platform, chatId, userId, messageId, content, timestamp } = message;

    console.log(`[MessageRouter] Received message from ${platform}:${chatId}`);

    await this.routeToChatOrchestrator(platform, chatId, userId, messageId, content, timestamp);
  }

  private async routeToChatOrchestrator(
    platform: PlatformType,
    chatId: string,
    userId: string | undefined,
    messageId: string | undefined,
    content: string,
    timestamp: Date,
  ): Promise<void> {
    const adapter = getAdapter(platform);
    const messagingMode: MessagingMode = adapter?.messagingMode ?? "passive";

    // Use streaming to send chunks immediately as they arrive
    const result = await apiClient.chatStream(
      {
        content,
        platformOrigin: platform,
        platformChatId: chatId,
        timestamp: timestamp.toISOString(),
      },
      async (chunkText) => {
        // Send each chunk to the platform immediately
        if (adapter) {
          console.log(
            `[MessageRouter] Sending chunk to ${platform}:${chatId}: "${chunkText.slice(0, 50)}..."`,
          );
          await adapter.sendMessage({
            platform,
            chatId,
            content: chunkText,
          });
        }
      },
    );

    if (result.action === "created_session" && result.sessionId) {
      await sessionTracker.setMapping(platform, chatId, result.sessionId, userId, messageId);

      responseSubscriber.subscribeToSession(
        result.sessionId,
        platform,
        chatId,
        messageId,
        messagingMode,
      );

      console.log(
        `[MessageRouter] Created session ${result.sessionId} for project ${result.projectName ?? "unknown"} (mode: ${messagingMode})`,
      );
    }

    if (result.action === "forwarded_message" && result.sessionId) {
      await sessionTracker.touchMapping(platform, chatId);
      console.log(`[MessageRouter] Forwarded message to session ${result.sessionId}`);
    }

    // Handle attachments from the final result (send separately after all chunks)
    if (adapter && result.attachments?.length) {
      console.log(
        `[MessageRouter] Sending ${result.attachments.length} attachment(s) to ${platform}:${chatId}`,
      );
      await adapter.sendMessage({
        platform,
        chatId,
        content: "",
        attachments: result.attachments,
      });
    }
  }
}

export const messageRouter = new MessageRouter();
