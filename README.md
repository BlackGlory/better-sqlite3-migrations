# better-sqlite3-migrations
A utility for database migrations with [better-sqlite3].

The module using [user_version] to record the schema version.

[better-sqlite3]: https://www.npmjs.com/package/better-sqlite3
[user_version]: https://www.sqlite.org/pragma.html#pragma_user_version

## Install

```sh
npm install --save @blackglory/better-sqlite3-migrations
# or
yarn add @blackglory/better-sqlite3-migrations
```

## API

### Migration

```ts
interface Migration {
  version: number
  up: string | ((db: Database) => void)
  down: string | ((db: Database) => void)
}
```

### migrate

```ts
function migrate(db: Database, migrations: Migration[], targetVersion?: number): void
```

If targetVersion is `undefined`, then use the maximum version of migrations.
