import { LLMProvider, LLMProviderConfig } from './types.js';
import { OpenAIProvider } from './openai-provider.js';
import { ClaudeProvider } from './claude-provider.js';

export type { LLMProvider, LLMMessage, LLMOptions, LLMResponse, LLMProviderConfig } from './types.js';

let providerInstance: LLMProvider | null = null;

export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.openai.apiKey, config.openai.model, config.openai.baseURL);
    case 'claude':
      return new ClaudeProvider(config.claude.apiKey, config.claude.model);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

export function getLLMProvider(config: LLMProviderConfig): LLMProvider {
  if (!providerInstance) {
    providerInstance = createLLMProvider(config);
  }
  return providerInstance;
}

export function resetProvider(): void {
  providerInstance = null;
}
