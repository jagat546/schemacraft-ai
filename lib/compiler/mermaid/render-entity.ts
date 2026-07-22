import type { RelationshipNode, TableNode } from "@/lib/ast/types"
import { isForeignKeySourceColumn, isSingleColumnUnique } from "@/lib/compiler/shared/column-flags"
import { resolvePrimaryKeyColumns } from "@/lib/compiler/shared/resolve-primary-key"
import { sanitizeMermaidIdentifier } from "@/lib/compiler/mermaid/identifiers"
import { mapToMermaidType } from "@/lib/compiler/mermaid/type-map"

// One column shows at most one constraint tag, in PK > FK > UK priority
// order — Mermaid's ER syntax officially supports a single key per
// attribute line, so combining tags (e.g. "PK, FK") risks being
// unsupported by a given renderer.
export function renderEntityBlock(
  table: TableNode,
  relationshipsForTable: RelationshipNode[] | undefined
): string {
  const primaryKeyColumns = new Set(resolvePrimaryKeyColumns(table).map((c) => c.toLowerCase()))
  const entityName = sanitizeMermaidIdentifier(table.name)

  const lines = [`    ${entityName} {`]

  for (const column of table.columns) {
    const mermaidType = mapToMermaidType(column.type)
    const columnName = sanitizeMermaidIdentifier(column.name)

    const isPrimaryKey = primaryKeyColumns.has(column.name.toLowerCase())
    const isForeignKey = isForeignKeySourceColumn(relationshipsForTable, column.name)
    const isUnique = isSingleColumnUnique(table, column.name)

    const tag = isPrimaryKey ? " PK" : isForeignKey ? " FK" : isUnique ? " UK" : ""
    lines.push(`        ${mermaidType} ${columnName}${tag}`)
  }

  lines.push("    }")
  return lines.join("\n")
}
