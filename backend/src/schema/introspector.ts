import { Pool } from 'mysql2/promise';
import { SchemaInfo, TableMeta, ColumnMeta, IndexMeta, ForeignKeyMeta } from './types.js';

export class SchemaIntrospector {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async introspect(database: string): Promise<SchemaInfo> {
    const tables = await this.getTables(database);
    const tableMetas: TableMeta[] = [];

    for (const tableName of tables) {
      const [columns, indexes, foreignKeys, rowEstimate] = await Promise.all([
        this.getColumns(database, tableName),
        this.getIndexes(database, tableName),
        this.getForeignKeys(database, tableName),
        this.getRowEstimate(database, tableName),
      ]);

      const primaryKey = columns
        .filter(c => c.isPrimaryKey)
        .map(c => c.name);

      tableMetas.push({
        name: tableName,
        comment: await this.getTableComment(database, tableName),
        columns,
        primaryKey,
        indexes,
        foreignKeys,
        rowEstimate,
      });
    }

    return {
      database,
      tables: tableMetas,
      fetchedAt: new Date(),
    };
  }

  private async getTables(database: string): Promise<string[]> {
    const [rows] = await this.pool.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [database]
    );
    return (rows as any[]).map(r => r.TABLE_NAME);
  }

  private async getColumns(database: string, table: string): Promise<ColumnMeta[]> {
    const [rows] = await this.pool.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
              COLUMN_COMMENT, COLUMN_KEY, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [database, table]
    );

    return (rows as any[]).map(row => ({
      name: row.COLUMN_NAME,
      type: row.COLUMN_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      comment: row.COLUMN_COMMENT || '',
      isPrimaryKey: row.COLUMN_KEY === 'PRI',
      isAutoIncrement: row.EXTRA?.includes('auto_increment') || false,
    }));
  }

  private async getIndexes(database: string, table: string): Promise<IndexMeta[]> {
    const [rows] = await this.pool.query(
      `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [database, table]
    );

    const indexMap = new Map<string, IndexMeta>();
    for (const row of rows as any[]) {
      const existing = indexMap.get(row.INDEX_NAME);
      if (existing) {
        existing.columns.push(row.COLUMN_NAME);
      } else {
        indexMap.set(row.INDEX_NAME, {
          name: row.INDEX_NAME,
          columns: [row.COLUMN_NAME],
          unique: row.NON_UNIQUE === 0,
          type: row.INDEX_TYPE,
        });
      }
    }

    return Array.from(indexMap.values());
  }

  private async getForeignKeys(database: string, table: string): Promise<ForeignKeyMeta[]> {
    const [rows] = await this.pool.query(
      `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [database, table]
    );

    return (rows as any[]).map(row => ({
      column: row.COLUMN_NAME,
      referencedTable: row.REFERENCED_TABLE_NAME,
      referencedColumn: row.REFERENCED_COLUMN_NAME,
      constraintName: row.CONSTRAINT_NAME,
    }));
  }

  private async getRowEstimate(database: string, table: string): Promise<number> {
    const [rows] = await this.pool.query(
      `SELECT TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [database, table]
    );
    return (rows as any[])[0]?.TABLE_ROWS || 0;
  }

  private async getTableComment(database: string, table: string): Promise<string> {
    const [rows] = await this.pool.query(
      `SELECT TABLE_COMMENT FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [database, table]
    );
    return (rows as any[])[0]?.TABLE_COMMENT || '';
  }

  formatForLLM(schema: SchemaInfo): string {
    let output = `Database: ${schema.database}\n\n`;

    for (const table of schema.tables) {
      output += `Table: ${table.name}`;
      if (table.comment) output += ` -- ${table.comment}`;
      output += `\n  Columns:\n`;

      for (const col of table.columns) {
        const flags: string[] = [];
        if (col.isPrimaryKey) flags.push('PK');
        if (col.isAutoIncrement) flags.push('AUTO_INCREMENT');
        if (!col.nullable) flags.push('NOT NULL');
        const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
        output += `    - ${col.name} ${col.type}${flagStr}`;
        if (col.comment) output += ` -- ${col.comment}`;
        output += '\n';
      }

      if (table.indexes.length > 0) {
        output += `  Indexes:\n`;
        for (const idx of table.indexes) {
          const uniqueStr = idx.unique ? 'UNIQUE ' : '';
          output += `    - ${uniqueStr}${idx.name}(${idx.columns.join(', ')})\n`;
        }
      }

      if (table.foreignKeys.length > 0) {
        output += `  Foreign Keys:\n`;
        for (const fk of table.foreignKeys) {
          output += `    - ${fk.column} -> ${fk.referencedTable}(${fk.referencedColumn})\n`;
        }
      }

      output += `  Estimated rows: ~${table.rowEstimate}\n\n`;
    }

    return output;
  }
}
