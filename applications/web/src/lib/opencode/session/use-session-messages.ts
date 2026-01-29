"use client";

import { useState, useCallback } from "react";
import type { OpencodeClient } from "@opencode-ai/sdk/client";
import type { AgentMessage } from "../types";

interface OpenCodeMessagePart {
  type: string;
  text?: string;
}

interface OpenCodeMessage {
  info: {
    id: string;
    role: "user" | "assistant";
    time: { created: number };
  };
  parts: OpenCodeMessagePart[];
}

function transformOpenCodeMessage(openCodeMessage: OpenCodeMessage): AgentMessage {
  const textParts = openCodeMessage.parts.filter(
    (part): part is { type: "text"; text: string } =>
      part.type === "text" && typeof part.text === "string",
  );
  const content = textParts.map((part) => part.text).join("\n");

  return {
    id: openCodeMessage.info.id,
    role: openCodeMessage.info.role,
    content,
    timestamp: openCodeMessage.info.time.created,
  };
}

interface UseSessionMessagesResult {
  messages: AgentMessage[];
  addOptimisticMessage: (message: AgentMessage) => void;
  refreshMessages: (sessionId: string) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>;
}

export function useSessionMessages(opencodeClient: OpencodeClient): UseSessionMessagesResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  const refreshMessages = useCallback(
    async (sessionId: string) => {
      const messagesResponse = await opencodeClient.session.messages({
        path: { id: sessionId },
      });

      if (messagesResponse.data) {
        setMessages(messagesResponse.data.map(transformOpenCodeMessage));
      }
    },
    [opencodeClient],
  );

  const addOptimisticMessage = useCallback((message: AgentMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return {
    messages,
    addOptimisticMessage,
    refreshMessages,
    setMessages,
  };
}
