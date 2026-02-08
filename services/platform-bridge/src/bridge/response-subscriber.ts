import { logger } from "../logging";
import { multiplayerClient } from "../clients/multiplayer";
import { completionListener } from "./completion-listener";
import { getAdapter } from "../platforms";
import type { PlatformType, SessionMessage, MessagingMode } from "../types/messages";

interface SubscriptionInfo {
  platform: PlatformType;
  chatId: string;
  threadId?: string;
  messagingMode: MessagingMode;
  unsubscribe: () => void;
}

export class ResponseSubscriber {
  private subscriptions = new Map<string, SubscriptionInfo>();

  subscribeToSession(
    sessionId: string,
    platform: PlatformType,
    chatId: string,
    threadId: string | undefined,
    messagingMode: MessagingMode = "passive",
  ): void {
    if (this.subscriptions.has(sessionId)) {
      const existing = this.subscriptions.get(sessionId)!;
      if (existing.platform === platform && existing.chatId === chatId) {
        return;
      }
      existing.unsubscribe();
    }

    const unsubscribe = multiplayerClient.subscribeToSession(sessionId, (message) => {
      this.handleSessionMessage(sessionId, message);
    });

    this.subscriptions.set(sessionId, { platform, chatId, threadId, messagingMode, unsubscribe });

    if (messagingMode === "passive") {
      completionListener.subscribeToSession(sessionId);
    }

    logger.info({
      event_name: "response_subscriber.subscribed",
      session_id: sessionId,
      platform,
      chat_id: chatId,
      messaging_mode: messagingMode,
      thread_id: threadId ?? "none",
    });
  }

  unsubscribeFromSession(sessionId: string): void {
    const subscription = this.subscriptions.get(sessionId);
    if (subscription) {
      subscription.unsubscribe();
      if (subscription.messagingMode === "passive") {
        completionListener.unsubscribeFromSession(sessionId);
      }
      this.subscriptions.delete(sessionId);
      logger.info({
        event_name: "response_subscriber.unsubscribed",
        session_id: sessionId,
      });
    }
  }

  private async handleSessionMessage(sessionId: string, message: SessionMessage): Promise<void> {
    if (message.role !== "assistant") return;

    const subscription = this.subscriptions.get(sessionId);
    if (!subscription) return;

    if (subscription.messagingMode === "passive") {
      logger.info({
        event_name: "response_subscriber.skipping_passive",
        session_id: sessionId,
      });
      return;
    }

    const adapter = getAdapter(subscription.platform);
    if (!adapter) {
      logger.warn({
        event_name: "response_subscriber.no_adapter",
        platform: subscription.platform,
      });
      return;
    }

    try {
      await adapter.sendMessage({
        platform: subscription.platform,
        chatId: subscription.chatId,
        content: message.content,
        threadId: subscription.threadId,
      });
      logger.info({
        event_name: "response_subscriber.response_sent",
        platform: subscription.platform,
        chat_id: subscription.chatId,
      });
    } catch (error) {
      logger.error({
        event_name: "response_subscriber.send_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  getActiveSubscriptions(): Map<string, { platform: PlatformType; chatId: string }> {
    const result = new Map<string, { platform: PlatformType; chatId: string }>();
    for (const [sessionId, info] of this.subscriptions) {
      result.set(sessionId, { platform: info.platform, chatId: info.chatId });
    }
    return result;
  }

  getThreadId(sessionId: string): string | undefined {
    return this.subscriptions.get(sessionId)?.threadId;
  }

  unsubscribeAll(): void {
    for (const [sessionId, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    logger.info({ event_name: "response_subscriber.unsubscribed_all" });
  }
}

export const responseSubscriber = new ResponseSubscriber();
