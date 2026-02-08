import { logger } from "../logging";
import { multiplayerClient } from "../clients/multiplayer";
import { apiClient } from "../clients/api";
import { getAdapter } from "../platforms";
import { responseSubscriber } from "./response-subscriber";

interface SessionCompleteEvent {
  sessionId: string;
  completedAt: number;
}

class CompletionListener {
  private processingSet = new Set<string>();
  private unsubscribers = new Map<string, () => void>();

  subscribeToSession(sessionId: string): void {
    if (this.unsubscribers.has(sessionId)) {
      return;
    }

    const unsubscribe = multiplayerClient.subscribeToSessionComplete(sessionId, (event) => {
      this.handleSessionComplete(event);
    });

    this.unsubscribers.set(sessionId, unsubscribe);
    logger.info({
      event_name: "completion_listener.subscribed",
      session_id: sessionId,
    });
  }

  unsubscribeFromSession(sessionId: string): void {
    const unsubscribe = this.unsubscribers.get(sessionId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(sessionId);
      logger.info({
        event_name: "completion_listener.unsubscribed",
        session_id: sessionId,
      });
    }
  }

  private async handleSessionComplete(event: SessionCompleteEvent): Promise<void> {
    const { sessionId } = event;

    if (this.processingSet.has(sessionId)) {
      logger.info({
        event_name: "completion_listener.already_processing",
        session_id: sessionId,
      });
      return;
    }

    this.processingSet.add(sessionId);

    try {
      logger.info({
        event_name: "completion_listener.processing",
        session_id: sessionId,
      });

      const subscriptions = responseSubscriber.getActiveSubscriptions();
      const subscription = subscriptions.get(sessionId);

      if (!subscription) {
        logger.info({
          event_name: "completion_listener.no_subscription",
          session_id: sessionId,
        });
        return;
      }

      const { platform, chatId } = subscription;

      const result = await apiClient.notifySessionComplete({
        sessionId,
        platformOrigin: platform,
        platformChatId: chatId,
      });

      const adapter = getAdapter(platform);
      if (!adapter) {
        logger.warn({
          event_name: "completion_listener.no_adapter",
          platform,
        });
        return;
      }

      const threadId = responseSubscriber.getThreadId(sessionId);

      const messagesToSend = [result.message];

      for (let i = 0; i < messagesToSend.length; i++) {
        const content = messagesToSend[i]!;
        // Only include attachments on the last message
        const isLastMessage = i === messagesToSend.length - 1;

        await adapter.sendMessage({
          platform,
          chatId,
          content,
          threadId,
          attachments: isLastMessage ? result.attachments : undefined,
        });
      }

      logger.info({
        event_name: "completion_listener.messages_sent",
        platform,
        chat_id: chatId,
        message_count: messagesToSend.length,
        attachment_count: result.attachments?.length ?? 0,
      });
    } catch (error) {
      logger.error({
        event_name: "completion_listener.processing_error",
        session_id: sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.processingSet.delete(sessionId);
    }
  }
}

export const completionListener = new CompletionListener();
