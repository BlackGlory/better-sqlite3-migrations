import { describe, test, expect } from 'vitest'
import Database from 'better-sqlite3'
import type { Database as IDatabase } from 'better-sqlite3'
import { getError } from 'return-style'
import { migrate, IMigration } from '@src/migrate.js'

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

describe('migrate', () => {
  describe('The maximum known migration version < user_version', () => {
    test('throwOnNewerVersion = false', () => {
      const db = new Database(':memory:')
      setDatabaseVersion(db, 999)

      migrate(db, migrations, {
        targetVersion: 2
      , throwOnNewerVersion: false
      })

      const version = getDatabaseVersion(db)
      expect(version).toBe(999)
    })

    test('throwOnNewerVersion = true', () => {
      const db = new Database(':memory:')
      setDatabaseVersion(db, 999)

      const error = getError(() => migrate(db, migrations, {
        targetVersion: 2
      , throwOnNewerVersion: true
      }))

      expect(error).toBeInstanceOf(Error)
      const version = getDatabaseVersion(db)
      expect(version).toBe(999)
    })
  })

  test('upgrade', () => {
    const db = new Database(':memory:')

    const versionBefore = getDatabaseVersion(db)
    migrate(db, migrations, { targetVersion: 2 })
    const versionAfter = getDatabaseVersion(db)

    expect(versionBefore).toBe(0)
    expect(versionAfter).toBe(2)
    const tables = getDatabaseTables(db)
    expect(tables).toEqual(['test'])
    const schema = getTableSchema(db, 'test')
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

  test('downgrade', () => {
    const db = new Database(':memory:')
    migrate(db, migrations, { targetVersion: 2 })

    const versionBefore = getDatabaseVersion(db)
    migrate(db, migrations, { targetVersion: 0 })
    const versionAfter = getDatabaseVersion(db)

    expect(versionBefore).toBe(2)
    expect(versionAfter).toBe(0)
    const tables = getDatabaseTables(db)
    expect(tables).toEqual([])
  })
})

function setDatabaseVersion(db: IDatabase, version: number): void {
  db.exec(`PRAGMA user_version = ${version};`)
}

function getDatabaseVersion(db: IDatabase): number {
  const result = db.prepare('PRAGMA user_version;').get() as {
    user_version: number
  }
  return result['user_version']
}

function getTableSchema(db: IDatabase, tableName: string): Array<{
  name: string
  type: string
}> {
  const result = db.prepare(`PRAGMA table_info(${tableName});`).all() as Array<{
    name: string
    type: string
  }>
  return result
}

function getDatabaseTables(db: IDatabase): string[] {
  const result = db.prepare(`
    SELECT name
      FROM sqlite_master
     WHERE type='table';
  `).all() as Array<{ name: string }>

  return result.map(x => x['name'])
}
