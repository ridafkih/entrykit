import { getAgentEvents } from "../repositories/agent-event.repository";
import { MESSAGE_ROLE, type MessageRole } from "../types/message";

export interface ReconstructedMessage {
  role: MessageRole;
  content: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface ExtractionState {
  messages: ReconstructedMessage[];
  activeAssistantText: string;
}

function flushAssistantText(state: ExtractionState): void {
  const content = state.activeAssistantText.trim();
  if (!content) {
    state.activeAssistantText = "";
    return;
  }

  state.messages.push({
    role: MESSAGE_ROLE.ASSISTANT,
    content,
  });
  state.activeAssistantText = "";
}

function pushUserMessage(state: ExtractionState, text: string): void {
  const content = text.trim();
  if (!content) {
    return;
  }
  state.messages.push({
    role: MESSAGE_ROLE.USER,
    content,
  });
}

function isStopReasonEvent(eventData: Record<string, unknown>): boolean {
  const result = isRecord(eventData.result) ? eventData.result : null;
  return Boolean(result && typeof result.stopReason === "string");
}

function processSessionUpdate(
  update: Record<string, unknown>,
  state: ExtractionState
): void {
  const sessionUpdate = update.sessionUpdate;
  if (sessionUpdate === "user_message") {
    const content = isRecord(update.content) ? update.content : null;
    const text =
      content && typeof content.text === "string" ? content.text : "";
    flushAssistantText(state);
    pushUserMessage(state, text);
    return;
  }

  if (sessionUpdate === "agent_message_chunk") {
    const content = isRecord(update.content) ? update.content : null;
    const text =
      content && typeof content.text === "string" ? content.text : "";
    if (text) {
      state.activeAssistantText += text;
    }
    return;
  }

  if (
    sessionUpdate === "tool_call" ||
    sessionUpdate === "tool_call_update" ||
    sessionUpdate === "item_completed"
  ) {
    return;
  }
}

function extractMessagesFromStoredEvents(
  events: { sequence: number; eventData: unknown }[]
): ReconstructedMessage[] {
  const state: ExtractionState = {
    messages: [],
    activeAssistantText: "",
  };

  for (const event of events) {
    if (!isRecord(event.eventData)) {
      continue;
    }

    if (isStopReasonEvent(event.eventData)) {
      flushAssistantText(state);
      continue;
    }

    const method = event.eventData.method;
    if (method !== "session/update") {
      continue;
    }

    const params = isRecord(event.eventData.params)
      ? event.eventData.params
      : null;
    const update = params && isRecord(params.update) ? params.update : null;
    if (!update) {
      continue;
    }

    processSessionUpdate(update, state);
  }

  flushAssistantText(state);
  return state.messages;
}

export async function fetchSessionMessages(
  labSessionId: string
): Promise<ReconstructedMessage[]> {
  const storedEvents = await getAgentEvents(labSessionId);
  return extractMessagesFromStoredEvents(storedEvents);
}
