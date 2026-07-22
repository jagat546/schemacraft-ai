import type { TableNode } from "@/lib/ast/types"
import { quoteIdentifier } from "@/lib/compiler/sql/identifiers"

export function renderCreateIndexes(table: TableNode): string[] {
  return (table.indexes ?? []).map((index) => {
    const keyword = index.unique ? "CREATE UNIQUE INDEX" : "CREATE INDEX"
    const columns = index.columns.map(quoteIdentifier).join(", ")
    return `${keyword} ${quoteIdentifier(index.name)} ON ${quoteIdentifier(table.name)} (${columns});`
  })
}
