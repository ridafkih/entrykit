export interface PromptContext {
  sessionId: string;
  projectId: string;
  projectSystemPrompt: string | null;
}

export interface PromptFragment {
  readonly id: string;
  readonly name: string;
  readonly priority?: number;
  render(context: PromptContext): string | null;
  shouldInclude?(context: PromptContext): boolean;
}

export interface PromptService {
  compose(context: PromptContext): { text: string; includedFragments: string[] };
}
