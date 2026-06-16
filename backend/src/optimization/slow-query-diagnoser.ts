export interface SlowQueryPattern {
  name: string;
  description: string;
  detected: boolean;
  suggestion: string;
}

export class SlowQueryDiagnoser {
  diagnose(sql: string, executionTimeMs?: number): SlowQueryPattern[] {
    const patterns: SlowQueryPattern[] = [];

    patterns.push(this.checkLeadingWildcard(sql));
    patterns.push(this.checkFunctionOnIndexedColumn(sql));
    patterns.push(this.checkImplicitTypeConversion(sql));
    patterns.push(this.checkSubqueryInWhere(sql));
    patterns.push(this.checkSelectInLoop(sql));
    patterns.push(this.checkLargeOffset(sql));

    return patterns;
  }

  private checkLeadingWildcard(sql: string): SlowQueryPattern {
    const detected = /LIKE\s+['"]%/i.test(sql);
    return {
      name: 'leading_wildcard',
      description: 'LIKE pattern with leading wildcard',
      detected,
      suggestion: detected
        ? 'Leading wildcard (LIKE "%value") prevents index usage. Consider full-text search or suffix indexing.'
        : '',
    };
  }

  private checkFunctionOnIndexedColumn(sql: string): SlowQueryPattern {
    const detected = /WHERE\s+\w+\s*\(\s*\w+/i.test(sql) ||
      /WHERE\s+(DATE|YEAR|MONTH|UPPER|LOWER|TRIM|SUBSTRING)\s*\(/i.test(sql);
    return {
      name: 'function_on_column',
      description: 'Function applied to column in WHERE clause',
      detected,
      suggestion: detected
        ? 'Applying functions to columns (e.g., DATE(col) = ...) prevents index usage. Rewrite to compare against the raw column.'
        : '',
    };
  }

  private checkImplicitTypeConversion(sql: string): SlowQueryPattern {
    // Heuristic: string compared without quotes to numeric-looking value
    const detected = /WHERE\s+\w+\s*=\s*\d+/i.test(sql) && /varchar|char|text/i.test(sql);
    return {
      name: 'implicit_conversion',
      description: 'Possible implicit type conversion',
      detected: false, // Hard to detect without schema, keep as info
      suggestion: '',
    };
  }

  private checkSubqueryInWhere(sql: string): SlowQueryPattern {
    const detected = /WHERE\s+[\s\S]*?\(\s*SELECT/i.test(sql);
    return {
      name: 'subquery_in_where',
      description: 'Correlated subquery in WHERE clause',
      detected,
      suggestion: detected
        ? 'Subquery in WHERE may execute once per row. Consider rewriting as JOIN or EXISTS.'
        : '',
    };
  }

  private checkSelectInLoop(sql: string): SlowQueryPattern {
    // N+1 detection is really a code-level issue, but we flag correlated patterns
    const detected = /IN\s*\(\s*SELECT/i.test(sql);
    return {
      name: 'in_subquery',
      description: 'IN with subquery',
      detected,
      suggestion: detected
        ? 'IN (SELECT ...) can be slow for large result sets. Consider using JOIN instead.'
        : '',
    };
  }

  private checkLargeOffset(sql: string): SlowQueryPattern {
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i) || sql.match(/LIMIT\s+\d+\s*,\s*(\d+)/i);
    const detected = offsetMatch ? parseInt(offsetMatch[1]) > 10000 : false;
    return {
      name: 'large_offset',
      description: 'Large OFFSET for pagination',
      detected,
      suggestion: detected
        ? 'Large OFFSET scans and discards rows. Use cursor-based pagination (WHERE id > last_id) instead.'
        : '',
    };
  }
}
