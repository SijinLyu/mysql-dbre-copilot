import { LLMProvider, LLMMessage } from '../llm/types.js';
import { buildResultSummaryPrompt, buildChartRecommendationPrompt } from '../llm/prompts/result-summary.js';

export interface ChartRecommendation {
  chartType: 'bar' | 'line' | 'pie' | 'table';
  xField: string;
  yField: string;
  reason: string;
}

export class ResultSummarizer {
  private llm: LLMProvider;

  constructor(llm: LLMProvider) {
    this.llm = llm;
  }

  async summarize(question: string, sql: string, results: any[]): Promise<{
    summary: string;
    followUpSuggestions: string[];
  }> {
    const resultsStr = results.length > 20
      ? JSON.stringify(results.slice(0, 20), null, 2) + `\n... (${results.length} rows total)`
      : JSON.stringify(results, null, 2);

    const prompt = buildResultSummaryPrompt(question, sql, resultsStr);

    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Please summarize the results and suggest 2-3 follow-up questions.' },
    ];

    const response = await this.llm.complete(messages, {
      temperature: 0.3,
      maxTokens: 1024,
    });

    return this.parseResponse(response.content);
  }

  async recommendChart(sql: string, results: any[]): Promise<ChartRecommendation> {
    if (results.length === 0) {
      return { chartType: 'table', xField: '', yField: '', reason: 'No data to visualize' };
    }

    const sample = JSON.stringify(results.slice(0, 5), null, 2);
    const prompt = buildChartRecommendationPrompt(sql, sample);

    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Recommend the best chart type for this data.' },
    ];

    const response = await this.llm.complete(messages, {
      temperature: 0.1,
      maxTokens: 256,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ChartRecommendation;
      }
    } catch {
      // fallback
    }

    return { chartType: 'table', xField: '', yField: '', reason: 'Could not determine chart type' };
  }

  private parseResponse(content: string): { summary: string; followUpSuggestions: string[] } {
    const lines = content.split('\n');
    const suggestions: string[] = [];
    const summaryLines: string[] = [];
    let inSuggestions = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('follow-up') ||
          trimmed.toLowerCase().includes('follow up') ||
          trimmed.toLowerCase().includes('you might') ||
          trimmed.toLowerCase().includes('you could ask')) {
        inSuggestions = true;
        continue;
      }

      if (inSuggestions) {
        const cleaned = trimmed.replace(/^[-*\d.)\]]+\s*/, '');
        if (cleaned.length > 5) {
          suggestions.push(cleaned);
        }
      } else if (trimmed.length > 0) {
        summaryLines.push(trimmed);
      }
    }

    return {
      summary: summaryLines.join('\n'),
      followUpSuggestions: suggestions.slice(0, 3),
    };
  }
}
