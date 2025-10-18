import { pgTable, text, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ksuidText } from "../../src/drizzle-extension";

export const users = pgTable("users", {
  id: ksuidText("id", { prefix: "usr_" }).primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: ksuidText("id", { prefix: "prof_" }).primaryKey(),
  bio: text("bio"),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const posts = pgTable("posts", {
  id: ksuidText("id", { prefix: "post_" }).primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  published: boolean("published").default(false),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: ksuidText("id", { prefix: "tag_" }).primaryKey(),
  name: text("name").notNull().unique(),
});

export const postsTags = pgTable("posts_tags", {
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

export const products = pgTable("products", {
  id: ksuidText("id", { prefix: "prod_" }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  category: text("category").notNull(),
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
