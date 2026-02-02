import { multiplayerClient } from "../clients/multiplayer";
import { getAdapter } from "../platforms";
import type { PlatformType, SessionMessage } from "../types/messages";

interface SubscriptionInfo {
  platform: PlatformType;
  chatId: string;
  unsubscribe: () => void;
}

export class ResponseSubscriber {
  private subscriptions = new Map<string, SubscriptionInfo>();

  subscribeToSession(sessionId: string, platform: PlatformType, chatId: string): void {
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

    this.subscriptions.set(sessionId, { platform, chatId, unsubscribe });
    console.log(
      `[ResponseSubscriber] Subscribed to session ${sessionId} for ${platform}:${chatId}`,
    );
  }

  unsubscribeFromSession(sessionId: string): void {
    const subscription = this.subscriptions.get(sessionId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(sessionId);
      console.log(`[ResponseSubscriber] Unsubscribed from session ${sessionId}`);
    }
  }

  private async handleSessionMessage(sessionId: string, message: SessionMessage): Promise<void> {
    if (message.role !== "assistant") return;

    const subscription = this.subscriptions.get(sessionId);
    if (!subscription) return;

    const adapter = getAdapter(subscription.platform);
    if (!adapter) {
      console.warn(`[ResponseSubscriber] No adapter for platform ${subscription.platform}`);
      return;
    }

    try {
      await adapter.sendMessage({
        platform: subscription.platform,
        chatId: subscription.chatId,
        content: message.content,
      });
      console.log(
        `[ResponseSubscriber] Sent response to ${subscription.platform}:${subscription.chatId}`,
      );
    } catch (error) {
      console.error(`[ResponseSubscriber] Failed to send response:`, error);
    }
  }

  getActiveSubscriptions(): Map<string, { platform: PlatformType; chatId: string }> {
    const result = new Map<string, { platform: PlatformType; chatId: string }>();
    for (const [sessionId, info] of this.subscriptions) {
      result.set(sessionId, { platform: info.platform, chatId: info.chatId });
    }
    return result;
  }

  unsubscribeAll(): void {
    for (const [sessionId, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    console.log("[ResponseSubscriber] Unsubscribed from all sessions");
  }
}

export const responseSubscriber = new ResponseSubscriber();
