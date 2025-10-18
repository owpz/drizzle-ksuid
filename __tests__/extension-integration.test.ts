import { getDb, resetDb, closeDb } from "./db";
import * as schema from "./schemas/sqlite";
import { KSUID } from "@owpz/ksuid";

describe("Extension Integration Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  test("generates KSUIDs with correct prefixes for create operations", async () => {
    const user = await db.insert(schema.users).values({
      email: "test@example.com",
      name: "Test User",
    }).returning();

    expect(user[0].id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
    expect(user[0].id.startsWith("usr_")).toBe(true);
    expect(user[0].id.length).toBe(31); // 4 char prefix + 27 char KSUID

    const post = await db.insert(schema.posts).values({
      title: "Test Post",
      content: "Test content",
      published: false,
      authorId: user[0].id,
    }).returning();

    expect(post[0].id).toMatch(/^post_[a-zA-Z0-9]{27}$/);
    expect(post[0].id.startsWith("post_")).toBe(true);
    expect(post[0].id.length).toBe(32); // 5 char prefix + 27 char KSUID

    const product = await db.insert(schema.products).values({
      name: "Test Product",
      price: 99.99,
      category: "Electronics",
    }).returning();

    expect(product[0].id).toMatch(/^prod_[a-zA-Z0-9]{27}$/);
    expect(product[0].id.startsWith("prod_")).toBe(true);
    expect(product[0].id.length).toBe(32); // 5 char prefix + 27 char KSUID
  });

  test("handles batch insert operations", async () => {
    const users = await db.insert(schema.users).values([
      { email: "user1@example.com", name: "User 1" },
      { email: "user2@example.com", name: "User 2" },
      { email: "user3@example.com", name: "User 3" },
    ]).returning();

    expect(users).toHaveLength(3);
    users.forEach((user) => {
      expect(user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
      expect(user.id.startsWith("usr_")).toBe(true);
    });

    // Verify all IDs are unique
    const uniqueIds = new Set(users.map((u) => u.id));
    expect(uniqueIds.size).toBe(3);
  });

  test("handles relational inserts with transactions", async () => {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.users).values({
        email: "nested@example.com",
        name: "Nested User",
      }).returning();

      const [profile] = await tx.insert(schema.profiles).values({
        bio: "I love testing nested creates!",
        userId: user.id,
      }).returning();

      const [post] = await tx.insert(schema.posts).values({
        title: "Nested Post",
        content: "Nested content",
        published: true,
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
      email: "custom-id@example.com",
      name: "Custom ID User",
    }).returning();

    expect(user.id).toBe(customId);
  });

  describe("Concurrency Tests", () => {
    test("handles concurrent creates without ID collision", async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        db.insert(schema.users).values({
          email: `concurrent${i}@example.com`,
          name: `Concurrent User ${i}`,
        }).returning()
      );

      const results = await Promise.all(promises);
      const users = results.map((r) => r[0]);
      const ids = users.map((u) => u.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);

      users.forEach((user) => {
        expect(user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
      });
    });

    test("handles concurrent nested creates in transactions", async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        db.transaction(async (tx) => {
          const [user] = await tx.insert(schema.users).values({
            email: `nested-concurrent${i}@example.com`,
            name: `Nested Concurrent User ${i}`,
          }).returning();

          const [profile] = await tx.insert(schema.profiles).values({
            bio: `Bio for user ${i}`,
            userId: user.id,
          }).returning();

          const [post] = await tx.insert(schema.posts).values({
            title: `Post by user ${i}`,
            content: `Content from user ${i}`,
            published: i % 2 === 0,
            authorId: user.id,
          }).returning();

          return { user, profile, post };
        })
      );

      const results = await Promise.all(promises);

      const allIds = new Set<string>();
      results.forEach(({ user, profile, post }) => {
        allIds.add(user.id);
        allIds.add(profile.id);
        allIds.add(post.id);
      });

      expect(allIds.size).toBe(60); // 20 users + 20 profiles + 20 posts

      results.forEach(({ user, profile, post }) => {
        expect(user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
        expect(profile.id).toMatch(/^prof_[a-zA-Z0-9]{27}$/);
        expect(post.id).toMatch(/^post_[a-zA-Z0-9]{27}$/);
      });
    });

    test("handles race conditions in batch inserts", async () => {
      const batches = Array.from({ length: 10 }, (_, batchIndex) =>
        db.insert(schema.users).values(
          Array.from({ length: 10 }, (_, userIndex) => ({
            email: `batch${batchIndex}-user${userIndex}@example.com`,
            name: `Batch ${batchIndex} User ${userIndex}`,
          }))
        ).returning()
      );

      const results = await Promise.all(batches);
      const allUsers = results.flat();
      expect(allUsers).toHaveLength(100);

      const ids = new Set(allUsers.map((u) => u.id));
      expect(ids.size).toBe(100);
    });
  });

  describe("Complex Integration Scenarios", () => {
    test("handles complex business workflow", async () => {
      const products = await db.insert(schema.products).values([
        { name: "Laptop", price: 999.99, category: "Electronics" },
        { name: "Mouse", price: 29.99, category: "Electronics" },
        { name: "Keyboard", price: 79.99, category: "Electronics" },
      ]).returning();

      expect(products).toHaveLength(3);
      products.forEach((p) => {
        expect(p.id).toMatch(/^prod_[a-zA-Z0-9]{27}$/);
      });

      const [user] = await db.insert(schema.users).values({
        email: "shopper@example.com",
        name: "Happy Shopper",
      }).returning();

      const [order] = await db.insert(schema.orders).values({
        total: 1109.97,
        status: "pending",
      }).returning();

      const items = await db.insert(schema.orderItems).values(
        products.map((product) => ({
          orderId: order.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
        }))
      ).returning();

      expect(order.id).toMatch(/^ord_[a-zA-Z0-9]{27}$/);
      expect(items).toHaveLength(3);
      items.forEach((item) => {
        expect(item.id).toMatch(/^item_[a-zA-Z0-9]{27}$/);
      });
    });

    test("handles data migration scenario", async () => {
      const existingUsers = await Promise.all([
        db.insert(schema.users).values({
          id: "usr_existing001",
          email: "old1@example.com",
          name: "Old User 1",
        }).returning(),
        db.insert(schema.users).values({
          id: "usr_existing002",
          email: "old2@example.com",
          name: "Old User 2",
        }).returning(),
      ]);

      existingUsers.forEach(([user]) => {
        expect(user.id).toMatch(/^usr_existing/);
      });

      const newUsers = await Promise.all([
        db.insert(schema.users).values({
          email: "new1@example.com",
          name: "New User 1",
        }).returning(),
        db.insert(schema.users).values({
          email: "new2@example.com",
          name: "New User 2",
        }).returning(),
      ]);

      newUsers.forEach(([user]) => {
        expect(user.id).toMatch(/^usr_[a-zA-Z0-9]{27}$/);
        expect(user.id).not.toMatch(/^usr_existing/);
      });

      const allUsers = await db.select().from(schema.users);
      expect(allUsers).toHaveLength(4);
    });

    test("handles KSUID chronological properties", async () => {
      const orders = [];

      for (let i = 0; i < 5; i++) {
        const [order] = await db.insert(schema.orders).values({
          total: (i + 1) * 100,
          status: "completed",
        }).returning();

        orders.push(order);

        await new Promise((resolve) => setTimeout(resolve, 1100));
      }

      const ksuidStrings = orders.map((o) => o.id.slice(4)); // Remove prefix
      const ksuids = ksuidStrings.map((s) => KSUID.parse(s));

      for (let i = 1; i < ksuids.length; i++) {
        const prev = ksuids[i - 1];
        const curr = ksuids[i];
        expect(curr.compare(prev)).toBeGreaterThan(0);
      }

      const sortedIds = [...orders.map((o) => o.id)].sort();
      const originalIds = orders.map((o) => o.id);
      expect(sortedIds).toEqual(originalIds);
    });
  });
});
