import type { TableNode } from "@/lib/ast/types"
import { resolvePrimaryKeyColumns } from "@/lib/compiler/shared/resolve-primary-key"
import { formatDefaultForDocs } from "@/lib/compiler/markdown/format-default"

// Columns/indexes/constraints are nested under each table's own section
// rather than broken into separate top-level "Columns" / "Indexes" /
// "Constraints" documents — a table's columns are meaningless without
// its name for context, and nesting is what makes the output "readable
// technical documentation" rather than four disconnected lists.
export function renderTableSection(table: TableNode): string {
  const lines: string[] = [`## ${table.name}`]

  if (table.comment) {
    lines.push("", table.comment)
  }

  const primaryKeyColumns = new Set(resolvePrimaryKeyColumns(table).map((c) => c.toLowerCase()))

  lines.push(
    "",
    "| Column | Type | Nullable | Unique | Primary Key | Default |",
    "|---|---|---|---|---|---|"
  )
  for (const column of table.columns) {
    lines.push(
      `| ${column.name} | ${column.type} | ${column.nullable ? "Yes" : "No"} | ${
        column.unique ? "Yes" : "No"
      } | ${primaryKeyColumns.has(column.name.toLowerCase()) ? "Yes" : "No"} | ${formatDefaultForDocs(
        column.default
      )} |`
    )
  }

  const indexes = table.indexes ?? []
  if (indexes.length > 0) {
    lines.push("", "**Indexes:**", "")
    for (const index of indexes) {
      lines.push(`- \`${index.name}\`${index.unique ? " (unique)" : ""} on (${index.columns.join(", ")})`)
    }
  }

  const constraints = table.constraints ?? []
  if (constraints.length > 0) {
    lines.push("", "**Constraints:**", "")
    for (const constraint of constraints) {
      if (constraint.kind === "unique") {
        lines.push(
          `- UNIQUE (${constraint.columns.join(", ")})${constraint.name ? ` \`${constraint.name}\`` : ""}`
        )
      } else {
        lines.push(`- CHECK (${constraint.expression})${constraint.name ? ` \`${constraint.name}\`` : ""}`)
      }
    }
  }

  return lines.join("\n")
}
