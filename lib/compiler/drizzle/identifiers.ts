// Converts a snake_case (or kebab-case) AST identifier into the camelCase
// binding/property name Drizzle model code uses — matching this
// project's own convention (lib/db/schema.ts: `user_id` column ->
// `userId` property). Assumes AST names are snake_case, consistent with
// how every existing AST/DB identifier in this codebase is written.
export function toCamelCase(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0
        ? part.charAt(0).toLowerCase() + part.slice(1)
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("")
}
