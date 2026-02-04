import { z } from "zod";
import type { RouteHandler } from "../../utils/handlers/route-handler";
import {
  chatOrchestrate,
  chatOrchestrateStream,
  type ChatOrchestratorResult,
} from "../../utils/orchestration/chat-orchestrator";
import {
  saveOrchestratorMessage,
  getOrchestratorMessages,
} from "../../utils/repositories/orchestrator-message.repository";
import { getPlatformConfig } from "../../config/platforms";
import { buildSseResponse } from "../../shared/http";

const chatRequestSchema = z.object({
  content: z.string().min(1),
  platformOrigin: z.string(),
  platformChatId: z.string(),
  modelId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

const POST: RouteHandler = async (request, _params, context) => {
  const rawBody = await request.json().catch(() => null);
  const parseResult = chatRequestSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return Response.json(
      {
        error:
          "Invalid request body. Required: { content: string, platformOrigin: string, platformChatId: string, modelId?: string }",
      },
      { status: 400 },
    );
  }

  const body = parseResult.data;
  const content = body.content.trim();

  try {
    await saveOrchestratorMessage({
      platform: body.platformOrigin,
      platformChatId: body.platformChatId,
      role: "user",
      content,
    });

    const history = await getOrchestratorMessages({
      platform: body.platformOrigin,
      platformChatId: body.platformChatId,
      limit: 20,
    });

    const conversationHistory = history.map((msg) => `${msg.role}: ${msg.content}`);

    const platformConfig = getPlatformConfig(body.platformOrigin);

    if (platformConfig.breakDoubleNewlines) {
      // Return SSE stream for platforms that support chunked delivery
      const stream = createSseStream(
        chatOrchestrateStream({
          content,
          conversationHistory,
          platformOrigin: body.platformOrigin,
          platformChatId: body.platformChatId,
          browserService: context.browserService,
          daemonController: context.daemonController,
          modelId: body.modelId,
          timestamp: body.timestamp,
        }),
        async (result) => {
          await saveOrchestratorMessage({
            platform: body.platformOrigin,
            platformChatId: body.platformChatId,
            role: "assistant",
            content: result.message,
            sessionId: result.sessionId,
          });
        },
      );

      return buildSseResponse(stream);
    }

    // Standard non-streaming response
    const result = await chatOrchestrate({
      content,
      conversationHistory,
      platformOrigin: body.platformOrigin,
      platformChatId: body.platformChatId,
      browserService: context.browserService,
      daemonController: context.daemonController,
      modelId: body.modelId,
      timestamp: body.timestamp,
    });

    await saveOrchestratorMessage({
      platform: body.platformOrigin,
      platformChatId: body.platformChatId,
      role: "assistant",
      content: result.message,
      sessionId: result.sessionId,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("[ChatOrchestrate] Error:", error);
    const message = error instanceof Error ? error.message : "Chat orchestration failed";
    return Response.json({ error: message }, { status: 500 });
  }
};

function createSseStream(
  generator: AsyncGenerator<{ type: "chunk"; text: string }, ChatOrchestratorResult, unknown>,
  onComplete: (result: ChatOrchestratorResult) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let result = await generator.next();

        while (!result.done) {
          const chunk = result.value;
          const event = `event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`;
          controller.enqueue(encoder.encode(event));
          result = await generator.next();
        }

        // result.value contains the final ChatOrchestratorResult
        const finalResult = result.value;

        // Save the message
        await onComplete(finalResult);

        // Send the done event with full result
        const doneEvent = `event: done\ndata: ${JSON.stringify(finalResult)}\n\n`;
        controller.enqueue(encoder.encode(doneEvent));

        controller.close();
      } catch (error) {
        console.error("[ChatOrchestrate SSE] Stream error:", error);
        const errorMessage = error instanceof Error ? error.message : "Stream failed";
        const errorEvent = `event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    },
  });
}

export { POST };
