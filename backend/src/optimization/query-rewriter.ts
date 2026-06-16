import { LLMProvider, LLMMessage } from '../llm/types.js';
import { buildOptimizationPrompt } from '../llm/prompts/optimization.js';
import { ExplainAnalysis } from '../safety/types.js';

export class QueryRewriter {
  private llm: LLMProvider;

  constructor(llm: LLMProvider) {
    this.llm = llm;
  }

  async suggest(sql: string, explainAnalysis: ExplainAnalysis | undefined, schemaContext: string): Promise<string> {
    if (!explainAnalysis) return '';

    const explainStr = JSON.stringify(explainAnalysis.rows, null, 2);
    const prompt = buildOptimizationPrompt(sql, explainStr, schemaContext);

    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Analyze this query and suggest optimizations.' },
    ];

    const response = await this.llm.complete(messages, {
      temperature: 0.2,
      maxTokens: 1024,
    });

    return response.content;
  }
}
