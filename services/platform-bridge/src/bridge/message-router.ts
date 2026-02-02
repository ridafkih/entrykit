import { apiClient } from "../clients/api";
import { sessionTracker } from "./session-tracker";
import { responseSubscriber } from "./response-subscriber";
import type { IncomingPlatformMessage } from "../types/messages";
import { config } from "../config/environment";

export class MessageRouter {
  async handleIncomingMessage(message: IncomingPlatformMessage): Promise<void> {
    const { platform, chatId, userId, content } = message;

    console.log(`[MessageRouter] Received message from ${platform}:${chatId}`);

    const mapping = await sessionTracker.getMapping(platform, chatId);

    if (mapping) {
      const isActive = await apiClient.isSessionActive(mapping.sessionId);

      if (isActive) {
        console.log(`[MessageRouter] Routing to existing session ${mapping.sessionId}`);
        await this.routeToExistingSession(mapping.sessionId, content);
        await sessionTracker.touchMapping(platform, chatId);
        return;
      } else {
        console.log(`[MessageRouter] Session ${mapping.sessionId} is not active, creating new`);
      }
    }

    console.log(`[MessageRouter] Creating new session via orchestration`);
    await this.routeToOrchestrator(platform, chatId, userId, content);
  }

  private async routeToExistingSession(sessionId: string, content: string): Promise<void> {
    await apiClient.sendMessageToSession(sessionId, content);
  }

  private async routeToOrchestrator(
    platform: string,
    chatId: string,
    userId: string | undefined,
    content: string,
  ): Promise<void> {
    const result = await apiClient.orchestrate({
      content,
      modelId: config.imessageDefaultModelId,
    });

    await sessionTracker.setMapping(
      platform as IncomingPlatformMessage["platform"],
      chatId,
      result.sessionId,
      userId,
    );

    responseSubscriber.subscribeToSession(
      result.sessionId,
      platform as IncomingPlatformMessage["platform"],
      chatId,
    );

    console.log(
      `[MessageRouter] Created session ${result.sessionId} for project ${result.projectName}`,
    );
  }
}

export const messageRouter = new MessageRouter();
