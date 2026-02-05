import { db } from "@lab/database/client";
import {
  orchestrationRequests,
  type OrchestrationStatus,
  type MessagingMode,
} from "@lab/database/schema/orchestration-requests";
import { eq } from "drizzle-orm";
import { findAllProjects } from "../repositories/project.repository";
import { resolveProject, type ProjectResolutionResult } from "./project-resolver";
import { spawnSession } from "./session-spawner";
import { initiateConversation } from "./conversation-initiator";
import { sendMessageToSession } from "./message-sender";
import { findSessionById } from "../repositories/session.repository";
import type { BrowserServiceManager } from "../managers/browser-service.manager";
import type { SessionLifecycleManager } from "../managers/session-lifecycle.manager";
import type { PoolManager } from "../services/pool-manager";
import type { OpencodeClient, Publisher } from "../types/dependencies";

export interface OrchestrationInput {
  content: string;
  channelId?: string;
  modelId?: string;
  platformOrigin?: string;
  platformChatId?: string;
  messagingMode?: MessagingMode;
  browserService: BrowserServiceManager;
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
  opencode: OpencodeClient;
  publisher: Publisher;
}

export interface OrchestrationResult {
  orchestrationId: string;
  sessionId: string;
  projectId: string;
  projectName: string;
}

interface OrchestrationContext {
  id: string;
  content: string;
  modelId?: string;
  browserService: BrowserServiceManager;
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
  opencode: OpencodeClient;
  publisher: Publisher;
}

async function createOrchestrationRecord(input: {
  content: string;
  channelId?: string;
  modelId?: string;
  platformOrigin?: string;
  platformChatId?: string;
  messagingMode?: MessagingMode;
}): Promise<string> {
  const [record] = await db
    .insert(orchestrationRequests)
    .values({
      content: input.content,
      channelId: input.channelId,
      modelId: input.modelId,
      platformOrigin: input.platformOrigin,
      platformChatId: input.platformChatId,
      messagingMode: input.messagingMode ?? "passive",
      status: "pending",
    })
    .returning({ id: orchestrationRequests.id });

  if (!record) throw new Error("Failed to create orchestration record");
  return record.id;
}

async function transitionTo(
  orchestrationId: string,
  status: OrchestrationStatus,
  publisher: Publisher,
  data?: {
    resolvedProjectId?: string;
    resolvedSessionId?: string;
    resolutionConfidence?: string;
    resolutionReasoning?: string;
    projectName?: string | null;
    sessionId?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  await db
    .update(orchestrationRequests)
    .set({
      status,
      resolvedProjectId: data?.resolvedProjectId,
      resolvedSessionId: data?.resolvedSessionId,
      resolutionConfidence: data?.resolutionConfidence,
      resolutionReasoning: data?.resolutionReasoning,
      errorMessage: data?.errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(orchestrationRequests.id, orchestrationId));

  publisher.publishDelta(
    "orchestrationStatus",
    { uuid: orchestrationId },
    {
      status,
      projectName: data?.projectName,
      sessionId: data?.sessionId,
      errorMessage: data?.errorMessage,
    },
  );
}

function initializeStatusChannel(orchestrationId: string, publisher: Publisher): void {
  publisher.publishSnapshot(
    "orchestrationStatus",
    { uuid: orchestrationId },
    {
      status: "pending",
      projectName: null,
      sessionId: null,
      errorMessage: null,
    },
  );
}

async function resolveTargetProject(ctx: OrchestrationContext): Promise<ProjectResolutionResult> {
  await transitionTo(ctx.id, "thinking", ctx.publisher);

  const projects = await findAllProjects();
  if (projects.length === 0) {
    throw new Error("No projects available");
  }

  const resolution = await resolveProject(ctx.content, projects);

  await transitionTo(ctx.id, "delegating", ctx.publisher, {
    resolvedProjectId: resolution.projectId,
    resolutionConfidence: resolution.confidence,
    resolutionReasoning: resolution.reasoning,
    projectName: resolution.projectName,
  });

  return resolution;
}

async function spawnSessionForProject(
  ctx: OrchestrationContext,
  resolution: ProjectResolutionResult,
): Promise<string> {
  await transitionTo(ctx.id, "starting", ctx.publisher, { projectName: resolution.projectName });

  const { session } = await spawnSession({
    projectId: resolution.projectId,
    taskSummary: ctx.content,
    browserService: ctx.browserService,
    sessionLifecycle: ctx.sessionLifecycle,
    poolManager: ctx.poolManager,
    publisher: ctx.publisher,
  });

  return session.id;
}

async function startConversation(ctx: OrchestrationContext, sessionId: string): Promise<void> {
  await initiateConversation({
    sessionId,
    task: ctx.content,
    modelId: ctx.modelId,
    opencode: ctx.opencode,
    publisher: ctx.publisher,
  });
}

async function markComplete(
  ctx: OrchestrationContext,
  sessionId: string,
  projectName: string,
): Promise<void> {
  await transitionTo(ctx.id, "complete", ctx.publisher, {
    resolvedSessionId: sessionId,
    projectName,
    sessionId,
  });
}

async function markFailed(
  orchestrationId: string,
  error: unknown,
  publisher: Publisher,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  await transitionTo(orchestrationId, "error", publisher, { errorMessage });
}

export async function orchestrate(input: OrchestrationInput): Promise<OrchestrationResult> {
  const { opencode, publisher } = input;

  // Check if this is a message to an existing session
  if (input.channelId) {
    const existingSession = await findSessionById(input.channelId);
    if (existingSession && existingSession.opencodeSessionId) {
      // Route to existing session
      await sendMessageToSession({
        sessionId: input.channelId,
        opencodeSessionId: existingSession.opencodeSessionId,
        content: input.content,
        modelId: input.modelId,
        opencode,
        publisher,
      });

      return {
        orchestrationId: "", // No new orchestration created for existing session messages
        sessionId: input.channelId,
        projectId: existingSession.projectId,
        projectName: existingSession.title ?? "Unknown",
      };
    }
  }

  // Create new orchestration for new sessions
  const orchestrationId = await createOrchestrationRecord({
    content: input.content,
    channelId: input.channelId,
    modelId: input.modelId,
    platformOrigin: input.platformOrigin,
    platformChatId: input.platformChatId,
    messagingMode: input.messagingMode,
  });

  initializeStatusChannel(orchestrationId, publisher);

  const ctx: OrchestrationContext = {
    id: orchestrationId,
    content: input.content,
    modelId: input.modelId,
    browserService: input.browserService,
    sessionLifecycle: input.sessionLifecycle,
    poolManager: input.poolManager,
    opencode,
    publisher,
  };

  try {
    const resolution = await resolveTargetProject(ctx);
    const sessionId = await spawnSessionForProject(ctx, resolution);
    await startConversation(ctx, sessionId);
    await markComplete(ctx, sessionId, resolution.projectName);

    return {
      orchestrationId,
      sessionId,
      projectId: resolution.projectId,
      projectName: resolution.projectName,
    };
  } catch (error) {
    await markFailed(orchestrationId, error, publisher);
    throw error;
  }
}
