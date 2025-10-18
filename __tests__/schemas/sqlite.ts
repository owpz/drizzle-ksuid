import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { ksuidTextSqlite } from "../../src/drizzle-extension";

export const users = sqliteTable("users", {
  id: ksuidTextSqlite("id", { prefix: "usr_" }).primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const profiles = sqliteTable("profiles", {
  id: ksuidTextSqlite("id", { prefix: "prof_" }).primaryKey(),
  bio: text("bio"),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const posts = sqliteTable("posts", {
  id: ksuidTextSqlite("id", { prefix: "post_" }).primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  published: integer("published", { mode: "boolean" }).default(false),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const tags = sqliteTable("tags", {
  id: ksuidTextSqlite("id", { prefix: "tag_" }).primaryKey(),
  name: text("name").notNull().unique(),
});

export const postsTags = sqliteTable("posts_tags", {
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

export const products = sqliteTable("products", {
  id: ksuidTextSqlite("id", { prefix: "prod_" }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  category: text("category").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const orders = sqliteTable("orders", {
  id: ksuidTextSqlite("id", { prefix: "ord_" }).primaryKey(),
  total: real("total").notNull(),
  status: text("status").default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const orderItems = sqliteTable("order_items", {
  id: ksuidTextSqlite("id", { prefix: "item_" }).primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  posts: many(posts),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  postsTags: many(postsTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postsTags: many(postsTags),
}));

export const postsTagsRelations = relations(postsTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsTags.tagId],
    references: [tags.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
