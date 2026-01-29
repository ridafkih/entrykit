"use client";

import { useState, useCallback, useEffect } from "react";
import type { Event } from "@opencode-ai/sdk/client";
import type { AgentState, AgentMessage } from "../types";
import { useOpenCodeEvents } from "../events/provider";
import {
  isMessagePartUpdatedEvent,
  isSessionErrorEvent,
  isSessionIdleEvent,
} from "../events/guards";
import { getSessionIdFromEvent, extractErrorMessage } from "../events/utils";
import { useSessionLifecycle } from "../session/use-session-lifecycle";
import { useSessionMessages } from "../session/use-session-messages";
import { useStreamingContent } from "../streaming/use-streaming-content";

interface UseAgentResult {
  state: AgentState;
  messages: AgentMessage[];
  streamingContent: string | null;
  isSending: boolean;
  error: Error | null;
  sendMessage: (content: string, model?: { providerId: string; modelId: string }) => Promise<void>;
  clearError: () => void;
}

export function useAgent(labSessionId: string): UseAgentResult {
  const { subscribe } = useOpenCodeEvents();
  const {
    opencodeSessionId,
    opencodeClient,
    isInitializing,
    error: lifecycleError,
  } = useSessionLifecycle(labSessionId);
  const { messages, addOptimisticMessage, refreshMessages } = useSessionMessages(opencodeClient);
  const { content: streamingContent, appendDelta, reset: resetStreaming } = useStreamingContent();

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const state: AgentState = isInitializing
    ? { status: "loading" }
    : lifecycleError || !opencodeSessionId
      ? { status: "inactive" }
      : { status: "active", isProcessing: isSending };

  useEffect(() => {
    if (lifecycleError) {
      setError(lifecycleError);
    }
  }, [lifecycleError]);

  useEffect(() => {
    if (opencodeSessionId && !isInitializing) {
      refreshMessages(opencodeSessionId);
    }
  }, [opencodeSessionId, isInitializing, refreshMessages]);

  useEffect(() => {
    const handleEvent = async (event: Event) => {
      const eventSessionId = getSessionIdFromEvent(event);

      if (eventSessionId !== opencodeSessionId) {
        return;
      }

      if (isSessionIdleEvent(event)) {
        if (opencodeSessionId) {
          await refreshMessages(opencodeSessionId);
        }
        resetStreaming();
        setIsSending(false);
        return;
      }

      if (isSessionErrorEvent(event)) {
        const errorMessage = extractErrorMessage(event.properties.error);
        setError(new Error(errorMessage));
        resetStreaming();
        setIsSending(false);
        return;
      }

      if (isMessagePartUpdatedEvent(event)) {
        const { part, delta } = event.properties;

        if ((part.type === "text" || part.type === "reasoning") && delta) {
          appendDelta(delta);
        }
      }
    };

    return subscribe(handleEvent);
  }, [subscribe, opencodeSessionId, refreshMessages, resetStreaming, appendDelta]);

  const sendMessage = useCallback(
    async (content: string, model?: { providerId: string; modelId: string }) => {
      if (!opencodeSessionId) {
        throw new Error("Session not initialized");
      }

      setError(null);
      setIsSending(true);
      resetStreaming();

      const userMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      addOptimisticMessage(userMessage);

      try {
        const promptResponse = await opencodeClient.session.promptAsync({
          path: { id: opencodeSessionId },
          body: {
            parts: [{ type: "text", text: content }],
            model: model ? { providerID: model.providerId, modelID: model.modelId } : undefined,
          },
        });

        if (promptResponse.error) {
          throw new Error(`OpenCode API error: ${JSON.stringify(promptResponse.error)}`);
        }
      } catch (sendError) {
        const errorInstance =
          sendError instanceof Error ? sendError : new Error("Failed to send message");
        setError(errorInstance);
        setIsSending(false);
        throw errorInstance;
      }
    },
    [opencodeSessionId, opencodeClient, addOptimisticMessage, resetStreaming],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    state,
    messages,
    streamingContent,
    isSending,
    error,
    sendMessage,
    clearError,
  };
}
