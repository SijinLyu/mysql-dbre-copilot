import { TableMeta, IndexMeta } from '../schema/types.js';

export interface RedundantIndex {
  table: string;
  redundantIndex: string;
  coveredBy: string;
  reason: string;
  dropStatement: string;
}

export interface DuplicateIndex {
  table: string;
  indexA: string;
  indexB: string;
  columns: string[];
  reason: string;
}

export interface UnusedIndexHint {
  table: string;
  index: string;
  reason: string;
}

/**
 * Detects redundant or duplicate indexes.
 *
 * Concepts:
 * - Duplicate: two indexes have exactly the same column list and uniqueness.
 * - Redundant: an index is a strict prefix of another (composite) index, so it can be dropped.
 * - PK-shadowed: a non-unique index whose first column is the primary key.
 */
export class IndexRedundancyDetector {
  detectRedundant(table: TableMeta): RedundantIndex[] {
    const result: RedundantIndex[] = [];
    const indexes = table.indexes;

    for (let i = 0; i < indexes.length; i++) {
      const a = indexes[i];
      if (a.name === 'PRIMARY') continue;

      for (let j = 0; j < indexes.length; j++) {
        if (i === j) continue;
        const b = indexes[j];
        if (b.name === 'PRIMARY' && this.startsWithSamePk(a, table.primaryKey)) {
          result.push({
            table: table.name,
            redundantIndex: a.name,
            coveredBy: 'PRIMARY',
            reason: `Index '${a.name}' starts with PK column '${table.primaryKey[0]}'. The clustered PK already covers this prefix.`,
            dropStatement: `DROP INDEX ${a.name} ON ${table.name};`,
          });
          break;
        }

        if (this.isPrefixOf(a.columns, b.columns) && a.unique === b.unique) {
          result.push({
            table: table.name,
            redundantIndex: a.name,
            coveredBy: b.name,
            reason: `Index '${a.name}(${a.columns.join(',')})' is a prefix of '${b.name}(${b.columns.join(',')})' — the longer index can satisfy the same lookups.`,
            dropStatement: `DROP INDEX ${a.name} ON ${table.name};`,
          });
          break;
        }
      }
    }

    return result;
  }

  detectDuplicates(table: TableMeta): DuplicateIndex[] {
    const result: DuplicateIndex[] = [];
    const indexes = table.indexes;
    const seen = new Set<string>();

    for (let i = 0; i < indexes.length; i++) {
      for (let j = i + 1; j < indexes.length; j++) {
        const a = indexes[i];
        const b = indexes[j];
        if (a.name === 'PRIMARY' || b.name === 'PRIMARY') continue;

        if (this.sameColumns(a.columns, b.columns) && a.unique === b.unique) {
          const key = [a.name, b.name].sort().join('::');
          if (!seen.has(key)) {
            seen.add(key);
            result.push({
              table: table.name,
              indexA: a.name,
              indexB: b.name,
              columns: a.columns,
              reason: `Indexes '${a.name}' and '${b.name}' cover the exact same columns (${a.columns.join(', ')}) with the same uniqueness. Drop one.`,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Heuristic detection of indexes that may be unused based on column overlap
   * with other indexes.
   */
  detectPotentiallyUnused(table: TableMeta): UnusedIndexHint[] {
    const hints: UnusedIndexHint[] = [];

    for (const idx of table.indexes) {
      if (idx.name === 'PRIMARY') continue;

      // If the leading column matches no foreign key and no other indexes use it,
      // it might be a leftover index.
      const leadingCol = idx.columns[0];
      const hasFk = table.foreignKeys.some(fk => fk.column === leadingCol);
      const sharedByOthers = table.indexes.some(
        other => other.name !== idx.name && other.columns.includes(leadingCol)
      );

      if (!hasFk && !sharedByOthers && idx.columns.length === 1) {
        hints.push({
          table: table.name,
          index: idx.name,
          reason: `Single-column index on '${leadingCol}' has no foreign key and no other index uses this column. Verify usage in workload before dropping.`,
        });
      }
    }

    return hints;
  }

  private isPrefixOf(shorter: string[], longer: string[]): boolean {
    if (shorter.length >= longer.length) return false;
    for (let i = 0; i < shorter.length; i++) {
      if (shorter[i].toLowerCase() !== longer[i].toLowerCase()) return false;
    }
    return true;
  }

  private sameColumns(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].toLowerCase() !== b[i].toLowerCase()) return false;
    }
    return true;
  }

  private startsWithSamePk(idx: IndexMeta, pk: string[]): boolean {
    if (pk.length === 0 || idx.columns.length === 0) return false;
    return idx.columns[0].toLowerCase() === pk[0].toLowerCase();
  }

  /**
   * Run all detectors against a table and return a combined report.
   */
  analyze(table: TableMeta): {
    redundant: RedundantIndex[];
    duplicates: DuplicateIndex[];
    potentiallyUnused: UnusedIndexHint[];
  } {
    return {
      redundant: this.detectRedundant(table),
      duplicates: this.detectDuplicates(table),
      potentiallyUnused: this.detectPotentiallyUnused(table),
    };
  }

  /**
   * Run analysis across all tables in a schema and produce a flat report.
   */
  analyzeAll(tables: TableMeta[]) {
    const allRedundant: RedundantIndex[] = [];
    const allDuplicates: DuplicateIndex[] = [];
    const allUnused: UnusedIndexHint[] = [];

    for (const table of tables) {
      const result = this.analyze(table);
      allRedundant.push(...result.redundant);
      allDuplicates.push(...result.duplicates);
      allUnused.push(...result.potentiallyUnused);
    }

    return { redundant: allRedundant, duplicates: allDuplicates, potentiallyUnused: allUnused };
  }
}
