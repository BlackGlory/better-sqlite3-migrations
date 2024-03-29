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
```ts
interface IMigration {
  version: number
  up: string | ((db: Database) => void)
  down: string | ((db: Database) => void)
}
```

You may need [migration-files].

[migration-files]: https://github.com/BlackGlory/migration-files

### migrate
```ts
function migrate(db: Database, migrations: IMigration[], targetVersion?: number): void
```

If targetVersion is `undefined`, then use the maximum version of migrations.

## FAQ
### Can multiple instances migrate in parallel?
Yes, the `user_version` update is visible to every database connection.
When the maximum migration version is less than the `user_version` (which means it is an obsolete instance), it will skip the migration.

You may need a proper retry strategy,
because each migration uses `BEGIN IMMEDIATE` to ensure that parallel write transactions fail early.
