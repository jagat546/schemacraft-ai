import type { TableNode } from "@/lib/ast/types"
import { resolvePrimaryKeyColumns } from "@/lib/compiler/shared/resolve-primary-key"
import { quoteIdentifier } from "@/lib/compiler/sql/identifiers"
import { renderColumnDefinition } from "@/lib/compiler/sql/render-column"

export function renderCreateTable(table: TableNode): string {
  const lines = table.columns.map((column) => `  ${renderColumnDefinition(column)}`)

  const primaryKeyColumns = resolvePrimaryKeyColumns(table)
  if (primaryKeyColumns.length > 0) {
    lines.push(`  PRIMARY KEY (${primaryKeyColumns.map(quoteIdentifier).join(", ")})`)
  }

  for (const constraint of table.constraints ?? []) {
    if (constraint.kind === "unique") {
      lines.push(`  UNIQUE (${constraint.columns.map(quoteIdentifier).join(", ")})`)
    } else {
      lines.push(`  CHECK (${constraint.expression})`)
    }
  }

  return `CREATE TABLE ${quoteIdentifier(table.name)} (\n${lines.join(",\n")}\n);`
}
