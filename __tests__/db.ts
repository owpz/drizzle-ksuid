import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schemas/sqlite";

let db: BetterSQLite3Database<typeof schema> | null = null;
let sqlite: Database.Database | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

    // Create tables
    sqlite.exec(`
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
    `);
  }

  return db;
}

export function closeDb() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

export function resetDb() {
  if (sqlite) {
    // Clear all tables
    sqlite.exec(`
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
}
