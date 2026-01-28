/**
 * A prompt fragment is a composable piece of a system prompt.
 * Fragments can conditionally render based on context.
 *
 * @typeParam TContext - The context type used for rendering
 */
export interface PromptFragment<TContext = unknown> {
  /** Unique identifier for the fragment */
  readonly id: string;
  /** Human-readable name for debugging/logging */
  readonly name: string;
  /** Lower values appear first in the composed prompt (default: 0) */
  readonly priority?: number;
  /** Render the fragment content. Return null to skip. */
  render(context: TContext): string | null;
  /** Optional predicate to conditionally include the fragment */
  shouldInclude?(context: TContext): boolean;
}

/**
 * A prompt service composes multiple fragments into a single prompt.
 *
 * @typeParam TContext - The context type used for rendering
 */
export interface PromptService<TContext = unknown> {
  /** Compose all applicable fragments into a single prompt */
  compose(context: TContext): PromptCompositionResult;
}

/**
 * Result of composing a prompt from fragments.
 */
export interface PromptCompositionResult {
  /** The composed prompt text */
  text: string;
  /** IDs of fragments that were included */
  includedFragments: string[];
}

/**
 * Options for creating a prompt fragment.
 *
 * @typeParam TContext - The context type used for rendering
 */
export interface CreateFragmentOptions<TContext = unknown> {
  /** Unique identifier for the fragment */
  id: string;
  /** Human-readable name for debugging/logging */
  name: string;
  /** Lower values appear first in the composed prompt */
  priority: number;
  /** Render the fragment content. Return null to skip. */
  render: (context: TContext) => string | null;
  /** Optional predicate to conditionally include the fragment */
  shouldInclude?: (context: TContext) => boolean;
}
