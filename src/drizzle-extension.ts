import { generateKSUID } from "./util/ksuid";
import { text as pgText } from "drizzle-orm/pg-core";
import { varchar as mysqlVarchar, text as mysqlText } from "drizzle-orm/mysql-core";
import { text as sqliteText } from "drizzle-orm/sqlite-core";

type PrefixMap = Record<string, string>;

interface KsuidColumnOptions {
  prefix?: string;
}

interface KsuidVarcharOptions extends KsuidColumnOptions {
  length?: number;
}

/**
 * PostgreSQL KSUID text column
 * Creates a text column that automatically generates KSUIDs with an optional prefix
 *
 * @param name - Column name in the database
 * @param options - Configuration options
 * @returns A PostgreSQL text column builder with KSUID default function
 *
 * @example
 * ```typescript
 * import { pgTable } from 'drizzle-orm/pg-core';
 * import { ksuidText } from '@owpz/drizzle-ksuid/pg';
 *
 * const users = pgTable('users', {
 *   id: ksuidText('id', { prefix: 'usr_' }).primaryKey(),
 * });
 * ```
 */
export function ksuidText(name: string, options: KsuidColumnOptions = {}) {
  const { prefix = "" } = options;
  return pgText(name).$defaultFn(() => generateKSUID(prefix));
}

/**
 * MySQL varchar KSUID column
 * Creates a varchar column that automatically generates KSUIDs with an optional prefix
 *
 * @param name - Column name in the database
 * @param options - Configuration options including optional length
 * @returns A MySQL varchar column builder with KSUID default function
 *
 * @example
 * ```typescript
 * import { mysqlTable } from 'drizzle-orm/mysql-core';
 * import { ksuidVarchar } from '@owpz/drizzle-ksuid/mysql';
 *
 * const users = mysqlTable('users', {
 *   id: ksuidVarchar('id', { prefix: 'usr_', length: 64 }).primaryKey(),
 * });
 * ```
 */
export function ksuidVarchar(name: string, options: KsuidVarcharOptions = {}) {
  const { prefix = "", length = 64 } = options;
  return mysqlVarchar(name, { length }).$defaultFn(() => generateKSUID(prefix));
}

/**
 * MySQL text KSUID column
 * Creates a text column that automatically generates KSUIDs with an optional prefix
 *
 * @param name - Column name in the database
 * @param options - Configuration options
 * @returns A MySQL text column builder with KSUID default function
 *
 * @example
 * ```typescript
 * import { mysqlTable } from 'drizzle-orm/mysql-core';
 * import { ksuidTextMysql } from '@owpz/drizzle-ksuid/mysql';
 *
 * const users = mysqlTable('users', {
 *   id: ksuidTextMysql('id', { prefix: 'usr_' }).primaryKey(),
 * });
 * ```
 */
export function ksuidTextMysql(name: string, options: KsuidColumnOptions = {}) {
  const { prefix = "" } = options;
  return mysqlText(name).$defaultFn(() => generateKSUID(prefix));
}

/**
 * SQLite KSUID text column
 * Creates a text column that automatically generates KSUIDs with an optional prefix
 *
 * @param name - Column name in the database
 * @param options - Configuration options
 * @returns A SQLite text column builder with KSUID default function
 *
 * @example
 * ```typescript
 * import { sqliteTable } from 'drizzle-orm/sqlite-core';
 * import { ksuidTextSqlite } from '@owpz/drizzle-ksuid/sqlite';
 *
 * const users = sqliteTable('users', {
 *   id: ksuidTextSqlite('id', { prefix: 'usr_' }).primaryKey(),
 * });
 * ```
 */
export function ksuidTextSqlite(name: string, options: KsuidColumnOptions = {}) {
  const { prefix = "" } = options;
  return sqliteText(name).$defaultFn(() => generateKSUID(prefix));
}

/**
 * Create KSUID column helpers for multiple models with a prefix map
 * This factory function creates a set of helpers bound to your prefix configuration
 *
 * @param prefixMap - Map of model names to their KSUID prefixes
 * @param dialect - Database dialect ('pg' | 'mysql' | 'sqlite')
 * @returns Object with helper functions for creating KSUID columns
 *
 * @example
 * ```typescript
 * import { createKsuidHelpers } from '@owpz/drizzle-ksuid';
 *
 * const { ksuid } = createKsuidHelpers({
 *   User: 'usr_',
 *   Post: 'post_',
 *   Comment: 'cmt_'
 * }, 'pg');
 *
 * const users = pgTable('users', {
 *   id: ksuid('User').primaryKey(),
 * });
 *
 * const posts = pgTable('posts', {
 *   id: ksuid('Post').primaryKey(),
 * });
 * ```
 */
type Dialect = "pg" | "mysql" | "sqlite";
type PrefixGetter = (modelName: string) => string;

type PgHelpers = {
  ksuid(modelName: string, columnName?: string): ReturnType<typeof ksuidText>;
};

type MysqlHelpers = {
  ksuid(modelName: string, columnName?: string, length?: number): ReturnType<typeof ksuidVarchar>;
  ksuidText(modelName: string, columnName?: string): ReturnType<typeof ksuidTextMysql>;
};

type SqliteHelpers = {
  ksuid(modelName: string, columnName?: string): ReturnType<typeof ksuidTextSqlite>;
};

type HelperMap = {
  pg: PgHelpers;
  mysql: MysqlHelpers;
  sqlite: SqliteHelpers;
};

const derivePrefix = (value: string) => {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[\s-]+/g, " ")
    .replace(/[^a-z0-9 ]+/gi, " ")
    .trim()
    .toLowerCase();

  const words = spaced.split(/\s+/).filter(Boolean);
  const condensed = words.join("");
  const initials = words.map((word) => word[0]).join("");

  let base = "";

  if (initials.length >= 2) {
    base = initials.slice(0, 4);
  } else if (condensed.length >= 2) {
    base = condensed.slice(0, 4);
  } else {
    const fallback = condensed || "id";
    base = (fallback + "id").slice(0, 2);
  }

  return base.endsWith("_") ? base : `${base}_`;
};

const buildHelpers: { [K in Dialect]: (getPrefix: PrefixGetter) => HelperMap[K] } = {
  pg: (getPrefix) => ({
    ksuid: (modelName, columnName = "id") => {
      const prefix = getPrefix(modelName);
      return ksuidText(columnName, { prefix });
    },
  }),
  mysql: (getPrefix) => ({
    ksuid: (modelName, columnName = "id", length = 64) => {
      const prefix = getPrefix(modelName);
      return ksuidVarchar(columnName, { prefix, length });
    },
    ksuidText: (modelName, columnName = "id") => {
      const prefix = getPrefix(modelName);
      return ksuidTextMysql(columnName, { prefix });
    },
  }),
  sqlite: (getPrefix) => ({
    ksuid: (modelName, columnName = "id") => {
      const prefix = getPrefix(modelName);
      return ksuidTextSqlite(columnName, { prefix });
    },
  }),
};

export function createKsuidHelpers<D extends Dialect = "pg">(
  prefixMap: PrefixMap = {},
  dialect: D = "pg" as D
): HelperMap[D] {
  const cache = new Map<string, string>();
  const getPrefix: PrefixGetter = (modelName) => {
    const configured = prefixMap[modelName];
    if (configured !== undefined) {
      cache.set(modelName, configured);
      return configured;
    }

    const cached = cache.get(modelName);
    if (cached !== undefined) {
      return cached;
    }

    const derived = derivePrefix(modelName);
    cache.set(modelName, derived);
    return derived;
  };

  return buildHelpers[dialect](getPrefix);
}

/**
 * PostgreSQL-specific exports
 */
export const pg = {
  ksuidText,
};

/**
 * MySQL-specific exports
 */
export const mysql = {
  ksuidVarchar,
  ksuidText: ksuidTextMysql,
};

/**
 * SQLite-specific exports
 */
export const sqlite = {
  ksuidText: ksuidTextSqlite,
};

export type KsuidDialect = Dialect;
export type KsuidPrefixMap = PrefixMap;
export type KsuidHelperGroup<D extends Dialect = Dialect> = HelperMap[D];
