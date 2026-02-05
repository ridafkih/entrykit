import { generateText, streamText, stepCountIs, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  listProjectsTool,
  listSessionsTool,
  getSessionStatusTool,
  getContainersTool,
  createCreateSessionTool,
  createSendMessageToSessionTool,
  createGetSessionScreenshotTool,
  createRunBrowserTaskTool,
  createGetSessionMessagesTool,
  createSearchSessionsTool,
} from "./tools";
import { buildChatOrchestratorPrompt } from "./system-prompts/chat-orchestrator";
import { getPlatformConfig } from "../config/platforms";
import { breakDoubleNewlines } from "../shared/streaming";
import {
  extractSessionInfoFromSteps,
  type MessageAttachment,
  type SessionInfo,
} from "./tool-result-handler";
import type { BrowserServiceManager } from "../managers/browser-service.manager";
import type { SessionLifecycleManager } from "../managers/session-lifecycle.manager";
import type { PoolManager } from "../services/pool-manager";
import type { ImageStore } from "@lab/context";
import type { ImageAnalyzerContext } from "@lab/subagents/vision";
import type { OpencodeClient, Publisher } from "../types/dependencies";

export type { MessageAttachment } from "./tool-result-handler";

export interface ChatOrchestratorInput {
  content: string;
  conversationHistory?: string[];
  platformOrigin?: string;
  platformChatId?: string;
  browserService: BrowserServiceManager;
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
  modelId?: string;
  timestamp?: string;
  opencode: OpencodeClient;
  publisher: Publisher;
  imageStore?: ImageStore;
}

export const CHAT_ORCHESTRATOR_ACTION = {
  RESPONSE: "response",
  CREATED_SESSION: "created_session",
  FORWARDED_MESSAGE: "forwarded_message",
} as const;

export type ChatOrchestratorAction =
  (typeof CHAT_ORCHESTRATOR_ACTION)[keyof typeof CHAT_ORCHESTRATOR_ACTION];

export interface ChatOrchestratorResult {
  action: ChatOrchestratorAction;
  message: string;
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

function createModel(modelConfig: ChatModelConfig): LanguageModel {
  switch (modelConfig.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: modelConfig.apiKey });
      return anthropic(modelConfig.model);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey: modelConfig.apiKey });
      return openai(modelConfig.model);
    }
    default:
      throw new Error(`Unsupported chat orchestrator provider: ${modelConfig.provider}`);
  }
}

// Lazily created ImageAnalyzerContext singleton (promise-based to prevent race conditions)
let visionContextPromise: Promise<ImageAnalyzerContext | undefined> | null = null;

function getVisionContext(): Promise<ImageAnalyzerContext | undefined> {
  if (visionContextPromise) return visionContextPromise;
  visionContextPromise = (async () => {
    try {
      const { createVisionContextFromEnv } = await import("@lab/subagents/vision");
      const ctx = createVisionContextFromEnv();
      if (ctx) {
        console.log("[ChatOrchestrator] VisionContext initialized for image analysis");
      } else {
        console.log("[ChatOrchestrator] No vision API key configured, analyzeImage tool disabled");
      }
      return ctx;
    } catch (error) {
      console.warn("[ChatOrchestrator] Failed to initialize VisionContext:", error);
      return undefined;
    }
  })();
  return visionContextPromise;
}

interface BuildOrchestratorToolsConfig {
  browserService: BrowserServiceManager;
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
  modelId?: string;
  createModel: () => LanguageModel;
  imageStore?: ImageStore;
  visionContext?: ImageAnalyzerContext;
  opencode: OpencodeClient;
  publisher: Publisher;
}

async function buildOrchestratorTools(toolsConfig: BuildOrchestratorToolsConfig) {
  const createSessionTool = createCreateSessionTool({
    browserService: toolsConfig.browserService,
    sessionLifecycle: toolsConfig.sessionLifecycle,
    poolManager: toolsConfig.poolManager,
    modelId: toolsConfig.modelId,
    opencode: toolsConfig.opencode,
    publisher: toolsConfig.publisher,
  });

  const sendMessageToSessionTool = createSendMessageToSessionTool({
    modelId: toolsConfig.modelId,
    opencode: toolsConfig.opencode,
    publisher: toolsConfig.publisher,
  });

  const getSessionScreenshotTool = createGetSessionScreenshotTool({
    daemonController: toolsConfig.browserService.daemonController,
    imageStore: toolsConfig.imageStore,
  });

  const runBrowserTaskTool = createRunBrowserTaskTool({
    daemonController: toolsConfig.browserService.daemonController,
    createModel: toolsConfig.createModel,
    imageStore: toolsConfig.imageStore,
  });

  const getSessionMessagesTool = createGetSessionMessagesTool(toolsConfig.opencode);
  const searchSessionsTool = createSearchSessionsTool(toolsConfig.opencode);

  const baseTools = {
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

  if (toolsConfig.visionContext) {
    const { createAnalyzeImageTool } = await import("@lab/subagents/vision");
    return {
      ...baseTools,
      analyzeImage: createAnalyzeImageTool(toolsConfig.visionContext),
    };
  }

  return baseTools;
}

interface PreparedOrchestration {
  model: LanguageModel;
  tools: Awaited<ReturnType<typeof buildOrchestratorTools>>;
  systemPrompt: string;
  platformConfig: ReturnType<typeof getPlatformConfig>;
  createModelFn: () => LanguageModel;
}

async function prepareOrchestration(input: ChatOrchestratorInput): Promise<PreparedOrchestration> {
  const modelConfig = getChatModelConfig();
  const model = createModel(modelConfig);
  const vision = await getVisionContext();

  const tools = await buildOrchestratorTools({
    browserService: input.browserService,
    sessionLifecycle: input.sessionLifecycle,
    poolManager: input.poolManager,
    modelId: input.modelId,
    createModel: () => createModel(modelConfig),
    opencode: input.opencode,
    publisher: input.publisher,
    imageStore: input.imageStore,
    visionContext: vision,
  });

  const systemPrompt = buildChatOrchestratorPrompt({
    conversationHistory: input.conversationHistory,
    platformOrigin: input.platformOrigin,
    timestamp: input.timestamp,
  });

  const platformConfig = getPlatformConfig(input.platformOrigin ?? "");

  return {
    model,
    tools,
    systemPrompt,
    platformConfig,
    createModelFn: () => createModel(modelConfig),
  };
}

function buildOrchestratorResult(
  text: string,
  messages: string[] | undefined,
  sessionInfo: SessionInfo,
): ChatOrchestratorResult {
  const { sessionId, projectName, wasForwarded, attachments } = sessionInfo;

  if (sessionId && wasForwarded) {
    return {
      action: CHAT_ORCHESTRATOR_ACTION.FORWARDED_MESSAGE,
      message: text || "Message sent to the session.",
      messages,
      sessionId,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  if (sessionId) {
    return {
      action: CHAT_ORCHESTRATOR_ACTION.CREATED_SESSION,
      message: text || `Started working on your task in ${projectName ?? "the project"}.`,
      messages,
      sessionId,
      projectName,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  return {
    action: CHAT_ORCHESTRATOR_ACTION.RESPONSE,
    message: text,
    messages,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

export async function chatOrchestrate(
  input: ChatOrchestratorInput,
): Promise<ChatOrchestratorResult> {
  const { model, tools, systemPrompt, platformConfig } = await prepareOrchestration(input);

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
