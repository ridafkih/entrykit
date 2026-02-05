import { generateText, streamText, stepCountIs } from "ai";
import { breakDoubleNewlines } from "../../shared/streaming";
import { extractSessionInfoFromSteps } from "../tool-result-handler";
import { prepareOrchestration, buildOrchestratorResult } from "./pipeline";
import type { ChatOrchestratorInput, ChatOrchestratorResult, ChatOrchestratorChunk } from "./types";

export async function chatOrchestrate(
  input: ChatOrchestratorInput,
): Promise<ChatOrchestratorResult> {
  const { model, tools, systemPrompt, platformConfig } = await prepareOrchestration(input);

  console.log(
    `[ChatOrchestrate] platform=${input.platformOrigin}, breakDoubleNewlines=${platformConfig.breakDoubleNewlines}`,
  );

  let text: string;
  let messages: string[] | undefined;
  let sessionInfo: ReturnType<typeof extractSessionInfoFromSteps>;

  if (platformConfig.breakDoubleNewlines) {
    // Stream and break on double newlines for platforms like iMessage
    const result = streamText({
      model,
      tools,
      prompt: input.content,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
    });

    const collectedMessages: string[] = [];
    for await (const chunk of breakDoubleNewlines(result.textStream)) {
      console.log(
        `[ChatOrchestrate] chunk ${collectedMessages.length}: "${chunk.slice(0, 50)}..."`,
      );
      collectedMessages.push(chunk);
    }
    console.log(`[ChatOrchestrate] total chunks: ${collectedMessages.length}`);

    // Wait for completion to get steps for session info extraction
    const finalResult = await result;
    text = collectedMessages.join("\n\n");
    messages = collectedMessages.length > 1 ? collectedMessages : undefined;
    sessionInfo = extractSessionInfoFromSteps(await finalResult.steps);
  } else {
    // Standard non-streaming generation
    const result = await generateText({
      model,
      tools,
      prompt: input.content,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
    });

    text = result.text;
    sessionInfo = extractSessionInfoFromSteps(result.steps);
  }

  return buildOrchestratorResult(text, messages, sessionInfo);
}

/**
 * Streaming version of chatOrchestrate that yields chunks as they're detected.
 * Used for real-time delivery to platforms like iMessage.
 */
export async function* chatOrchestrateStream(
  input: ChatOrchestratorInput,
): AsyncGenerator<ChatOrchestratorChunk, ChatOrchestratorResult, unknown> {
  const { model, tools, systemPrompt } = await prepareOrchestration(input);

  console.log(`[ChatOrchestrateStream] platform=${input.platformOrigin}, starting stream`);

  const result = streamText({
    model,
    tools,
    prompt: input.content,
    system: systemPrompt,
    stopWhen: stepCountIs(5),
  });

  const collectedChunks: string[] = [];
  let buffer = "";
  let chunkIndex = 0;
  const delimiter = "\n\n";

  // Helper to flush buffer and yield chunk
  const flushBuffer = function* () {
    // Check for any complete chunks with delimiter
    let delimiterIndex: number;
    while ((delimiterIndex = buffer.indexOf(delimiter)) !== -1) {
      const textBeforeDelimiter = buffer.slice(0, delimiterIndex).trim();
      if (textBeforeDelimiter.length > 0) {
        console.log(
          `[ChatOrchestrateStream] chunk ${chunkIndex}: "${textBeforeDelimiter.slice(0, 50)}..."`,
        );
        collectedChunks.push(textBeforeDelimiter);
        chunkIndex++;
        yield { type: "chunk" as const, text: textBeforeDelimiter };
      }
      buffer = buffer.slice(delimiterIndex + delimiter.length);
    }
  };

  // Helper to force flush remaining buffer (on tool call or end)
  const forceFlushBuffer = function* () {
    const remaining = buffer.trim();
    if (remaining.length > 0) {
      console.log(`[ChatOrchestrateStream] chunk ${chunkIndex}: "${remaining.slice(0, 50)}..."`);
      collectedChunks.push(remaining);
      chunkIndex++;
      yield { type: "chunk" as const, text: remaining };
    }
    buffer = "";
  };

  // Use fullStream to detect both text and tool calls
  for await (const event of result.fullStream) {
    if (event.type === "text-delta") {
      buffer += event.text;
      // Yield any complete chunks (split on delimiter)
      yield* flushBuffer();
    } else if (event.type === "tool-call") {
      // Flush any pending text before tool execution
      yield* forceFlushBuffer();
      console.log(`[ChatOrchestrateStream] tool call: ${event.toolName}`);
    }
  }

  // Flush any remaining text after stream ends
  yield* forceFlushBuffer();

  console.log(`[ChatOrchestrateStream] total chunks: ${collectedChunks.length}`);

  // Wait for completion to get steps for session info extraction
  const finalResult = await result;
  const text = collectedChunks.join("\n\n");
  const messages = collectedChunks.length > 1 ? collectedChunks : undefined;
  const sessionInfo = extractSessionInfoFromSteps(await finalResult.steps);

  return buildOrchestratorResult(text, messages, sessionInfo);
}
