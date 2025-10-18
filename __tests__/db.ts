import { drizzle as drizzleBetterSqlite, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleSqlJs, type SQLJsDatabase } from "drizzle-orm/sql-js";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import type { Database as SqlJsDatabaseType, InitSqlJsStatic, SqlJsStatic } from "sql.js";
import * as schema from "./schemas/sqlite";

type TestDatabase = BetterSQLite3Database<typeof schema> | SQLJsDatabase<typeof schema>;
type SqliteClient = BetterSqliteDatabase | SqlJsDatabaseType;
type SqliteRuntime = "better-sqlite3" | "sql.js";

let dbInstance: TestDatabase | null = null;
let dbPromise: Promise<TestDatabase> | null = null;
let sqliteClient: SqliteClient | null = null;
let runtime: SqliteRuntime | null = null;

const DDL_STATEMENTS = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    bio TEXT,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    published INTEGER DEFAULT 0,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS posts_tags (
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL
  );
`;

function ensureClient(): SqliteClient {
  if (!sqliteClient) {
    throw new Error("SQLite client has not been initialised. Call getDb() before invoking this helper.");
  }
  return sqliteClient;
}

function initialiseSchema(client: SqliteClient) {
  client.exec(DDL_STATEMENTS);
}

async function createBetterSqliteDb(): Promise<TestDatabase> {
  const mod = await import("better-sqlite3");
  const DatabaseCtor: any = (mod as any).default ?? mod;
  const client: BetterSqliteDatabase = new DatabaseCtor(":memory:");

  runtime = "better-sqlite3";
  sqliteClient = client;

  const db = drizzleBetterSqlite(client, { schema });
  initialiseSchema(client);
  return db;
}

async function createSqlJsDb(): Promise<TestDatabase> {
  const mod = await import("sql.js");
  const initSqlJs: InitSqlJsStatic = ((mod as any).default ?? mod) as InitSqlJsStatic;
  const SQL: SqlJsStatic = await initSqlJs({
    locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`),
  });

  const client: SqlJsDatabaseType = new SQL.Database();

  runtime = "sql.js";
  sqliteClient = client;

  const db = drizzleSqlJs(client, { schema });
  initialiseSchema(client);
  return db;
}

async function initialiseDatabase(): Promise<TestDatabase> {
  try {
    const db = await createBetterSqliteDb();
    dbInstance = db;
    return db;
  } catch (betterError) {
    try {
      const db = await createSqlJsDb();
      dbInstance = db;
      return db;
    } catch (sqlJsError) {
      const aggregate = new Error("Failed to initialise SQLite test database using better-sqlite3 or sql.js");
      (aggregate as Error & { cause?: unknown }).cause = { betterError, sqlJsError };
      throw aggregate;
    }
  }
}

export async function getDb(): Promise<TestDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!dbPromise) {
    dbPromise = initialiseDatabase();
  }

  dbInstance = await dbPromise;
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (!sqliteClient) {
    return;
  }

  if (runtime === "better-sqlite3") {
    (sqliteClient as BetterSqliteDatabase).close();
  } else if (runtime === "sql.js") {
    (sqliteClient as SqlJsDatabaseType).close();
  }

  sqliteClient = null;
  dbInstance = null;
  dbPromise = null;
  runtime = null;
}

export async function resetDb(): Promise<void> {
  if (!sqliteClient) {
    return;
  }

  ensureClient().exec(`
    DELETE FROM posts_tags;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM products;
    DELETE FROM tags;
    DELETE FROM posts;
    DELETE FROM profiles;
    DELETE FROM users;
  `);
}
