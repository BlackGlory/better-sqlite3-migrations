import type { Database } from 'better-sqlite3'
import { isFunction } from '@blackglory/types'

export interface IMigration {
  version: number
  up: string | ((db: Database) => void)
  down: string | ((db: Database) => void)
}

export function migrate(
  db: Database
, migrations: IMigration[]
, targetVersion = getMaximumVersion(migrations)
): void {
  let currentVersion: number
  while ((currentVersion = getDatabaseVersion(db)) !== targetVersion) {
    if (currentVersion < targetVersion) {
      upgrade()
    } else {
      downgrade()
    }
  }

  function upgrade() {
    const currentVersion = getDatabaseVersion(db)
    const targetVersion = currentVersion + 1

    const migration = migrations.find(x => x.version === targetVersion)
    if (!migration) throw new Error(`Cannot find migration for version ${targetVersion}`)

    try {
      if (isFunction(migration.up)) {
        migration.up(db)
      } else {
        db.exec(migration.up)
      }
    } catch (e) {
      console.error(`Upgrade from version ${currentVersion} to version ${targetVersion} failed.`)
      throw e
    }
    setDatabaseVersion(db, targetVersion)
  }

  function downgrade() {
    const currentVersion = getDatabaseVersion(db)
    const targetVersion = currentVersion - 1

    const migration = migrations.find(x => x.version === currentVersion)
    if (!migration) throw new Error(`Cannot find migration for version ${targetVersion}`)

    try {
      if (isFunction(migration.down)) {
        migration.down(db)
      } else {
        db.exec(migration.down)
      }
    } catch (e) {
      console.error(`Downgrade from version ${currentVersion} to version ${targetVersion} failed.`)
      throw e
    }
    setDatabaseVersion(db, targetVersion)
  }
}

function getMaximumVersion(migrations: IMigration[]): number {
  return migrations.reduce((max, cur) => Math.max(cur.version, max), 0)
}

function getDatabaseVersion(db: Database): number {
  const result = db.prepare('PRAGMA user_version;').get()
  return result['user_version']
}

function setDatabaseVersion(db: Database, version: number): void {
  db.prepare(`PRAGMA user_version = ${ version }`).run()
}
