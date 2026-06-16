import { SchemaCache } from '../../../src/schema/cache.js';
import { SchemaInfo } from '../../../src/schema/types.js';

describe('SchemaCache', () => {
  let cache: SchemaCache;

  const mockSchema: SchemaInfo = {
    database: 'test_db',
    tables: [
      {
        name: 'users',
        comment: '',
        columns: [
          { name: 'id', type: 'int', nullable: false, defaultValue: null, comment: '', isPrimaryKey: true, isAutoIncrement: true },
          { name: 'name', type: 'varchar(100)', nullable: false, defaultValue: null, comment: '', isPrimaryKey: false, isAutoIncrement: false },
        ],
        primaryKey: ['id'],
        indexes: [],
        foreignKeys: [],
        rowEstimate: 1000,
      },
    ],
    fetchedAt: new Date(),
  };

  beforeEach(() => {
    cache = new SchemaCache(1000); // 1 second TTL for tests
  });

  it('returns null for cache miss', () => {
    expect(cache.get('conn1', 'db1')).toBeNull();
  });

  it('stores and retrieves schema', () => {
    cache.set('conn1', 'test_db', mockSchema);
    const result = cache.get('conn1', 'test_db');
    expect(result).not.toBeNull();
    expect(result?.database).toBe('test_db');
    expect(result?.tables).toHaveLength(1);
  });

  it('expires after TTL', async () => {
    cache.set('conn1', 'test_db', mockSchema);
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(cache.get('conn1', 'test_db')).toBeNull();
  });

  it('invalidates specific database', () => {
    cache.set('conn1', 'db1', mockSchema);
    cache.set('conn1', 'db2', { ...mockSchema, database: 'db2' });
    cache.invalidate('conn1', 'db1');
    expect(cache.get('conn1', 'db1')).toBeNull();
    expect(cache.get('conn1', 'db2')).not.toBeNull();
  });

  it('invalidates all databases for connection', () => {
    cache.set('conn1', 'db1', mockSchema);
    cache.set('conn1', 'db2', { ...mockSchema, database: 'db2' });
    cache.invalidate('conn1');
    expect(cache.get('conn1', 'db1')).toBeNull();
    expect(cache.get('conn1', 'db2')).toBeNull();
  });

  it('clears all cache', () => {
    cache.set('conn1', 'db1', mockSchema);
    cache.set('conn2', 'db2', mockSchema);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
