import { z } from "zod";
import type { Handler, BrowserContext, SessionContext, InfraContext } from "../../../types/route";
import { chatOrchestrate } from "../../../orchestration/chat-orchestrator";
import {
  saveOrchestratorMessage,
  getOrchestratorMessages,
} from "../../../repositories/orchestrator-message.repository";
import { parseRequestBody } from "../../../shared/validation";
import { MESSAGE_ROLE } from "../../../types/message";

const completeRequestSchema = z.object({
  sessionId: z.string(),
  platformOrigin: z.string(),
  platformChatId: z.string(),
});

const POST: Handler<BrowserContext & SessionContext & InfraContext> = async (
  request,
  _params,
  context,
) => {
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

  const history = await getOrchestratorMessages({
    platform: platformOrigin,
    platformChatId,
    limit: 20,
  });

  const conversationHistory = history.map((msg) => `${msg.role}: ${msg.content}`);

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
