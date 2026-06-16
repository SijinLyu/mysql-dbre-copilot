import { SafetyCheck } from './types.js';

const SENSITIVE_COLUMN_PATTERNS = [
  /password/i, /passwd/i, /pwd/i,
  /secret/i, /token/i, /api_key/i,
  /ssn/i, /social_security/i,
  /credit_card/i, /card_number/i, /cvv/i,
  /bank_account/i, /routing_number/i,
  /private_key/i, /access_key/i,
];

export class StaticAnalyzer {
  analyze(sql: string): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    checks.push(this.checkSelectStar(sql));
    checks.push(this.checkMissingLimit(sql));
    checks.push(this.checkMissingWhere(sql));
    checks.push(this.checkSensitiveColumns(sql));
    checks.push(this.checkUnionAll(sql));
    checks.push(this.checkCartesianJoin(sql));

    return checks;
  }

  private checkSelectStar(sql: string): SafetyCheck {
    const hasSelectStar = /SELECT\s+\*/i.test(sql) &&
      !/SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(sql);

    return {
      name: 'select_star',
      passed: !hasSelectStar,
      severity: 'warning',
      message: hasSelectStar
        ? 'Query uses SELECT * which may return unnecessary columns. Consider specifying columns explicitly.'
        : 'Query specifies columns explicitly.',
    };
  }

  private checkMissingLimit(sql: string): SafetyCheck {
    const isSelect = /^\s*(SELECT|WITH)/i.test(sql);
    const hasLimit = /LIMIT\s+\d+/i.test(sql);
    const isAggregate = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(sql) &&
      !/GROUP\s+BY/i.test(sql);
    const isSubquery = /\(\s*SELECT/i.test(sql);

    const needsLimit = isSelect && !hasLimit && !isAggregate;

    return {
      name: 'missing_limit',
      passed: !needsLimit,
      severity: 'warning',
      message: needsLimit
        ? 'Query has no LIMIT clause. Large result sets may impact performance. Consider adding LIMIT.'
        : 'Query has appropriate result size control.',
    };
  }

  private checkMissingWhere(sql: string): SafetyCheck {
    const isModify = /^\s*(UPDATE|DELETE)\s/i.test(sql);
    const hasWhere = /\bWHERE\b/i.test(sql);

    const dangerous = isModify && !hasWhere;

    return {
      name: 'missing_where',
      passed: !dangerous,
      severity: 'error',
      message: dangerous
        ? 'UPDATE/DELETE without WHERE clause will affect ALL rows. This is extremely dangerous.'
        : 'Query has appropriate filtering conditions.',
    };
  }

  private checkSensitiveColumns(sql: string): SafetyCheck {
    const foundSensitive: string[] = [];

    for (const pattern of SENSITIVE_COLUMN_PATTERNS) {
      const match = sql.match(pattern);
      if (match) {
        foundSensitive.push(match[0]);
      }
    }

    return {
      name: 'sensitive_columns',
      passed: foundSensitive.length === 0,
      severity: 'warning',
      message: foundSensitive.length > 0
        ? `Query accesses potentially sensitive columns: ${foundSensitive.join(', ')}. Ensure this is authorized.`
        : 'No sensitive column access detected.',
    };
  }

  private checkUnionAll(sql: string): SafetyCheck {
    const hasUnionWithoutAll = /\bUNION\b(?!\s+ALL)/i.test(sql);

    return {
      name: 'union_dedup',
      passed: !hasUnionWithoutAll,
      severity: 'info',
      message: hasUnionWithoutAll
        ? 'UNION without ALL causes deduplication overhead. Use UNION ALL if duplicates are acceptable.'
        : 'No UNION deduplication overhead.',
    };
  }

  private checkCartesianJoin(sql: string): SafetyCheck {
    // Detect comma-separated tables without proper join condition
    const fromClause = sql.match(/FROM\s+([\s\S]*?)(?:WHERE|GROUP|ORDER|LIMIT|HAVING|$)/i);
    if (!fromClause) {
      return { name: 'cartesian_join', passed: true, severity: 'info', message: 'No cartesian join risk.' };
    }

    const tables = fromClause[1].split(',');
    const hasExplicitJoin = /\bJOIN\b/i.test(fromClause[1]);
    const isCartesian = tables.length > 1 && !hasExplicitJoin;

    return {
      name: 'cartesian_join',
      passed: !isCartesian,
      severity: 'error',
      message: isCartesian
        ? 'Possible cartesian join detected (comma-separated tables without explicit JOIN). This may produce massive result sets.'
        : 'No cartesian join risk.',
    };
  }
}
