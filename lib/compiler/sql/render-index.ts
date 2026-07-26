import type { RelationshipNode, TableNode } from "@/lib/ast/types"
import { resolveForeignKeyIndexes } from "@/lib/compiler/shared/foreign-key-indexes"
import { quoteIdentifier } from "@/lib/compiler/sql/identifiers"

// Renders a table's AST-authored indexes first, then one CREATE INDEX per
// foreign-key column set that isn't already covered by the primary key,
// an explicit index, or a unique constraint (see
// lib/compiler/shared/foreign-key-indexes.ts for the dedup rule).
// FK-derived indexes are never UNIQUE — they exist purely to support the
// foreign key, not to add a new uniqueness guarantee the AST didn't ask for.
export function renderCreateIndexes(table: TableNode, relationships?: RelationshipNode[]): string[] {
  const explicitIndexes = (table.indexes ?? []).map((index) => {
    const keyword = index.unique ? "CREATE UNIQUE INDEX" : "CREATE INDEX"
    const columns = index.columns.map(quoteIdentifier).join(", ")
    return `${keyword} ${quoteIdentifier(index.name)} ON ${quoteIdentifier(table.name)} (${columns});`
  })

  const foreignKeyIndexes = resolveForeignKeyIndexes(table, relationships).map(({ name, columns }) => {
    const renderedColumns = columns.map(quoteIdentifier).join(", ")
    return `CREATE INDEX ${quoteIdentifier(name)} ON ${quoteIdentifier(table.name)} (${renderedColumns});`
  })

  return [...explicitIndexes, ...foreignKeyIndexes]
}
