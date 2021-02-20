import Database = require('better-sqlite3')
import type { Database as IDatabase } from 'better-sqlite3'
import { migrate, IMigration } from '@src/migrate'

const migrations: IMigration[] = [
  {
    version: 1
  , up: `
      CREATE TABLE test (
        id INTEGER PRIMARY KEY
      );
    `
  , down: `
      DROP TABLE test;
    `
  }
, {
    version: 2
  , up(db) {
      db.exec(`
        ALTER TABLE test
          ADD COLUMN name TEXT;
      `)
    }
  , down(db) {
      db.transaction(() => {
        db.exec(`
          -- https://www.sqlite.org/faq.html#q11
          CREATE TEMPORARY TABLE test_backup (
            id   INTEGER PRIMARY KEY
          , name TEXT
          );

          INSERT INTO test_backup
          SELECT id, name
            FROM test;

          DROP TABLE test;

          CREATE TABLE test (
            id INTEGER PRIMARY KEY
          );

          INSERT INTO test
          SELECT id
            FROM test_backup;

          DROP TABLE test_backup;
        `)
      })()
    }
  }
]

describe('migrate(db: Database, migrations: Migration[], targetVersion: number): void', () => {
  describe('upgrade', () => {
    it('upgrade', () => {
      const db = new Database(':memory:')

      const versionBefore = getDatabaseVersion(db)
      migrate(db, migrations, 2)
      const versionAfter = getDatabaseVersion(db)
      const tables = getDatabaseTables(db)
      const schema = getTableSchema(db, 'test')

      expect(versionBefore).toBe(0)
      expect(versionAfter).toBe(2)
      expect(tables).toEqual(['test'])
      expect(schema).toMatchObject([
        {
          name: 'id'
        , type: 'INTEGER'
        }
      , {
          name: 'name'
        , type: 'TEXT'
        }
      ])
    })
  })

  describe('downgrade', () => {
    it('downgrade', () => {
      const db = new Database(':memory:')
      migrate(db, migrations, 2)

      const versionBefore = getDatabaseVersion(db)
      migrate(db, migrations, 0)
      const versionAfter = getDatabaseVersion(db)
      const tables = getDatabaseTables(db)

      expect(versionBefore).toBe(2)
      expect(versionAfter).toBe(0)
      expect(tables).toEqual([])
    })
  })
})

function getDatabaseVersion(db: IDatabase): number {
  const result = db.prepare('PRAGMA user_version;').get()
  return result['user_version']
}

function getTableSchema(db: IDatabase, tableName: string): Array<{ name: string, type: string }> {
  const result = db.prepare(`PRAGMA table_info(${tableName});`).all()
  return result
}

function getDatabaseTables(db: IDatabase): string[] {
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all()
  return result.map(x => x['name'])
}
