# How to use Drizzle KSUID Extension

This example shows a complete implementation using the KSUID Extension with Drizzle ORM.

## Project Structure

```
src/
├── db/
│   └── schema.ts
└── lib/
    └── db.ts
```

## db/schema.ts

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { ksuidText } from '@owpz/drizzle-ksuid';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: ksuidText('id', { prefix: 'usr_' }).primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: ksuidText('id', { prefix: 'post_' }).primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

## lib/db.ts

### Using Drizzle Client

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

## Usage in your application

```typescript
import { db } from './lib/db';
import { users, posts } from './db/schema';

// Create a user - ID will be generated as "usr_2KjMLqXZ9PfHqPnRlwu5NFNMB"
const [user] = await db.insert(users).values({
  name: 'John Doe',
  email: 'john@example.com',
}).returning();

// Create a post - ID will be generated as "post_2KjMLqZ1APfHqPnRlwu5NFNMC"
const [post] = await db.insert(posts).values({
  title: 'Hello World',
  content: 'This is my first post!',
  authorId: user.id,
}).returning();

console.log('User ID:', user.id);
console.log('Post ID:', post.id);
```

## Using the Helper Factory

For managing multiple models with a centralized prefix configuration:

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createKsuidHelpers } from '@owpz/drizzle-ksuid';

const { ksuid } = createKsuidHelpers({
  User: 'usr_',
  Post: 'post_',
  PaymentIntent: 'pi_',
  Customer: 'cus_',
}, 'pg');

export const users = pgTable('users', {
  id: ksuid('User').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: ksuid('Post').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentIntents = pgTable('payment_intents', {
  id: ksuid('PaymentIntent').primaryKey(),
  amount: text('amount').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

## Advanced: Using with Transactions

```typescript
import { db } from './lib/db';
import { users, posts } from './db/schema';

const result = await db.transaction(async (tx) => {
  // Create user
  const [user] = await tx.insert(users).values({
    name: 'Jane Author',
    email: 'jane@example.com',
  }).returning();

  // Create multiple posts for the user
  const newPosts = await tx.insert(posts).values([
    {
      title: 'First Post',
      content: 'Content for first post',
      authorId: user.id,
    },
    {
      title: 'Second Post',
      content: 'Content for second post',
      authorId: user.id,
    },
  ]).returning();

  return { user, posts: newPosts };
});

console.log('Created user:', result.user.id);
console.log('Created posts:', result.posts.map(p => p.id));
```

## Environment Setup

Create a `.env` file with your database connection:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

## Drizzle Kit Configuration

Create a `drizzle.config.ts` file:

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## Generate and Run Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Push changes to database
npx drizzle-kit push

# Or run migrations
npx drizzle-kit migrate
```
