import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('migrate', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function createMemoryDb() {
    return new Database(':memory:');
  }

  async function loadMigratedDb() {
    const { USAGE_LOGS_TABLE, KILL_SWITCH_TABLE, USAGE_LOGS_INDEX, USAGE_LOGS_TIME_INDEX } =
      await import('./schema');
    const db = createMemoryDb();
    db.exec(USAGE_LOGS_TABLE);
    db.exec(KILL_SWITCH_TABLE);
    db.exec(USAGE_LOGS_INDEX);
    db.exec(USAGE_LOGS_TIME_INDEX);
    return db;
  }

  it('creates usage_logs table', async () => {
    const db = await loadMigratedDb();
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usage_logs'")
      .get() as { name: string } | undefined;
    expect(table?.name).toBe('usage_logs');
  });

  it('creates kill_switch table', async () => {
    const db = await loadMigratedDb();
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kill_switch'")
      .get() as { name: string } | undefined;
    expect(table?.name).toBe('kill_switch');
  });

  it('creates indexes', async () => {
    const db = await loadMigratedDb();
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
      .all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    expect(names).toContain('idx_usage_logs_service');
    expect(names).toContain('idx_usage_logs_created');
  });

  it('getDb returns singleton instance', async () => {
    vi.mock('./schema', async (importOriginal) => importOriginal());

    // Mock Database constructor to use :memory:
    vi.doMock('better-sqlite3', () => {
      const ActualDb = Database;
      return {
        default: class MockDb extends ActualDb {
          constructor() {
            super(':memory:');
          }
        },
      };
    });

    // Also mock path to avoid file system dependency
    vi.doMock('path', async (importOriginal) => {
      const actual = (await importOriginal()) as typeof import('path');
      return { ...actual, join: vi.fn().mockReturnValue(':memory:') };
    });

    const { getDb } = await import('./migrate');
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('is idempotent (CREATE IF NOT EXISTS)', async () => {
    const db = createMemoryDb();
    const { USAGE_LOGS_TABLE, KILL_SWITCH_TABLE, USAGE_LOGS_INDEX, USAGE_LOGS_TIME_INDEX } =
      await import('./schema');
    // Run migration twice — should not throw
    db.exec(USAGE_LOGS_TABLE);
    db.exec(KILL_SWITCH_TABLE);
    db.exec(USAGE_LOGS_INDEX);
    db.exec(USAGE_LOGS_TIME_INDEX);
    db.exec(USAGE_LOGS_TABLE);
    db.exec(KILL_SWITCH_TABLE);
    db.exec(USAGE_LOGS_INDEX);
    db.exec(USAGE_LOGS_TIME_INDEX);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('usage_logs');
    expect(tableNames).toContain('kill_switch');
  });
});
