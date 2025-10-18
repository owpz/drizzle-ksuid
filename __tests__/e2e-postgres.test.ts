import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "./schemas/postgres";

const DATABASE_URL = process.env.POSTGRES_URL || "postgresql://testuser:testpass@localhost:5432/testdb";

describe("E2E PostgreSQL Tests", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: DATABASE_URL,
    });

    db = drizzle(pool, { schema });

    // Create tables
    await pool.query(`
      DROP TABLE IF EXISTS posts_tags CASCADE;
      DROP TABLE IF EXISTS tags CASCADE;
      DROP TABLE IF EXISTS posts CASCADE;
      DROP TABLE IF EXISTS profiles CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        bio TEXT,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT FALSE,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE posts_tags (
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(`
      TRUNCATE TABLE posts_tags, tags, posts, profiles, products, users CASCADE;
    `);
  });

  test("generates KSUIDs with correct prefixes for users", async () => {
    const [user] = await db.insert(schema.users).values({
      email: "test@example.com",
      name: "Test User",
    }).returning();

    expect(user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
    expect(user.id.startsWith("usr_")).toBe(true);
    expect(user.id.length).toBe(31);
    expect(user.email).toBe("test@example.com");
  });

  test("generates KSUIDs for posts", async () => {
    const [user] = await db.insert(schema.users).values({
      email: "author@example.com",
      name: "Author",
    }).returning();

    const [post] = await db.insert(schema.posts).values({
      title: "Test Post",
      content: "Test content",
      authorId: user.id,
    }).returning();

    expect(post.id).toMatch(/^post_[a-zA-Z0-9]{27}$/);
    expect(post.id.startsWith("post_")).toBe(true);
  });

  test("generates KSUIDs for products", async () => {
    const [product] = await db.insert(schema.products).values({
      name: "Test Product",
      price: 99.99,
      category: "Electronics",
    }).returning();

    expect(product.id).toMatch(/^prod_[a-zA-Z0-9]{27}$/);
    expect(product.id.startsWith("prod_")).toBe(true);
  });

  test("handles batch inserts", async () => {
    const users = await db.insert(schema.users).values([
      { email: "user1@example.com", name: "User 1" },
      { email: "user2@example.com", name: "User 2" },
      { email: "user3@example.com", name: "User 3" },
    ]).returning();

    expect(users).toHaveLength(3);
    users.forEach((user) => {
      expect(user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
    });

    const uniqueIds = new Set(users.map((u) => u.id));
    expect(uniqueIds.size).toBe(3);
  });

  test("handles transactions with multiple inserts", async () => {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.users).values({
        email: "transactional@example.com",
        name: "Transactional User",
      }).returning();

      const [profile] = await tx.insert(schema.profiles).values({
        bio: "Test bio",
        userId: user.id,
      }).returning();

      const [post] = await tx.insert(schema.posts).values({
        title: "Transactional Post",
        content: "Content",
        authorId: user.id,
      }).returning();

      return { user, profile, post };
    });

    expect(result.user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
    expect(result.profile.id).toMatch(/^prof_[a-zA-Z0-9]{27}$/);
    expect(result.post.id).toMatch(/^post_[a-zA-Z0-9]{27}$/);
  });

  test("preserves custom IDs when provided", async () => {
    const customId = "usr_custom123456789012345678901";

    const [user] = await db.insert(schema.users).values({
      id: customId,
      email: "custom@example.com",
      name: "Custom ID User",
    }).returning();

    expect(user.id).toBe(customId);
  });

  test("handles concurrent inserts without collision", async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      db.insert(schema.users).values({
        email: `concurrent${i}@example.com`,
        name: `Concurrent User ${i}`,
      }).returning()
    );

    const results = await Promise.all(promises);
    const users = results.map((r) => r[0]);
    const ids = users.map((u) => u.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(50);
  });

  test("verifies relational queries work with KSUIDs", async () => {
    const [user] = await db.insert(schema.users).values({
      email: "relational@example.com",
      name: "Relational User",
    }).returning();

    await db.insert(schema.profiles).values({
      bio: "Test bio for relational query",
      userId: user.id,
    });

    await db.insert(schema.posts).values([
      { title: "Post 1", content: "Content 1", authorId: user.id },
      { title: "Post 2", content: "Content 2", authorId: user.id },
    ]);

    const userWithPosts = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
      with: {
        posts: true,
        profile: true,
      },
    });

    expect(userWithPosts).toBeDefined();
    expect(userWithPosts?.posts).toHaveLength(2);
    expect(userWithPosts?.profile).toBeDefined();
  });
});
