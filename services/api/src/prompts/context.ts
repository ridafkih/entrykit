import type { PromptContext } from "../types/prompt";

export interface CreatePromptContextParams {
  sessionId: string;
  projectId: string;
  projectSystemPrompt: string | null;
}

export function createPromptContext(params: CreatePromptContextParams): PromptContext {
  return {
    sessionId: params.sessionId,
    projectId: params.projectId,
    projectSystemPrompt: params.projectSystemPrompt,
  };
}
