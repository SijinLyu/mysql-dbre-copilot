import { SafetyReport, SafetyCheck, RiskLevel, ExplainAnalysis, SqlType } from './types.js';

interface RiskInput {
  sqlType: SqlType;
  checks: SafetyCheck[];
  explainAnalysis?: ExplainAnalysis | null;
}

export class RiskScorer {
  score(input: RiskInput): SafetyReport {
    let riskScore = 0;
    const suggestions: string[] = [];

    // SQL type base score
    switch (input.sqlType) {
      case 'SELECT': riskScore += 0; break;
      case 'INSERT': riskScore += 30; break;
      case 'UPDATE': riskScore += 40; break;
      case 'DELETE': riskScore += 50; break;
      case 'DDL': riskScore += 80; break;
      case 'OTHER': riskScore += 60; break;
    }

    // Static check penalties
    for (const check of input.checks) {
      if (!check.passed) {
        switch (check.severity) {
          case 'error': riskScore += 25; break;
          case 'warning': riskScore += 10; break;
          case 'info': riskScore += 3; break;
        }
        suggestions.push(check.message);
      }
    }

    // EXPLAIN analysis penalties
    if (input.explainAnalysis) {
      const explain = input.explainAnalysis;

      if (explain.hasFullTableScan) riskScore += 15;
      if (explain.hasFilesort) riskScore += 8;
      if (explain.hasTempTable) riskScore += 8;

      if (explain.estimatedRows > 1000000) riskScore += 20;
      else if (explain.estimatedRows > 100000) riskScore += 10;
      else if (explain.estimatedRows > 10000) riskScore += 5;

      suggestions.push(...explain.warnings);
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Determine risk level
    const riskLevel = this.scoreToLevel(riskScore);

    // Determine recommendation
    const recommendation = this.getRecommendation(riskLevel, input.sqlType);

    return {
      riskLevel,
      riskScore,
      sqlType: input.sqlType,
      checks: input.checks,
      explainAnalysis: input.explainAnalysis || undefined,
      recommendation,
      suggestions,
      executionAllowed: recommendation !== 'reject',
    };
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score <= 20) return RiskLevel.LOW;
    if (score <= 45) return RiskLevel.MEDIUM;
    if (score <= 70) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  private getRecommendation(level: RiskLevel, sqlType: SqlType): 'execute' | 'warn' | 'reject' {
    if (level === RiskLevel.CRITICAL) return 'reject';
    if (level === RiskLevel.HIGH) return 'reject';
    if (level === RiskLevel.MEDIUM) return 'warn';
    return 'execute';
  }
}
