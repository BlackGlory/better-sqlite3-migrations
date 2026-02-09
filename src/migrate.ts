import type { Database } from 'better-sqlite3'
import { isFunction } from '@blackglory/types'
import { assert } from '@blackglory/errors'
import { withLazyStatic, lazyStatic } from 'extra-lazy'

export interface IMigration {
  version: number
  up: string | ((db: Database) => void)
  down: string | ((db: Database) => void)
}

export const migrate: (
  db: Database
, migrations: IMigration[]
, targetVersion?: number | undefined
) => void
= withLazyStatic(function (
  db: Database
, migrations: IMigration[]
, targetVersion: number = getMaximumVersion(migrations)
): void {
  const maxVersion = getMaximumVersion(migrations)

  const migrate = lazyStatic(() => db.transaction((
    targetVersion: number
  , maxVersion: number
  ): boolean => {
    const currentVersion = getDatabaseVersion(db)

    if (maxVersion < currentVersion) {
      return true
    } else {
      if (currentVersion === targetVersion) {
        return true
      } else if (currentVersion < targetVersion) {
        upgrade()
        return false
      } else {
        downgrade()
        return false
      }
    }
  }), [db])

  while (true) {
    const done = migrate.immediate(targetVersion, maxVersion)
    if (done) break
  }

  function upgrade(): void {
    const currentVersion = getDatabaseVersion(db)
    const targetVersion = currentVersion + 1

    const migration = migrations.find(x => x.version === targetVersion)
    assert(migration, `Cannot find migration for version ${targetVersion}`)

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

  function downgrade(): void {
    const currentVersion = getDatabaseVersion(db)
    const targetVersion = currentVersion - 1

    const migration = migrations.find(x => x.version === currentVersion)
    assert(migration, `Cannot find migration for version ${targetVersion}`)

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
})

function getMaximumVersion(migrations: IMigration[]): number {
  return migrations.reduce((max, cur) => Math.max(cur.version, max), 0)
}

const getDatabaseVersion = withLazyStatic((db: Database): number => {
  const result = lazyStatic(() => db.prepare('PRAGMA user_version;'), [db]).get() as { user_version: number }
  return result['user_version']
})

function setDatabaseVersion(db: Database, version: number): void {
  // PRAGMA不支持变量
  db.exec(`PRAGMA user_version = ${ version }`)
}
