import { logger } from "../logging";
import { apiClient } from "../clients/api";
import { sessionTracker } from "./session-tracker";
import { responseSubscriber } from "./response-subscriber";
import type { IncomingPlatformMessage, MessagingMode, PlatformType } from "../types/messages";
import { getAdapter } from "../platforms";

export class MessageRouter {
  async handleIncomingMessage(message: IncomingPlatformMessage): Promise<void> {
    const { platform, chatId, userId, messageId, content, timestamp } = message;

    logger.info({
      event_name: "message_router.message_received",
      platform,
      chat_id: chatId,
    });

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
          logger.info({
            event_name: "message_router.sending_chunk",
            platform,
            chat_id: chatId,
            chunk_preview: chunkText.slice(0, 50),
          });
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

      logger.info({
        event_name: "message_router.session_created",
        session_id: result.sessionId,
        project_name: result.projectName ?? "unknown",
        messaging_mode: messagingMode,
      });
    }

    if (result.action === "forwarded_message" && result.sessionId) {
      await sessionTracker.touchMapping(platform, chatId);
      logger.info({
        event_name: "message_router.message_forwarded",
        session_id: result.sessionId,
      });
    }

    // Handle attachments from the final result (send separately after all chunks)
    if (adapter && result.attachments?.length) {
      logger.info({
        event_name: "message_router.sending_attachments",
        platform,
        chat_id: chatId,
        count: result.attachments.length,
      });
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
