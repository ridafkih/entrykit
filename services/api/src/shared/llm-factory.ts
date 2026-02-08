import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { ConfigurationError } from "./errors";

interface LlmModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

export function readModelConfig(envPrefix: string): LlmModelConfig {
  const provider = process.env[`${envPrefix}_PROVIDER`];
  const model = process.env[`${envPrefix}_NAME`];
  const apiKey = process.env[`${envPrefix}_API_KEY`];

  if (!provider || !model || !apiKey) {
    throw new ConfigurationError(
      `Missing model config. Set ${envPrefix}_PROVIDER, ${envPrefix}_NAME, and ${envPrefix}_API_KEY`,
    );
  }

  return { provider, model, apiKey };
}

export function createLanguageModel(config: LlmModelConfig): LanguageModel {
  switch (config.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.model);
    }
    default:
      throw new ConfigurationError(`Unsupported LLM provider: ${config.provider}`);
  }
}
