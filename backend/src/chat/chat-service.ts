import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'mysql2/promise';
import { LLMProvider } from '../llm/types.js';
import { SchemaIntrospector, SchemaCache } from '../schema/index.js';
import { ConversationManager, ConversationEntry } from './conversation-manager.js';
import { SqlGenerator } from './sql-generator.js';
import { ResultSummarizer, ChartRecommendation } from './result-summarizer.js';
import { logger } from '../utils/logger.js';

export interface ChatRequest {
  sessionId: string;
  connectionId: string;
  message: string;
  database: string;
}

export interface ChatResponse {
  id: string;
  sessionId: string;
  message: string;
  sql?: string;
  results?: any[];
  resultCount?: number;
  executionTimeMs?: number;
  chartRecommendation?: ChartRecommendation;
  followUpSuggestions: string[];
  safetyReport?: any;
  timestamp: Date;
}

export class ChatService {
  private conversationManager: ConversationManager;
  private sqlGenerator: SqlGenerator;
  private resultSummarizer: ResultSummarizer;
  private schemaIntrospector: SchemaIntrospector;
  private schemaCache: SchemaCache;
  private pool: Pool;

  constructor(
    llm: LLMProvider,
    pool: Pool,
    schemaCache?: SchemaCache
  ) {
    this.conversationManager = new ConversationManager();
    this.sqlGenerator = new SqlGenerator(llm);
    this.resultSummarizer = new ResultSummarizer(llm);
    this.schemaIntrospector = new SchemaIntrospector(pool);
    this.schemaCache = schemaCache || new SchemaCache();
    this.pool = pool;
  }

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { sessionId, message, database } = request;
    const startTime = Date.now();

    // Record user message
    this.conversationManager.addMessage(sessionId, {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    try {
      // Get schema context (cached)
      let schema = this.schemaCache.get(request.connectionId, database);
      if (!schema) {
        schema = await this.schemaIntrospector.introspect(database);
        this.schemaCache.set(request.connectionId, database, schema);
      }
      const schemaContext = this.schemaIntrospector.formatForLLM(schema);

      // Get conversation history for context
      const historyContext = this.conversationManager.formatHistoryForPrompt(sessionId);

      // Generate SQL
      const sql = await this.sqlGenerator.generate(message, schemaContext, historyContext);
      logger.info('SQL generated', { sessionId, sql });

      // Execute query
      const [rows] = await this.pool.query(sql);
      const results = rows as any[];
      const executionTimeMs = Date.now() - startTime;

      // Summarize results
      const { summary, followUpSuggestions } = await this.resultSummarizer.summarize(
        message, sql, results
      );

      // Recommend chart
      let chartRecommendation: ChartRecommendation | undefined;
      if (Array.isArray(results) && results.length > 0) {
        chartRecommendation = await this.resultSummarizer.recommendChart(sql, results);
      }

      // Record assistant response
      const responseEntry: ConversationEntry = {
        id: uuidv4(),
        role: 'assistant',
        content: summary,
        timestamp: new Date(),
        metadata: { sql, executionTimeMs },
      };
      this.conversationManager.addMessage(sessionId, responseEntry);

      return {
        id: responseEntry.id,
        sessionId,
        message: summary,
        sql,
        results: results.slice(0, 100),
        resultCount: results.length,
        executionTimeMs,
        chartRecommendation,
        followUpSuggestions,
        timestamp: new Date(),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Chat processing failed', { sessionId, error: err.message });

      const errorResponse: ConversationEntry = {
        id: uuidv4(),
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      };
      this.conversationManager.addMessage(sessionId, errorResponse);

      return {
        id: errorResponse.id,
        sessionId,
        message: `I encountered an error: ${err.message}`,
        followUpSuggestions: ['Try rephrasing your question', 'Check if the database connection is active'],
        timestamp: new Date(),
      };
    }
  }

  getHistory(sessionId: string) {
    return this.conversationManager.getHistory(sessionId);
  }

  clearHistory(sessionId: string) {
    this.conversationManager.clearSession(sessionId);
  }
}
