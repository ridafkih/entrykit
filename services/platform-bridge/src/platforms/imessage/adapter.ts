import { IMessageSDK, type Message } from "@photon-ai/imessage-kit";
import type { PlatformAdapter, MessageHandler } from "../types";
import type { OutgoingPlatformMessage } from "../../types/messages";
import { config } from "../../config/environment";

export class IMessageAdapter implements PlatformAdapter {
  readonly platform = "imessage" as const;
  private sdk: IMessageSDK | null = null;
  private handler: MessageHandler | null = null;
  private watchedContacts: Set<string>;

  constructor() {
    this.watchedContacts = new Set(config.imessageWatchedContacts);
  }

  async initialize(): Promise<void> {
    if (!config.imessageEnabled) {
      console.log("[iMessage] Adapter disabled via config");
      return;
    }

    this.sdk = new IMessageSDK();
    console.log("[iMessage] Adapter initialized");
  }

  async startListening(handler: MessageHandler): Promise<void> {
    if (!this.sdk) {
      console.warn("[iMessage] Cannot start listening - adapter not initialized");
      return;
    }

    this.handler = handler;

    await this.sdk.startWatching({
      onMessage: async (message: Message) => {
        if (message.isFromMe) return;

        if (!this.shouldMonitor(message.chatId)) {
          return;
        }

        if (!this.handler) return;
        if (!message.text) return;

        await this.handler({
          platform: "imessage",
          chatId: message.chatId,
          userId: message.sender,
          content: message.text,
          timestamp: message.date,
          metadata: {
            isGroupChat: message.isGroupChat,
            senderName: message.senderName,
            service: message.service,
          },
        });
      },
      onError: (error: Error) => {
        console.error("[iMessage] Watch error:", error);
      },
    });

    console.log("[iMessage] Started listening for messages");
    if (this.watchedContacts.size > 0) {
      console.log("[iMessage] Filtering to contacts:", Array.from(this.watchedContacts));
    }
  }

  async stopListening(): Promise<void> {
    if (this.sdk) {
      this.sdk.stopWatching();
      console.log("[iMessage] Stopped listening");
    }
    this.handler = null;
  }

  async sendMessage(message: OutgoingPlatformMessage): Promise<void> {
    if (!this.sdk) {
      throw new Error("iMessage adapter not initialized");
    }

    await this.sdk.send(message.chatId, message.content);

    console.log(`[iMessage] Sent message to ${message.chatId}`);
  }

  shouldMonitor(chatId: string): boolean {
    if (this.watchedContacts.size === 0) {
      return true;
    }

    return this.watchedContacts.has(chatId);
  }
}

export const imessageAdapter = new IMessageAdapter();
