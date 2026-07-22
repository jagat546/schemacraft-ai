import type { CanonicalSchemaAST, RelationshipNode, TableNode } from "@/lib/ast/types"

// Small, shared predicates over an AST table/relationship set, used by
// the Drizzle and Mermaid compilers (both need to answer "is this column
// a PK / FK / unique column" while rendering per-column annotations).
// (Primary-key membership itself is checked directly against
// resolvePrimaryKeyColumns() by callers that need it — e.g.
// lib/compiler/mermaid/render-entity.ts — since it's a single Set lookup
// with no extra logic worth wrapping here.)

// Only single-column unique constraints count — a composite unique
// constraint doesn't make any one of its columns individually unique, so
// tagging one of them "unique" would be misleading.
export function isSingleColumnUnique(table: TableNode, columnName: string): boolean {
  const column = table.columns.find((c) => c.name.toLowerCase() === columnName.toLowerCase())
  if (column?.unique) {
    return true
  }
  return (table.constraints ?? []).some(
    (constraint) =>
      constraint.kind === "unique" &&
      constraint.columns.length === 1 &&
      constraint.columns[0].toLowerCase() === columnName.toLowerCase()
  )
}

export function relationshipsBySourceTable(
  ast: CanonicalSchemaAST
): Map<string, RelationshipNode[]> {
  const map = new Map<string, RelationshipNode[]>()
  for (const relationship of ast.relationships) {
    const key = relationship.sourceTable.toLowerCase()
    const list = map.get(key) ?? []
    list.push(relationship)
    map.set(key, list)
  }
  return map
}

export function isForeignKeySourceColumn(
  relationshipsForTable: RelationshipNode[] | undefined,
  columnName: string
): boolean {
  if (!relationshipsForTable) {
    return false
  }
  return relationshipsForTable.some((relationship) =>
    relationship.sourceColumns.some((column) => column.toLowerCase() === columnName.toLowerCase())
  )
}
