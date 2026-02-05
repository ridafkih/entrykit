import { z } from "zod";
import type { Handler, RouteContextFor } from "../../../types/route";
import { chatOrchestrate } from "../../../orchestration/chat-orchestrator";
import {
  saveOrchestratorMessage,
  getConversationHistory,
} from "../../../repositories/orchestrator-message.repository";
import { parseRequestBody } from "../../../shared/validation";
import { MESSAGE_ROLE } from "../../../types/message";

const completeRequestSchema = z.object({
  sessionId: z.string(),
  platformOrigin: z.string(),
  platformChatId: z.string(),
});

type OrchestrationContext = RouteContextFor<"browser" | "session" | "infra">;

const POST: Handler<OrchestrationContext> = async (request, _params, context) => {
  const { sessionId, platformOrigin, platformChatId } = await parseRequestBody(
    request,
    completeRequestSchema,
  );

  await saveOrchestratorMessage({
    platform: platformOrigin,
    platformChatId,
    role: MESSAGE_ROLE.ASSISTANT,
    content:
      "I just received a notification that the session has completed. Let me check what happened.",
    sessionId,
  });

  const conversationHistory = await getConversationHistory({
    platform: platformOrigin,
    platformChatId,
    limit: 20,
  });

  const result = await chatOrchestrate({
    content: `Session ${sessionId} has completed. Check what was accomplished and include a screenshot if appropriate.`,
    conversationHistory,
    platformOrigin,
    platformChatId,
    browserService: context.browserService,
    sessionLifecycle: context.sessionLifecycle,
    poolManager: context.poolManager,
    opencode: context.opencode,
    publisher: context.publisher,
    imageStore: context.imageStore,
  });

  await saveOrchestratorMessage({
    platform: platformOrigin,
    platformChatId,
    role: MESSAGE_ROLE.ASSISTANT,
    content: result.message,
    sessionId,
  });

  return Response.json(result, { status: 200 });
};

export { POST };
