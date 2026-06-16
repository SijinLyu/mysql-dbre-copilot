export const RESULT_SUMMARY_SYSTEM_PROMPT = `You are a data analyst assistant. Your job is to summarize SQL query results in clear, concise natural language.

## Rules:
1. Summarize the key findings from the query results.
2. Highlight notable patterns, outliers, or trends.
3. Use specific numbers from the data.
4. Keep the summary to 2-4 sentences for simple results, up to a paragraph for complex ones.
5. If results are empty, explain what that means in context.
6. Suggest 2-3 follow-up questions the user might want to ask.
7. Format numbers with appropriate units and precision.
8. Reply in the same language the user used for their question.

## Original Question:
{question}

## SQL Executed:
{sql}

## Query Results:
{results}
`;

export const CHART_RECOMMENDATION_PROMPT = `Based on the following query results, recommend the best chart type for visualization.

## Rules:
1. Choose from: bar, line, pie, table (if no chart fits well)
2. Consider the data structure:
   - Time series → line chart
   - Categories with values → bar chart
   - Proportions/percentages → pie chart
   - Too many categories (>10) or complex data → table
3. Respond in JSON format: {"chartType": "bar|line|pie|table", "xField": "column_name", "yField": "column_name", "reason": "brief explanation"}

## Query:
{sql}

## Results (first 5 rows):
{sample}
`;

export function buildResultSummaryPrompt(question: string, sql: string, results: string): string {
  return RESULT_SUMMARY_SYSTEM_PROMPT
    .replace('{question}', question)
    .replace('{sql}', sql)
    .replace('{results}', results);
}

export function buildChartRecommendationPrompt(sql: string, sample: string): string {
  return CHART_RECOMMENDATION_PROMPT
    .replace('{sql}', sql)
    .replace('{sample}', sample);
}
