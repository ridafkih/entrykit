import type { PromptFragment, PromptService } from "../../types/prompt";
import { PromptComposer } from "./composer";
import { projectPromptFragment } from "./fragments/project-prompt";

export class PromptBuilder {
  private readonly fragments: PromptFragment[] = [];
  private separator: string = "\n\n";

  private constructor(fragments: PromptFragment[] = []) {
    this.fragments = [...fragments];
  }

  static empty(): PromptBuilder {
    return new PromptBuilder();
  }

  static defaults(): PromptBuilder {
    return new PromptBuilder([projectPromptFragment]);
  }

  withFragment(fragment: PromptFragment): PromptBuilder {
    this.fragments.push(fragment);
    return this;
  }

  withProjectPrompt(): PromptBuilder {
    return this.withFragment(projectPromptFragment);
  }

  withSeparator(separator: string): PromptBuilder {
    this.separator = separator;
    return this;
  }

  build(): PromptService {
    return new PromptComposer({
      fragments: this.fragments,
      separator: this.separator,
    });
  }
}

export function createDefaultPromptService(): PromptService {
  return PromptBuilder.defaults().build();
}
