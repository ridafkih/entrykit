"use client";

import type { ReactNode } from "react";
import type { MessageState } from "@/lib/opencode/state/types";
import { MessageBlock } from "../message-block";
import { ReasoningBlock } from "./reasoning-block";
import { ToolStatusBlock } from "./tool-status-block";
import { ThinkingIndicator, StepFinishBoundary } from "./step-boundary";
import {
  isTextPart,
  isReasoningPart,
  isToolPart,
  isStepStartPart,
  isStepFinishPart,
} from "@/lib/opencode/events/guards";

interface MessagePartsRendererProps {
  messageState: MessageState;
}

export function MessagePartsRenderer({ messageState }: MessagePartsRendererProps) {
  const { info, parts, partOrder, isStreaming, streamingPartId } = messageState;
  const isAssistant = info.role === "assistant";

  const elements: ReactNode[] = [];
  let accumulatedText = "";
  let accumulatedTextIsStreaming = false;

  const flushText = () => {
    if (accumulatedText) {
      elements.push(
        <MessageBlock
          key={`text-${elements.length}`}
          variant={isAssistant ? "assistant" : "user"}
          isStreaming={accumulatedTextIsStreaming}
        >
          {accumulatedText}
        </MessageBlock>,
      );
      accumulatedText = "";
      accumulatedTextIsStreaming = false;
    }
  };

  for (let i = 0; i < partOrder.length; i++) {
    const partId = partOrder[i];
    const partState = parts.get(partId);
    if (!partState) continue;

    const { part, delta } = partState;
    const isCurrentlyStreaming = isStreaming && streamingPartId === partId;
    const isLastPart = i === partOrder.length - 1;

    if (isTextPart(part)) {
      const text = delta || part.text;
      accumulatedText += text;
      if (isCurrentlyStreaming) {
        accumulatedTextIsStreaming = true;
      }
      continue;
    }

    flushText();

    if (isReasoningPart(part)) {
      const content = delta || part.text;
      elements.push(
        <ReasoningBlock key={partId} content={content} isStreaming={isCurrentlyStreaming} />,
      );
      continue;
    }

    if (isToolPart(part)) {
      elements.push(<ToolStatusBlock key={partId} part={part} />);
      continue;
    }

    if (isStepStartPart(part)) {
      if (isLastPart) {
        elements.push(<ThinkingIndicator key={partId} part={part} />);
      }
      continue;
    }

    if (isStepFinishPart(part)) {
      elements.push(<StepFinishBoundary key={partId} part={part} />);
      continue;
    }
  }

  flushText();

  if (elements.length === 0 && !isAssistant) {
    return null;
  }

  return <>{elements}</>;
}
