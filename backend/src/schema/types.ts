export interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  comment: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
}

export interface IndexMeta {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface ForeignKeyMeta {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

export interface TableMeta {
  name: string;
  comment: string;
  columns: ColumnMeta[];
  primaryKey: string[];
  indexes: IndexMeta[];
  foreignKeys: ForeignKeyMeta[];
  rowEstimate: number;
}

export interface SchemaInfo {
  database: string;
  tables: TableMeta[];
  fetchedAt: Date;
}
