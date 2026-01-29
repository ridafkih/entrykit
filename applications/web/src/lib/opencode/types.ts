export type AgentState =
  | { status: "loading" }
  | { status: "inactive" }
  | { status: "active"; isProcessing: boolean };

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";
