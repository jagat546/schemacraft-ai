import type { TableNode } from "@/lib/ast/types"

// A table-level primaryKey takes precedence when present; otherwise
// falls back to whichever columns set primaryKey: true. Shared by every
// compiler that needs to know "what is this table's primary key" (SQL,
// Drizzle, Markdown docs, Mermaid) so the resolution rule lives in one
// place rather than four.
export function resolvePrimaryKeyColumns(table: TableNode): string[] {
  if (table.primaryKey) {
    return table.primaryKey.columns
  }
  return table.columns.filter((column) => column.primaryKey).map((column) => column.name)
}
