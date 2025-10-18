import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schemas/mysql";

const DATABASE_URL = process.env.MYSQL_URL || "mysql://testuser:testpass@localhost:3306/testdb";

describe("E2E MySQL Tests", () => {
  let connection: mysql.Connection;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    connection = await mysql.createConnection(DATABASE_URL);
    db = drizzle(connection, { schema, mode: "default" });

    // Create tables
    await connection.execute(`DROP TABLE IF EXISTS posts`);
    await connection.execute(`DROP TABLE IF EXISTS profiles`);
    await connection.execute(`DROP TABLE IF EXISTS products`);
    await connection.execute(`DROP TABLE IF EXISTS tags`);
    await connection.execute(`DROP TABLE IF EXISTS users`);

    await connection.execute(`
      CREATE TABLE users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE profiles (
        id VARCHAR(64) PRIMARY KEY,
        bio TEXT,
        user_id VARCHAR(64) NOT NULL UNIQUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE posts (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT FALSE,
        author_id VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE tags (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      )
    `);

    await connection.execute(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DOUBLE NOT NULL,
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(async () => {
    await connection.end();
  });

  afterEach(async () => {
    await connection.execute(`SET FOREIGN_KEY_CHECKS = 0`);
    await connection.execute(`TRUNCATE TABLE posts`);
    await connection.execute(`TRUNCATE TABLE profiles`);
    await connection.execute(`TRUNCATE TABLE products`);
    await connection.execute(`TRUNCATE TABLE tags`);
    await connection.execute(`TRUNCATE TABLE users`);
    await connection.execute(`SET FOREIGN_KEY_CHECKS = 1`);
  });

  test("generates KSUIDs with correct prefixes for users (VARCHAR)", async () => {
    const [user] = await db.insert(schema.users).values({
      email: "test@example.com",
      name: "Test User",
    }).$returningId();

    const [fetchedUser] = await db.select().from(schema.users).where((users, { eq }) => eq(users.email, "test@example.com"));

    expect(fetchedUser.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
    expect(fetchedUser.id.startsWith("usr_")).toBe(true);
    expect(fetchedUser.id.length).toBe(31);
  });

  test("generates KSUIDs for products (TEXT column)", async () => {
    const [product] = await db.insert(schema.products).values({
      name: "Test Product",
      price: 99.99,
      category: "Electronics",
    }).$returningId();

    const [fetchedProduct] = await db.select().from(schema.products).limit(1);

    expect(fetchedProduct.id).toMatch(/^prod_[a-zA-Z0-9]{27}$/);
    expect(fetchedProduct.id.startsWith("prod_")).toBe(true);
  });

  test("generates KSUIDs for posts", async () => {
    const [user] = await db.insert(schema.users).values({
      email: "author@example.com",
      name: "Author",
    }).$returningId();

    const [fetchedUser] = await db.select().from(schema.users).where((users, { eq }) => eq(users.email, "author@example.com"));

    const [post] = await db.insert(schema.posts).values({
      title: "Test Post",
      content: "Test content",
      authorId: fetchedUser.id,
    }).$returningId();

    const [fetchedPost] = await db.select().from(schema.posts).limit(1);

    expect(fetchedPost.id).toMatch(/^post_[a-zA-Z0-9]{27}$/);
    expect(fetchedPost.id.startsWith("post_")).toBe(true);
  });

  test("handles batch inserts", async () => {
    await db.insert(schema.users).values([
      { email: "user1@example.com", name: "User 1" },
      { email: "user2@example.com", name: "User 2" },
      { email: "user3@example.com", name: "User 3" },
    ]);

    const users = await db.select().from(schema.users);

    expect(users).toHaveLength(3);
    users.forEach((user) => {
      expect(user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
    });

    const uniqueIds = new Set(users.map((u) => u.id));
    expect(uniqueIds.size).toBe(3);
  });

  test("handles transactions with multiple inserts", async () => {
    await db.transaction(async (tx) => {
      await tx.insert(schema.users).values({
        email: "transactional@example.com",
        name: "Transactional User",
      });

      const [user] = await tx.select().from(schema.users).where((users, { eq }) => eq(users.email, "transactional@example.com"));

      await tx.insert(schema.profiles).values({
        bio: "Test bio",
        userId: user.id,
      });

      await tx.insert(schema.posts).values({
        title: "Transactional Post",
        content: "Content",
        authorId: user.id,
      });
    });

    const users = await db.select().from(schema.users);
    const profiles = await db.select().from(schema.profiles);
    const posts = await db.select().from(schema.posts);

    expect(users[0].id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
    expect(profiles[0].id).toMatch(/^prof_[a-zA-Z0-9]{27}$/);
    expect(posts[0].id).toMatch(/^post_[a-zA-Z0-9]{27}$/);
  });

  test("preserves custom IDs when provided", async () => {
    const customId = "usr_custom123456789012345678901";

    await db.insert(schema.users).values({
      id: customId,
      email: "custom@example.com",
      name: "Custom ID User",
    });

    const [user] = await db.select().from(schema.users).where((users, { eq }) => eq(users.id, customId));

    expect(user.id).toBe(customId);
  });

  test("handles concurrent inserts without collision", async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      db.insert(schema.users).values({
        email: `concurrent${i}@example.com`,
        name: `Concurrent User ${i}`,
      })
    );

    await Promise.all(promises);

    const users = await db.select().from(schema.users);
    const ids = users.map((u) => u.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(50);
  });

  test("verifies relational queries work with KSUIDs", async () => {
    await db.insert(schema.users).values({
      email: "relational@example.com",
      name: "Relational User",
    });

    const [user] = await db.select().from(schema.users).where((users, { eq }) => eq(users.email, "relational@example.com"));

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
