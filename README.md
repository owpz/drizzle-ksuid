# @owpz/drizzle-ksuid

[![NPM Version](https://img.shields.io/npm/v/@owpz/drizzle-ksuid)](https://www.npmjs.com/package/@owpz/drizzle-ksuid)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-0.23.2+-green.svg)](https://orm.drizzle.team/)

A production-ready Drizzle ORM extension for generating K-Sortable Unique IDs (KSUIDs) as primary keys in your database models. Built on [@owpz/ksuid](https://github.com/owpz/ksuid) for 100% Go compatibility and high performance.

## 🚀 Quick Install (Recommended)

The fastest way to get going is to centralize your prefixes with `createKsuidHelpers` and reuse the generated helpers across your schema. The example below targets PostgreSQL, but the same pattern works for MySQL and SQLite by changing the dialect argument.

### 1. Install once

```bash
npm install @owpz/drizzle-ksuid
# or: yarn add @owpz/drizzle-ksuid
# or: pnpm add @owpz/drizzle-ksuid
```

### 2. Create a shared helper (e.g. `src/db/ksuid.ts`)

```typescript
import { createKsuidHelpers } from '@owpz/drizzle-ksuid';

export const { ksuid } = createKsuidHelpers(
  {
    User: 'usr_',
    Post: 'post_',
    Comment: 'cmt_',
  },
  'pg' // Change to 'mysql' or 'sqlite' as needed
);
```

### 3. Define tables with the helper

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { ksuid } from './ksuid';

export const users = pgTable('users', {
  id: ksuid('User').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: ksuid('Post').primaryKey(),
  title: text('title').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
});
```

### 4. Insert records—IDs are generated automatically

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

const [user] = await db.insert(schema.users).values({
  email: 'user@example.com',
  name: 'Quick Install User',
}).returning();

console.log(user.id); // usr_2KjMLqXZ9PfHqPnRlwu5NFNMB
```

> **Other dialects:** Pass `'mysql'` or `'sqlite'` to `createKsuidHelpers` and the returned helpers will use `VARCHAR` or `TEXT` defaults that suit each database automatically.

### Dialect Independence

Only the pieces you import are required at runtime. You can ship purely-MySQL code without Postgres or SQLite clients because:

- This library’s sole runtime dependency is `@owpz/ksuid`.
- Dialect helpers import the corresponding `drizzle-orm/*-core` modules, which match the database you already target.
- Database drivers such as `pg`, `mysql2`, or `better-sqlite3` are only dev-time dependencies for the example and test suite—you decide which driver to include in your application.

## 📋 Project Links

- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute, report issues, and submit pull requests
- **[Security Policy](SECURITY.md)** - How to report security vulnerabilities
- **[GitHub Issues](https://github.com/owpz/drizzle-ksuid/issues)** - Report bugs or request features
- **[NPM Package](https://www.npmjs.com/package/@owpz/drizzle-ksuid)** - Install the package

## What is a KSUID?

KSUID is for K-Sortable Unique IDentifier. It is a kind of globally unique identifier similar to a [RFC 4122 UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier), built from the ground-up to be "naturally" sorted by generation timestamp without any special type-aware logic.

**Key advantages over UUIDs:**

- **Time-sortable**: KSUIDs can be sorted chronologically, making them ideal for databases
- **Shorter**: More compact than UUIDs when encoded in base62 (27 vs 36 characters)
- **URL-friendly**: No special characters, making them safe for URLs and file names
- **Prefixable**: Can be prefixed with model-specific identifiers for better readability

For detailed KSUID documentation, see [@owpz/ksuid](https://github.com/owpz/ksuid).

## Quick Start

### 1. Install the package

```bash
npm install @owpz/drizzle-ksuid
# or
yarn add @owpz/drizzle-ksuid
# or
pnpm add @owpz/drizzle-ksuid
```

### 2. Define your schema with KSUID columns

**PostgreSQL:**

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { ksuidText } from '@owpz/drizzle-ksuid';

export const users = pgTable('users', {
  id: ksuidText('id', { prefix: 'usr_' }).primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: ksuidText('id', { prefix: 'post_' }).primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: text('author_id').notNull().references(() => users.id),
});
```

**MySQL:**

```typescript
import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { ksuidVarchar } from '@owpz/drizzle-ksuid';

export const users = mysqlTable('users', {
  id: ksuidVarchar('id', { prefix: 'usr_', length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**SQLite:**

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { ksuidTextSqlite } from '@owpz/drizzle-ksuid';

export const users = sqliteTable('users', {
  id: ksuidTextSqlite('id', { prefix: 'usr_' }).primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

### 3. Use your schema

```typescript
import { drizzle } from 'drizzle-orm/[your-adapter]';
import * as schema from './schema';

const db = drizzle(connection, { schema });

// Insert a user - ID will be auto-generated with usr_ prefix
const [user] = await db.insert(schema.users).values({
  email: 'user@example.com',
  name: 'John Doe'
}).returning();

console.log(user.id); // usr_2KjMLqXZ9PfHqPnRlwu5NFNMB
```

## Advanced Usage

### Using the Helper Factory

For managing multiple models with consistent prefixes, use `createKsuidHelpers`:

```typescript
import { pgTable, text } from 'drizzle-orm/pg-core';
import { createKsuidHelpers } from '@owpz/drizzle-ksuid';

const { ksuid } = createKsuidHelpers({
  User: 'usr_',
  Post: 'post_',
  Comment: 'cmt_',
  Product: 'prod_',
}, 'pg');

export const users = pgTable('users', {
  id: ksuid('User').primaryKey(),
  email: text('email').notNull(),
});

export const posts = pgTable('posts', {
  id: ksuid('Post').primaryKey(),
  title: text('title').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
});

export const comments = pgTable('comments', {
  id: ksuid('Comment').primaryKey(),
  content: text('content').notNull(),
  postId: text('post_id').notNull().references(() => posts.id),
});
```

### Dialect-Specific Exports

```typescript
// PostgreSQL
import { pg } from '@owpz/drizzle-ksuid';
const users = pgTable('users', {
  id: pg.ksuidText('id', { prefix: 'usr_' }).primaryKey(),
});

// MySQL
import { mysql } from '@owpz/drizzle-ksuid';
const users = mysqlTable('users', {
  id: mysql.ksuidVarchar('id', { prefix: 'usr_', length: 64 }).primaryKey(),
});

// SQLite
import { sqlite } from '@owpz/drizzle-ksuid';
const users = sqliteTable('users', {
  id: sqlite.ksuidText('id', { prefix: 'usr_' }).primaryKey(),
});
```

### Working with Relational Data

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { users, posts } from './schema';

const db = drizzle(connection);

// Create user and post in a transaction
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({
    email: 'author@example.com',
    name: 'Jane Author'
  }).returning();

  const [post] = await tx.insert(posts).values({
    title: 'My First Post',
    content: 'Hello, world!',
    authorId: user.id  // Use the generated KSUID
  }).returning();

  return { user, post };
});

console.log(result.user.id);  // usr_2KjMLqXZ9PfHqPnRlwu5NFNMB
console.log(result.post.id);  // post_2KjMLqZ1APfHqPnRlwu5NFNMC
```

### Batch Inserts

```typescript
const users = await db.insert(schema.users).values([
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
  { email: 'user3@example.com', name: 'User 3' },
]).returning();

// Each user gets a unique KSUID with usr_ prefix
users.forEach(user => {
  console.log(user.id); // usr_[unique-ksuid]
});
```

### Custom IDs (Migration Scenarios)

```typescript
// You can still provide custom IDs when needed
const [user] = await db.insert(users).values({
  id: 'usr_custom123456789012345678901',  // Custom ID
  email: 'legacy@example.com',
  name: 'Legacy User'
}).returning();

// Or let the library generate it automatically
const [newUser] = await db.insert(users).values({
  email: 'new@example.com',
  name: 'New User'
}).returning();
```

## API Reference

### Column Helpers

#### `ksuidText(name, options?)`
Creates a PostgreSQL text column with KSUID auto-generation.

**Parameters:**
- `name` (string): Column name
- `options.prefix` (string, optional): Prefix for the KSUID (default: `""`)

**Returns:** PostgreSQL text column builder

```typescript
ksuidText('id', { prefix: 'usr_' }).primaryKey()
```

#### `ksuidVarchar(name, options?)`
Creates a MySQL varchar column with KSUID auto-generation.

**Parameters:**
- `name` (string): Column name
- `options.prefix` (string, optional): Prefix for the KSUID (default: `""`)
- `options.length` (number, optional): VARCHAR length (default: `64`)

**Returns:** MySQL varchar column builder

```typescript
ksuidVarchar('id', { prefix: 'usr_', length: 64 }).primaryKey()
```

#### `ksuidTextMysql(name, options?)`
Creates a MySQL text column with KSUID auto-generation.

**Parameters:**
- `name` (string): Column name
- `options.prefix` (string, optional): Prefix for the KSUID (default: `""`)

**Returns:** MySQL text column builder

```typescript
ksuidTextMysql('id', { prefix: 'usr_' }).primaryKey()
```

#### `ksuidTextSqlite(name, options?)`
Creates an SQLite text column with KSUID auto-generation.

**Parameters:**
- `name` (string): Column name
- `options.prefix` (string, optional): Prefix for the KSUID (default: `""`)

**Returns:** SQLite text column builder

```typescript
ksuidTextSqlite('id', { prefix: 'usr_' }).primaryKey()
```

### `createKsuidHelpers(prefixMap, dialect?)`

Creates a factory function for generating KSUID columns with predefined prefixes.

**Parameters:**
- `prefixMap` (Record<string, string>): Map of model names to prefixes
- `dialect` ('pg' | 'mysql' | 'sqlite', optional): Database dialect (default: `'pg'`)

**Returns:** Object with helper methods

```typescript
const { ksuid } = createKsuidHelpers({
  User: 'usr_',
  Post: 'post_'
}, 'pg');

// Use in schema
id: ksuid('User').primaryKey()
```

### Dialect-Specific Exports

#### `pg.ksuidText(name, options?)`
PostgreSQL-specific export for KSUID text columns.

#### `mysql.ksuidVarchar(name, options?)` & `mysql.ksuidText(name, options?)`
MySQL-specific exports for KSUID varchar and text columns.

#### `sqlite.ksuidText(name, options?)`
SQLite-specific export for KSUID text columns.

### `generateKSUID(prefix?)` ⚠️ DEPRECATED

> **Deprecated**: Use [@owpz/ksuid](https://github.com/owpz/ksuid) directly instead.

Generates a standalone KSUID with optional prefix.

```typescript
// ❌ Deprecated
import { generateKSUID } from '@owpz/drizzle-ksuid';
const id = generateKSUID('usr_');

// ✅ Recommended
import { KSUID } from '@owpz/ksuid';
const id = 'usr_' + KSUID.random().toString();
```

## Features

✅ **Auto-generation**: KSUIDs generated automatically via Drizzle's `$defaultFn`
✅ **Multi-database**: PostgreSQL, MySQL, and SQLite support
✅ **Batch inserts**: Full support for bulk operations
✅ **Custom prefixes**: Model-specific prefixes for better readability
✅ **Type-safe**: Full TypeScript support with proper type inference
✅ **Transactions**: Works seamlessly within Drizzle transactions
✅ **Custom IDs**: Optionally provide your own IDs
✅ **Time-sortable**: Chronologically sortable IDs out of the box
✅ **Zero dependencies**: Relies only on @owpz/ksuid for ID generation

## Comparison with UUID/CUID

| Feature | KSUID | UUID v4 | CUID |
|---------|-------|---------|------|
| Length | 27 chars | 36 chars | 25 chars |
| Time-sortable | ✅ Yes | ❌ No | ✅ Yes |
| URL-safe | ✅ Yes | ⚠️ Contains `-` | ✅ Yes |
| Collision-resistant | ✅ High | ✅ High | ✅ High |
| Prefixable | ✅ Easy | ⚠️ Harder | ⚠️ Harder |
| Database indexing | ✅ Excellent | ⚠️ Poor | ✅ Good |

## License

This package is released under the [MIT License](LICENSE).

Copyright (c) 2025 Apex Innovations, Inc.
