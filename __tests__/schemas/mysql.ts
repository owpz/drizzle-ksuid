import { mysqlTable, varchar, text, timestamp, double, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { ksuidVarchar, ksuidTextMysql } from "../../src/drizzle-extension";

export const users = mysqlTable("users", {
  id: ksuidVarchar("id", { prefix: "usr_", length: 64 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = mysqlTable("profiles", {
  id: ksuidVarchar("id", { prefix: "prof_", length: 64 }).primaryKey(),
  bio: text("bio"),
  userId: varchar("user_id", { length: 64 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const posts = mysqlTable("posts", {
  id: ksuidVarchar("id", { prefix: "post_", length: 64 }).primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  published: boolean("published").default(false),
  authorId: varchar("author_id", { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tags = mysqlTable("tags", {
  id: ksuidVarchar("id", { prefix: "tag_", length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
});

export const products = mysqlTable("products", {
  id: ksuidTextMysql("id", { prefix: "prod_" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: double("price").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
