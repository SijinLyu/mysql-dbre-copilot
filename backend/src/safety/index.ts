import { Pool } from 'mysql2/promise';
import { SqlClassifier } from './sql-classifier.js';
import { StaticAnalyzer } from './static-analyzer.js';
import { ExplainAnalyzer } from './explain-analyzer.js';
import { RiskScorer } from './risk-scorer.js';
import { SafetyReport } from './types.js';

export { SqlClassifier } from './sql-classifier.js';
export { StaticAnalyzer } from './static-analyzer.js';
export { ExplainAnalyzer } from './explain-analyzer.js';
export { RiskScorer } from './risk-scorer.js';
export * from './types.js';

export class SafetyPipeline {
  private classifier: SqlClassifier;
  private staticAnalyzer: StaticAnalyzer;
  private explainAnalyzer: ExplainAnalyzer;
  private riskScorer: RiskScorer;

  constructor(pool: Pool) {
    this.classifier = new SqlClassifier();
    this.staticAnalyzer = new StaticAnalyzer();
    this.explainAnalyzer = new ExplainAnalyzer(pool);
    this.riskScorer = new RiskScorer();
  }

  async analyze(sql: string): Promise<SafetyReport> {
    // 1. Classify SQL type
    const sqlType = this.classifier.classify(sql);

    // 2. Run static checks
    const checks = this.staticAnalyzer.analyze(sql);

    // 3. Check for multiple statements
    if (this.classifier.containsMultipleStatements(sql)) {
      checks.push({
        name: 'multiple_statements',
        passed: false,
        severity: 'error',
        message: 'Multiple SQL statements detected. Only single statements are allowed.',
      });
    }

    // 4. Run EXPLAIN for SELECT queries
    const explainAnalysis = await this.explainAnalyzer.analyze(sql);

    // 5. Compute risk score
    const report = this.riskScorer.score({
      sqlType,
      checks,
      explainAnalysis,
    });

    return report;
  }
}
