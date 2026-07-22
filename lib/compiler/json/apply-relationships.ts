import type { CanonicalSchemaAST } from "@/lib/ast/types"

// Overwrites FK columns in the already-generated source rows so their
// values match real values from the target table's generated rows — this
// is what makes the sample data "logically" related, not just
// type-shaped. Cyclic indexing (rowIndex % targetRows.length) means this
// needs no topological ordering between tables: every table's base rows
// were already generated independently (see sample-rows.ts) before this
// runs, so it doesn't matter whether a relationship's target table
// appears earlier or later in ast.tables.
//
// Operates only on the compiler's own working copy of sample rows
// (rowsByTable) — never on the AST itself.
export function applyRelationships(
  ast: CanonicalSchemaAST,
  rowsByTable: Map<string, Record<string, unknown>[]>
): void {
  for (const relationship of ast.relationships) {
    const sourceRows = rowsByTable.get(relationship.sourceTable.toLowerCase())
    const targetRows = rowsByTable.get(relationship.targetTable.toLowerCase())
    if (!sourceRows || !targetRows || targetRows.length === 0) {
      continue
    }

    for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex++) {
      const targetRow = targetRows[rowIndex % targetRows.length]
      relationship.sourceColumns.forEach((sourceColumn, i) => {
        const targetColumn = relationship.targetColumns[i]
        sourceRows[rowIndex][sourceColumn] = targetRow[targetColumn]
      })
    }
  }
}
