import { generateText, streamText, stepCountIs, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  listProjectsTool,
  listSessionsTool,
  getSessionMessagesTool,
  getSessionStatusTool,
  searchSessionsTool,
  getContainersTool,
  createCreateSessionTool,
  createSendMessageToSessionTool,
  createGetSessionScreenshotTool,
  createRunBrowserTaskTool,
} from "./tools";
import { buildChatOrchestratorPrompt } from "./prompts/chat-orchestrator";
import { getPlatformConfig } from "../../config/platforms";
import { breakDoubleNewlines } from "../streaming";
import type { BrowserService } from "../browser/browser-service";
import type { DaemonController } from "@lab/browser-protocol";

export interface ChatOrchestratorInput {
  content: string;
  conversationHistory?: string[];
  platformOrigin?: string;
  platformChatId?: string;
  browserService: BrowserService;
  daemonController: DaemonController;
  modelId?: string;
  timestamp?: string;
}

export type ChatOrchestratorAction = "response" | "created_session" | "forwarded_message";

export interface MessageAttachment {
  type: "image";
  data: string;
  encoding: "base64";
  format: string;
}

export interface ChatOrchestratorResult {
  action: ChatOrchestratorAction;
  /** The full message text */
  message: string;
  /** When breakDoubleNewlines is enabled, contains the message split into paragraphs */
  messages?: string[];
  sessionId?: string;
  projectName?: string;
  attachments?: MessageAttachment[];
}

export interface ChatOrchestratorChunk {
  type: "chunk";
  text: string;
}

interface ChatModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

function getChatModelConfig(): ChatModelConfig {
  const provider = process.env.CHAT_ORCHESTRATOR_MODEL_PROVIDER;
  const model = process.env.CHAT_ORCHESTRATOR_MODEL_NAME;
  const apiKey = process.env.CHAT_ORCHESTRATOR_MODEL_API_KEY;

  if (!provider || !model || !apiKey) {
    throw new Error(
      "Missing chat orchestrator model config. Set CHAT_ORCHESTRATOR_MODEL_PROVIDER, CHAT_ORCHESTRATOR_MODEL_NAME, and CHAT_ORCHESTRATOR_MODEL_API_KEY",
    );
  }

  return { provider, model, apiKey };
}

function createModel(config: ChatModelConfig): LanguageModel {
  switch (config.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.model);
    }
    default:
      throw new Error(`Unsupported chat orchestrator provider: ${config.provider}`);
  }
}

interface SessionInfo {
  sessionId?: string;
  projectName?: string;
  wasForwarded?: boolean;
  attachments: MessageAttachment[];
}

function isSessionCreationOutput(
  value: unknown,
): value is { sessionId: string; projectName: string } {
  if (typeof value !== "object" || value === null) return false;
  return (
    "sessionId" in value &&
    typeof value.sessionId === "string" &&
    "projectName" in value &&
    typeof value.projectName === "string"
  );
}

function isMessageForwardedOutput(
  value: unknown,
): value is { success: boolean; sessionId: string } {
  if (typeof value !== "object" || value === null) return false;
  return (
    "success" in value &&
    value.success === true &&
    "sessionId" in value &&
    typeof value.sessionId === "string"
  );
}

interface ScreenshotData {
  data: string;
  encoding: "base64";
  format: string;
}

function isScreenshotOutput(
  value: unknown,
): value is { hasScreenshot: true; screenshot: ScreenshotData } {
  if (typeof value !== "object" || value === null) return false;
  if (!("hasScreenshot" in value) || value.hasScreenshot !== true) return false;
  if (!("screenshot" in value)) return false;

  const screenshot = value.screenshot;
  if (typeof screenshot !== "object" || screenshot === null) return false;
  return (
    "data" in screenshot &&
    typeof screenshot.data === "string" &&
    "encoding" in screenshot &&
    screenshot.encoding === "base64" &&
    "format" in screenshot &&
    typeof screenshot.format === "string"
  );
}

interface BrowserTaskOutput {
  success: boolean;
  hasScreenshot: true;
  screenshot: ScreenshotData;
}

function isBrowserTaskOutput(value: unknown): value is BrowserTaskOutput {
  if (typeof value !== "object" || value === null) return false;
  if (!("success" in value)) return false;
  if (!("hasScreenshot" in value) || value.hasScreenshot !== true) return false;
  if (!("screenshot" in value)) return false;

  const screenshot = value.screenshot;
  if (typeof screenshot !== "object" || screenshot === null) return false;
  return (
    "data" in screenshot &&
    typeof screenshot.data === "string" &&
    "encoding" in screenshot &&
    screenshot.encoding === "base64" &&
    "format" in screenshot &&
    typeof screenshot.format === "string"
  );
}

function extractSessionInfoFromSteps<T extends { toolResults?: Array<{ output: unknown }> }>(
  steps: T[],
): SessionInfo {
  const attachments: MessageAttachment[] = [];
  let sessionId: string | undefined;
  let projectName: string | undefined;
  let wasForwarded: boolean | undefined;

  for (const step of steps) {
    if (!step.toolResults) continue;

    for (const toolResult of step.toolResults) {
      if (isSessionCreationOutput(toolResult.output)) {
        sessionId = toolResult.output.sessionId;
        projectName = toolResult.output.projectName;
        wasForwarded = false;
      }

      if (isMessageForwardedOutput(toolResult.output)) {
        sessionId = toolResult.output.sessionId;
        wasForwarded = true;
      }

      if (isScreenshotOutput(toolResult.output)) {
        attachments.push({
          type: "image",
          data: toolResult.output.screenshot.data,
          encoding: toolResult.output.screenshot.encoding,
          format: toolResult.output.screenshot.format,
        });
      }

      if (isBrowserTaskOutput(toolResult.output)) {
        attachments.push({
          type: "image",
          data: toolResult.output.screenshot.data,
          encoding: toolResult.output.screenshot.encoding,
          format: toolResult.output.screenshot.format,
        });
      }
    }
  }

  return { sessionId, projectName, wasForwarded, attachments };
}

export async function chatOrchestrate(
  input: ChatOrchestratorInput,
): Promise<ChatOrchestratorResult> {
  const config = getChatModelConfig();
  const model = createModel(config);

  const createSessionTool = createCreateSessionTool({
    browserService: input.browserService,
    modelId: input.modelId,
  });

  const sendMessageToSessionTool = createSendMessageToSessionTool({
    modelId: input.modelId,
  });

  const getSessionScreenshotTool = createGetSessionScreenshotTool({
    daemonController: input.daemonController,
  });

  const runBrowserTaskTool = createRunBrowserTaskTool({
    daemonController: input.daemonController,
    createModel: () => createModel(config),
  });

  const tools = {
    listProjects: listProjectsTool,
    listSessions: listSessionsTool,
    getSessionMessages: getSessionMessagesTool,
    getSessionStatus: getSessionStatusTool,
    searchSessions: searchSessionsTool,
    getContainers: getContainersTool,
    createSession: createSessionTool,
    sendMessageToSession: sendMessageToSessionTool,
    getSessionScreenshot: getSessionScreenshotTool,
    runBrowserTask: runBrowserTaskTool,
  };

  const systemPrompt = buildChatOrchestratorPrompt({
    conversationHistory: input.conversationHistory,
    platformOrigin: input.platformOrigin,
    timestamp: input.timestamp,
  });

  const platformConfig = getPlatformConfig(input.platformOrigin ?? "");

  console.log(
    `[ChatOrchestrate] platform=${input.platformOrigin}, breakDoubleNewlines=${platformConfig.breakDoubleNewlines}`,
  );

  let text: string;
  let messages: string[] | undefined;
  let sessionInfo: SessionInfo;

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

  const { sessionId, projectName, wasForwarded, attachments } = sessionInfo;

  if (sessionId && wasForwarded) {
    return {
      action: "forwarded_message",
      message: text || "Message sent to the session.",
      messages,
      sessionId,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  if (sessionId) {
    return {
      action: "created_session",
      message: text || `Started working on your task in ${projectName ?? "the project"}.`,
      messages,
      sessionId,
      projectName,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  return {
    action: "response",
    message: text,
    messages,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

/**
 * Streaming version of chatOrchestrate that yields chunks as they're detected.
 * Used for real-time delivery to platforms like iMessage.
 */
export async function* chatOrchestrateStream(
  input: ChatOrchestratorInput,
): AsyncGenerator<ChatOrchestratorChunk, ChatOrchestratorResult, unknown> {
  const config = getChatModelConfig();
  const model = createModel(config);

  const createSessionTool = createCreateSessionTool({
    browserService: input.browserService,
    modelId: input.modelId,
  });

  const sendMessageToSessionTool = createSendMessageToSessionTool({
    modelId: input.modelId,
  });

  const getSessionScreenshotTool = createGetSessionScreenshotTool({
    daemonController: input.daemonController,
  });

  const runBrowserTaskTool = createRunBrowserTaskTool({
    daemonController: input.daemonController,
    createModel: () => createModel(config),
  });

  const tools = {
    listProjects: listProjectsTool,
    listSessions: listSessionsTool,
    getSessionMessages: getSessionMessagesTool,
    getSessionStatus: getSessionStatusTool,
    searchSessions: searchSessionsTool,
    getContainers: getContainersTool,
    createSession: createSessionTool,
    sendMessageToSession: sendMessageToSessionTool,
    getSessionScreenshot: getSessionScreenshotTool,
    runBrowserTask: runBrowserTaskTool,
  };

  const systemPrompt = buildChatOrchestratorPrompt({
    conversationHistory: input.conversationHistory,
    platformOrigin: input.platformOrigin,
    timestamp: input.timestamp,
  });

  console.log(`[ChatOrchestrateStream] platform=${input.platformOrigin}, starting stream`);

  const result = streamText({
    model,
    tools,
    prompt: input.content,
    system: systemPrompt,
    stopWhen: stepCountIs(5),
  });

  const collectedChunks: string[] = [];
  let chunkIndex = 0;

  for await (const chunk of breakDoubleNewlines(result.textStream)) {
    console.log(`[ChatOrchestrateStream] chunk ${chunkIndex}: "${chunk.slice(0, 50)}..."`);
    collectedChunks.push(chunk);
    chunkIndex++;
    yield { type: "chunk", text: chunk };
  }

  console.log(`[ChatOrchestrateStream] total chunks: ${collectedChunks.length}`);

  // Wait for completion to get steps for session info extraction
  const finalResult = await result;
  const text = collectedChunks.join("\n\n");
  const sessionInfo = extractSessionInfoFromSteps(await finalResult.steps);

  const { sessionId, projectName, wasForwarded, attachments } = sessionInfo;

  if (sessionId && wasForwarded) {
    return {
      action: "forwarded_message",
      message: text || "Message sent to the session.",
      messages: collectedChunks.length > 1 ? collectedChunks : undefined,
      sessionId,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  if (sessionId) {
    return {
      action: "created_session",
      message: text || `Started working on your task in ${projectName ?? "the project"}.`,
      messages: collectedChunks.length > 1 ? collectedChunks : undefined,
      sessionId,
      projectName,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  return {
    action: "response",
    message: text,
    messages: collectedChunks.length > 1 ? collectedChunks : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}
