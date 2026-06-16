import { createLLMProvider, resetProvider } from '../../../src/llm/index.js';

describe('LLM Provider Factory', () => {
  afterEach(() => {
    resetProvider();
  });

  it('creates OpenAI provider', () => {
    const provider = createLLMProvider({
      provider: 'openai',
      openai: { apiKey: 'test-key', model: 'gpt-4o' },
      claude: { apiKey: '', model: '' },
    });

    expect(provider.name).toBe('openai');
  });

  it('creates Claude provider', () => {
    const provider = createLLMProvider({
      provider: 'claude',
      openai: { apiKey: '', model: '' },
      claude: { apiKey: 'test-key', model: 'claude-sonnet-4-20250514' },
    });

    expect(provider.name).toBe('claude');
  });

  it('throws for unsupported provider', () => {
    expect(() => createLLMProvider({
      provider: 'unsupported' as any,
      openai: { apiKey: '', model: '' },
      claude: { apiKey: '', model: '' },
    })).toThrow('Unsupported LLM provider');
  });
});
