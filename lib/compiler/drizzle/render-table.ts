import type { CanonicalSchemaAST, TableNode } from "@/lib/ast/types"
import { resolvePrimaryKeyColumns } from "@/lib/compiler/shared/resolve-primary-key"
import { toCamelCase } from "@/lib/compiler/drizzle/identifiers"
import {
  renderColumnProperty,
  type SingleColumnForeignKey,
} from "@/lib/compiler/drizzle/render-column"

export interface RenderedTable {
  code: string
  pgCoreImports: Set<string>
  usesSql: boolean
  usesBytea: boolean
}

// Only single-column relationships become an inline .references() FK —
// see render-relations.ts for why composite (multi-column) relationships
// are represented as relations() entries only, not a physical
// table-level foreignKey() constraint.
function buildSingleColumnForeignKeys(
  table: TableNode,
  ast: CanonicalSchemaAST
): Map<string, SingleColumnForeignKey> {
  const map = new Map<string, SingleColumnForeignKey>()

  for (const relationship of ast.relationships) {
    if (
      relationship.sourceTable.toLowerCase() === table.name.toLowerCase() &&
      relationship.sourceColumns.length === 1 &&
      relationship.targetColumns.length === 1
    ) {
      map.set(relationship.sourceColumns[0].toLowerCase(), {
        relationship,
        targetTableVarName: toCamelCase(relationship.targetTable),
        targetColumnName: relationship.targetColumns[0],
      })
    }
  }

  return map
}

export function renderCreateTableDefinition(
  table: TableNode,
  ast: CanonicalSchemaAST
): RenderedTable {
  const pgCoreImports = new Set<string>(["pgTable"])
  let usesSql = false
  let usesBytea = false

  const primaryKeyColumnNames = resolvePrimaryKeyColumns(table)
  const primaryKeyColumns = new Set(primaryKeyColumnNames.map((c) => c.toLowerCase()))
  const singleColumnForeignKeys = buildSingleColumnForeignKeys(table, ast)

  // Unindented for now — the 2-arg and 3-arg pgTable() forms below nest
  // the columns object at different depths, matching this project's own
  // lib/db/schema.ts convention (2-space indent when the object is the
  // pgTable() call's inline 2nd arg, 4-space indent when it's a
  // multi-line 3rd-arg call) — so indentation is applied once the form
  // is chosen, not here.
  const columnLines: string[] = []
  for (const column of table.columns) {
    const rendered = renderColumnProperty(column, { primaryKeyColumns, singleColumnForeignKeys })
    rendered.pgCoreImports.forEach((name) => pgCoreImports.add(name))
    usesSql = usesSql || rendered.usesSql
    usesBytea = usesBytea || rendered.usesBytea
    if (rendered.comment) {
      columnLines.push(rendered.comment)
    }
    columnLines.push(rendered.line)
  }

  const tableBuilderEntries: string[] = []

  if (primaryKeyColumns.size > 1) {
    pgCoreImports.add("primaryKey")
    const columns = primaryKeyColumnNames.map((c) => `table.${toCamelCase(c)}`).join(", ")
    tableBuilderEntries.push(`primaryKey({ columns: [${columns}] })`)
  }

  for (const constraint of table.constraints ?? []) {
    if (constraint.kind === "unique") {
      pgCoreImports.add("unique")
      const columns = constraint.columns.map((c) => `table.${toCamelCase(c)}`).join(", ")
      const name = constraint.name ? JSON.stringify(constraint.name) : ""
      tableBuilderEntries.push(`unique(${name}).on(${columns})`)
    } else {
      pgCoreImports.add("check")
      usesSql = true
      const name = constraint.name ?? `${table.name}_check`
      tableBuilderEntries.push(`check(${JSON.stringify(name)}, sql\`${constraint.expression}\`)`)
    }
  }

  for (const index of table.indexes ?? []) {
    const builderName = index.unique ? "uniqueIndex" : "index"
    pgCoreImports.add(builderName)
    const columns = index.columns.map((c) => `table.${toCamelCase(c)}`).join(", ")
    tableBuilderEntries.push(`${builderName}(${JSON.stringify(index.name)}).on(${columns})`)
  }

  const tableVarName = toCamelCase(table.name)
  const tableNameLiteral = JSON.stringify(table.name)

  const code =
    tableBuilderEntries.length > 0
      ? [
          `export const ${tableVarName} = pgTable(`,
          `  ${tableNameLiteral},`,
          "  {",
          indent(columnLines, "    ").join("\n"),
          "  },",
          `  (table) => [${tableBuilderEntries.join(", ")}]`,
          ")",
        ].join("\n")
      : [
          `export const ${tableVarName} = pgTable(${tableNameLiteral}, {`,
          indent(columnLines, "  ").join("\n"),
          "})",
        ].join("\n")

  return { code, pgCoreImports, usesSql, usesBytea }
}

function indent(lines: string[], prefix: string): string[] {
  return lines.map((line) => `${prefix}${line}`)
}
