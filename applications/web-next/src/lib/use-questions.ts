"use client";

import { useState, useCallback, useMemo } from "react";
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

interface UseQuestionsResult {
  isSubmitting: boolean;
  reply: (callId: string, answers: string[][]) => Promise<void>;
  reject: (callId: string) => Promise<void>;
}

function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL must be set");
  return apiUrl;
}

function createSessionClient(labSessionId: string) {
  return createOpencodeClient({
    baseUrl: `${getApiUrl()}/opencode`,
    headers: { "X-Lab-Session-Id": labSessionId },
  });
}

export function useQuestions(labSessionId: string): UseQuestionsResult {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const opencodeClient = useMemo(() => {
    if (!labSessionId) return null;
    return createSessionClient(labSessionId);
  }, [labSessionId]);

  const reply = useCallback(
    async (requestId: string, answers: string[][]) => {
      if (!opencodeClient) {
        throw new Error("Client not initialized");
      }

      console.log("[useQuestions] Sending reply:", { requestId, answers });
      setIsSubmitting(true);

      try {
        const response = await opencodeClient.question.reply({
          requestID: requestId,
          answers,
        });
        console.log("[useQuestions] Reply response:", response);
        if (response.error) {
          throw new Error(`Failed to reply to question: ${JSON.stringify(response.error)}`);
        }
        console.log("[useQuestions] Reply successful, waiting for events...");
      } catch (replyError) {
        console.error("[useQuestions] reply error:", replyError);
        throw replyError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [opencodeClient],
  );

  const reject = useCallback(
    async (requestId: string) => {
      if (!opencodeClient) {
        throw new Error("Client not initialized");
      }

      setIsSubmitting(true);

      try {
        const response = await opencodeClient.question.reject({
          requestID: requestId,
        });
        if (response.error) {
          throw new Error(`Failed to reject question: ${JSON.stringify(response.error)}`);
        }
      } catch (rejectError) {
        console.error("[useQuestions] reject error:", rejectError);
        throw rejectError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [opencodeClient],
  );

  return {
    isSubmitting,
    reply,
    reject,
  };
}
