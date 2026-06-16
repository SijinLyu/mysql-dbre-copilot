import { LLMProvider, LLMMessage } from '../llm/types.js';
import { buildSqlGenerationPrompt, SQL_GENERATION_USER_TEMPLATE } from '../llm/prompts/sql-generation.js';

export class SqlGenerator {
  private llm: LLMProvider;

  constructor(llm: LLMProvider) {
    this.llm = llm;
  }

  async generate(question: string, schemaContext: string, historyContext: string): Promise<string> {
    const systemPrompt = buildSqlGenerationPrompt(schemaContext, historyContext);
    const userPrompt = SQL_GENERATION_USER_TEMPLATE.replace('{question}', question);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.llm.complete(messages, {
      temperature: 0.1,
      maxTokens: 2048,
    });

    return this.extractSql(response.content);
  }

  private extractSql(content: string): string {
    // Try to extract SQL from code block
    const codeBlockMatch = content.match(/```sql\s*\n?([\s\S]*?)\n?```/i);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try generic code block
    const genericBlockMatch = content.match(/```\s*\n?([\s\S]*?)\n?```/);
    if (genericBlockMatch) {
      return genericBlockMatch[1].trim();
    }

    // If no code block, try to find SQL-like content
    const lines = content.trim().split('\n');
    const sqlLines = lines.filter(line => {
      const upper = line.trim().toUpperCase();
      return upper.startsWith('SELECT') ||
             upper.startsWith('WITH') ||
             upper.startsWith('FROM') ||
             upper.startsWith('WHERE') ||
             upper.startsWith('JOIN') ||
             upper.startsWith('GROUP') ||
             upper.startsWith('ORDER') ||
             upper.startsWith('LIMIT') ||
             upper.startsWith('HAVING') ||
             upper.startsWith('UNION') ||
             upper.startsWith('INSERT') ||
             upper.startsWith('UPDATE') ||
             upper.startsWith('DELETE');
    });

    if (sqlLines.length > 0) {
      return content.trim();
    }

    return content.trim();
  }
}
