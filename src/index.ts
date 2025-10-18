/**
 * Drizzle KSUID Extension
 *
 * Provides Drizzle ORM column helpers for generating K-Sortable Unique IDs (KSUIDs)
 * for database records. KSUIDs are time-sortable, URL-safe unique identifiers
 * that can include custom prefixes for different models.
 *
 * @packageDocumentation
 */

export {
  ksuidText,
  ksuidVarchar,
  ksuidTextMysql,
  ksuidTextSqlite,
  createKsuidHelpers,
  pg,
  mysql,
  sqlite,
} from "./drizzle-extension";

/**
 * Generates a K-Sortable Unique ID (KSUID) with an optional prefix.
 * KSUIDs are time-sortable, consisting of a timestamp component and random data,
 * encoded in base62.
 *
 * @deprecated External use of `generateKSUID` is deprecated as of version > v1.0
 * and it will be removed in the next major version.
 * For external usage, please use
 * [`@owpz/ksuid`](https://github.com/owpz/ksuid) directly instead.
 *
 * @example
 * ```typescript
 * // Deprecated: For external codebases, use @owpz/ksuid instead.
 * const userId = generateKSUID('user_');  // user_0ujsswThIGTUYm2K8FjOOfXtY1K
 * const plainId = generateKSUID();        // 0ujsswThIGTUYm2K8FjOOfXtY1K
 * ```
 */
import { generateKSUID as internalGenerateKSUID } from "./util/ksuid";

let hasWarned = false;

export function generateKSUID(
  ...args: Parameters<typeof internalGenerateKSUID>
) {
  if (!hasWarned) {
    console.warn(
      "⚠️ `generateKSUID` is deprecated for external use (as of > v1.0) and will be removed in the next major version.\n" +
        "Please use `@owpz/ksuid` directly instead: https://github.com/owpz/ksuid"
    );
    hasWarned = true;
  }
  return internalGenerateKSUID(...args);
}
