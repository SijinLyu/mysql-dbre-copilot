export interface SlowQueryLogEntry {
  timestamp: Date;
  user: string;
  host: string;
  queryTimeMs: number;
  lockTimeMs: number;
  rowsSent: number;
  rowsExamined: number;
  database: string;
  sql: string;
}

export interface SlowQueryStats {
  totalQueries: number;
  avgQueryTimeMs: number;
  maxQueryTimeMs: number;
  totalRowsExamined: number;
  topSlowQueries: SlowQueryLogEntry[];
  byUser: Record<string, number>;
  byDatabase: Record<string, number>;
}

/**
 * Parses MySQL slow query log content.
 * Format reference: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
 */
export class SlowQueryLogParser {
  /**
   * Parse slow query log content into structured entries.
   */
  parse(content: string): SlowQueryLogEntry[] {
    const entries: SlowQueryLogEntry[] = [];
    const blocks = this.splitIntoBlocks(content);

    for (const block of blocks) {
      const entry = this.parseBlock(block);
      if (entry) entries.push(entry);
    }

    return entries;
  }

  /**
   * Split log content by '# Time:' or 'use database;' lines.
   */
  private splitIntoBlocks(content: string): string[] {
    const lines = content.split('\n');
    const blocks: string[] = [];
    let current: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# Time:') && current.length > 0) {
        blocks.push(current.join('\n'));
        current = [line];
      } else {
        current.push(line);
      }
    }

    if (current.length > 0) {
      blocks.push(current.join('\n'));
    }

    return blocks.filter(b => b.includes('Query_time:'));
  }

  /**
   * Parse a single block representing one slow query event.
   */
  private parseBlock(block: string): SlowQueryLogEntry | null {
    const lines = block.split('\n');
    let timestamp = new Date();
    let user = '';
    let host = '';
    let queryTimeMs = 0;
    let lockTimeMs = 0;
    let rowsSent = 0;
    let rowsExamined = 0;
    let database = '';
    const sqlLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# Time:')) {
        const ts = line.substring(7).trim();
        const parsed = new Date(ts);
        if (!isNaN(parsed.getTime())) timestamp = parsed;
      } else if (line.startsWith('# User@Host:')) {
        const match = line.match(/User@Host:\s+(\w+)\[\w+\]\s+@\s+([^\s]+)/);
        if (match) {
          user = match[1];
          host = match[2];
        }
      } else if (line.startsWith('# Query_time:')) {
        const qt = line.match(/Query_time:\s+([\d.]+)/);
        const lt = line.match(/Lock_time:\s+([\d.]+)/);
        const rs = line.match(/Rows_sent:\s+(\d+)/);
        const re = line.match(/Rows_examined:\s+(\d+)/);
        if (qt) queryTimeMs = Math.round(parseFloat(qt[1]) * 1000);
        if (lt) lockTimeMs = Math.round(parseFloat(lt[1]) * 1000);
        if (rs) rowsSent = parseInt(rs[1], 10);
        if (re) rowsExamined = parseInt(re[1], 10);
      } else if (line.startsWith('use ')) {
        const dbMatch = line.match(/use\s+(\w+)/i);
        if (dbMatch) database = dbMatch[1];
      } else if (!line.startsWith('#') && !line.startsWith('SET ') && line.trim()) {
        sqlLines.push(line);
      }
    }

    if (queryTimeMs === 0 || sqlLines.length === 0) return null;

    return {
      timestamp,
      user,
      host,
      queryTimeMs,
      lockTimeMs,
      rowsSent,
      rowsExamined,
      database,
      sql: sqlLines.join('\n').trim(),
    };
  }

  /**
   * Compute aggregate statistics across slow query log entries.
   */
  computeStats(entries: SlowQueryLogEntry[], topN: number = 10): SlowQueryStats {
    if (entries.length === 0) {
      return {
        totalQueries: 0,
        avgQueryTimeMs: 0,
        maxQueryTimeMs: 0,
        totalRowsExamined: 0,
        topSlowQueries: [],
        byUser: {},
        byDatabase: {},
      };
    }

    const totalTime = entries.reduce((sum, e) => sum + e.queryTimeMs, 0);
    const totalRows = entries.reduce((sum, e) => sum + e.rowsExamined, 0);
    const maxTime = Math.max(...entries.map(e => e.queryTimeMs));

    const byUser: Record<string, number> = {};
    const byDatabase: Record<string, number> = {};

    for (const entry of entries) {
      byUser[entry.user] = (byUser[entry.user] || 0) + 1;
      if (entry.database) {
        byDatabase[entry.database] = (byDatabase[entry.database] || 0) + 1;
      }
    }

    const sorted = [...entries].sort((a, b) => b.queryTimeMs - a.queryTimeMs);

    return {
      totalQueries: entries.length,
      avgQueryTimeMs: Math.round(totalTime / entries.length),
      maxQueryTimeMs: maxTime,
      totalRowsExamined: totalRows,
      topSlowQueries: sorted.slice(0, topN),
      byUser,
      byDatabase,
    };
  }

  /**
   * Group queries by SQL fingerprint (normalized form) and sum their timings.
   */
  groupByFingerprint(entries: SlowQueryLogEntry[]): Map<string, {
    fingerprint: string;
    count: number;
    totalTimeMs: number;
    avgTimeMs: number;
    maxTimeMs: number;
    sample: string;
  }> {
    const groups = new Map<string, {
      fingerprint: string;
      count: number;
      totalTimeMs: number;
      avgTimeMs: number;
      maxTimeMs: number;
      sample: string;
    }>();

    for (const entry of entries) {
      const fp = this.fingerprint(entry.sql);
      const existing = groups.get(fp);

      if (existing) {
        existing.count++;
        existing.totalTimeMs += entry.queryTimeMs;
        existing.maxTimeMs = Math.max(existing.maxTimeMs, entry.queryTimeMs);
        existing.avgTimeMs = Math.round(existing.totalTimeMs / existing.count);
      } else {
        groups.set(fp, {
          fingerprint: fp,
          count: 1,
          totalTimeMs: entry.queryTimeMs,
          avgTimeMs: entry.queryTimeMs,
          maxTimeMs: entry.queryTimeMs,
          sample: entry.sql,
        });
      }
    }

    return groups;
  }

  /**
   * Normalize SQL to a fingerprint by replacing literals with placeholders.
   */
  private fingerprint(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      .replace(/\b\d+\b/g, '?')
      .replace(/\bIN\s*\([^)]+\)/gi, 'IN (?)')
      .toLowerCase()
      .trim();
  }
}
