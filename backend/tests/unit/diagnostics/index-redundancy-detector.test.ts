import { IndexRedundancyDetector } from '../../../src/diagnostics/index-redundancy-detector.js';
import { TableMeta } from '../../../src/schema/types.js';

describe('IndexRedundancyDetector', () => {
  let detector: IndexRedundancyDetector;

  beforeEach(() => {
    detector = new IndexRedundancyDetector();
  });

  const buildTable = (overrides: Partial<TableMeta> = {}): TableMeta => ({
    name: 'orders',
    comment: '',
    columns: [],
    primaryKey: ['id'],
    indexes: [],
    foreignKeys: [],
    rowEstimate: 1000,
    ...overrides,
  });

  describe('detectRedundant', () => {
    it('detects index that is a prefix of another index', () => {
      const table = buildTable({
        indexes: [
          { name: 'idx_status', columns: ['status'], unique: false, type: 'BTREE' },
          { name: 'idx_status_date', columns: ['status', 'created_at'], unique: false, type: 'BTREE' },
        ],
      });

      const result = detector.detectRedundant(table);
      expect(result).toHaveLength(1);
      expect(result[0].redundantIndex).toBe('idx_status');
      expect(result[0].coveredBy).toBe('idx_status_date');
    });

    it('detects index shadowed by primary key', () => {
      const table = buildTable({
        primaryKey: ['id'],
        indexes: [
          { name: 'PRIMARY', columns: ['id'], unique: true, type: 'BTREE' },
          { name: 'idx_id', columns: ['id'], unique: false, type: 'BTREE' },
        ],
      });

      const result = detector.detectRedundant(table);
      const found = result.find(r => r.redundantIndex === 'idx_id');
      expect(found).toBeDefined();
      expect(found?.coveredBy).toBe('PRIMARY');
    });

    it('does not flag distinct indexes', () => {
      const table = buildTable({
        indexes: [
          { name: 'idx_status', columns: ['status'], unique: false, type: 'BTREE' },
          { name: 'idx_user', columns: ['user_id'], unique: false, type: 'BTREE' },
        ],
      });

      expect(detector.detectRedundant(table)).toHaveLength(0);
    });

    it('produces a valid DROP INDEX statement', () => {
      const table = buildTable({
        name: 'users',
        indexes: [
          { name: 'idx_email', columns: ['email'], unique: false, type: 'BTREE' },
          { name: 'idx_email_status', columns: ['email', 'status'], unique: false, type: 'BTREE' },
        ],
      });

      const result = detector.detectRedundant(table);
      expect(result[0].dropStatement).toBe('DROP INDEX idx_email ON users;');
    });
  });

  describe('detectDuplicates', () => {
    it('detects two indexes on the same columns', () => {
      const table = buildTable({
        indexes: [
          { name: 'idx_a', columns: ['email'], unique: false, type: 'BTREE' },
          { name: 'idx_b', columns: ['email'], unique: false, type: 'BTREE' },
        ],
      });

      const result = detector.detectDuplicates(table);
      expect(result).toHaveLength(1);
      expect(result[0].columns).toEqual(['email']);
    });

    it('does not flag indexes with different uniqueness', () => {
      const table = buildTable({
        indexes: [
          { name: 'idx_email', columns: ['email'], unique: false, type: 'BTREE' },
          { name: 'uniq_email', columns: ['email'], unique: true, type: 'BTREE' },
        ],
      });

      expect(detector.detectDuplicates(table)).toHaveLength(0);
    });

    it('does not produce duplicate pairs', () => {
      const table = buildTable({
        indexes: [
          { name: 'a', columns: ['x'], unique: false, type: 'BTREE' },
          { name: 'b', columns: ['x'], unique: false, type: 'BTREE' },
          { name: 'c', columns: ['x'], unique: false, type: 'BTREE' },
        ],
      });

      const result = detector.detectDuplicates(table);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('detectPotentiallyUnused', () => {
    it('flags single-column index without FK or other usage', () => {
      const table = buildTable({
        indexes: [
          { name: 'idx_unused', columns: ['orphan_col'], unique: false, type: 'BTREE' },
        ],
        foreignKeys: [],
      });

      const result = detector.detectPotentiallyUnused(table);
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe('idx_unused');
    });

    it('does not flag index supporting a foreign key', () => {
      const table = buildTable({
        indexes: [
          { name: 'idx_user', columns: ['user_id'], unique: false, type: 'BTREE' },
        ],
        foreignKeys: [
          { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', constraintName: 'fk' },
        ],
      });

      expect(detector.detectPotentiallyUnused(table)).toHaveLength(0);
    });

    it('does not flag composite indexes', () => {
      const table = buildTable({
        indexes: [
          { name: 'idx_composite', columns: ['a', 'b'], unique: false, type: 'BTREE' },
        ],
      });

      expect(detector.detectPotentiallyUnused(table)).toHaveLength(0);
    });
  });

  describe('analyzeAll', () => {
    it('combines results across multiple tables', () => {
      const tables = [
        buildTable({
          name: 't1',
          indexes: [
            { name: 'a', columns: ['x'], unique: false, type: 'BTREE' },
            { name: 'b', columns: ['x', 'y'], unique: false, type: 'BTREE' },
          ],
        }),
        buildTable({
          name: 't2',
          indexes: [
            { name: 'c', columns: ['z'], unique: false, type: 'BTREE' },
            { name: 'd', columns: ['z'], unique: false, type: 'BTREE' },
          ],
        }),
      ];

      const result = detector.analyzeAll(tables);
      expect(result.redundant.length).toBeGreaterThan(0);
      expect(result.duplicates.length).toBeGreaterThan(0);
    });
  });
});
