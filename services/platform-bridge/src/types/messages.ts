export type PlatformType = "imessage" | "slack" | "discord";

export interface IncomingPlatformMessage {
  platform: PlatformType;
  chatId: string;
  userId?: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface OutgoingPlatformMessage {
  platform: PlatformType;
  chatId: string;
  content: string;
}

export interface OrchestrationRequest {
  content: string;
  channelId?: string;
  modelId?: string;
}

export interface OrchestrationResult {
  sessionId: string;
  projectId: string;
  projectName: string;
}

export interface SessionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  senderId: string;
}
