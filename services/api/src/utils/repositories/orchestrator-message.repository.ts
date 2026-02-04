import { db } from "@lab/database/client";
import {
  orchestratorMessages,
  type OrchestratorMessage,
  type OrchestratorMessageRole,
} from "@lab/database/schema/orchestrator-messages";
import { and, eq, desc } from "drizzle-orm";

export async function saveOrchestratorMessage(params: {
  platform: string;
  platformChatId: string;
  role: OrchestratorMessageRole;
  content: string;
  sessionId?: string;
}): Promise<OrchestratorMessage> {
  const [message] = await db
    .insert(orchestratorMessages)
    .values({
      platform: params.platform,
      platformChatId: params.platformChatId,
      role: params.role,
      content: params.content,
      sessionId: params.sessionId,
    })
    .returning();

  if (!message) {
    throw new Error("Failed to save orchestrator message");
  }

  return message;
}

export async function getOrchestratorMessages(params: {
  platform: string;
  platformChatId: string;
  limit?: number;
}): Promise<OrchestratorMessage[]> {
  const messages = await db
    .select()
    .from(orchestratorMessages)
    .where(
      and(
        eq(orchestratorMessages.platform, params.platform),
        eq(orchestratorMessages.platformChatId, params.platformChatId),
      ),
    )
    .orderBy(desc(orchestratorMessages.createdAt))
    .limit(params.limit ?? 20);

  return messages.reverse();
}
