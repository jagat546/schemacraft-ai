import type { TableNode } from "@/lib/ast/types"
import { generateBaseValue } from "@/lib/compiler/json/value-generator"

// Fixed, not derived from the AST — determinism only requires the same
// row count every time, not a "realistic" count tied to input size.
export const SAMPLE_ROW_COUNT = 3

// Row values here ignore relationships entirely (every column, including
// FK columns, gets a type-shaped placeholder). apply-relationships.ts
// overwrites FK columns afterward with real values from the referenced
// table's rows — see that file for why this two-pass approach avoids
// needing a topological sort over ast.tables.
export function buildBaseRows(table: TableNode): Record<string, unknown>[] {
  return Array.from({ length: SAMPLE_ROW_COUNT }, (_, rowIndex) => {
    const row: Record<string, unknown> = {}
    for (const column of table.columns) {
      row[column.name] = generateBaseValue(column, rowIndex, SAMPLE_ROW_COUNT)
    }
    return row
  })
}
