import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { toCamelCase } from "@/lib/compiler/drizzle/identifiers"

interface RawRelationEntry {
  baseKey: string
  expression: string
}

// Every relationship contributes two relations() entries: a "one" on the
// source table's side, and a "many" on the target table's side — this
// works for composite (multi-column) relationships too, since
// relations()'s one()/many() helpers are pure query-layer metadata (no
// physical constraint), unlike the inline .references() FK in
// render-table.ts, which is only emitted for single-column relationships.
//
// relations() blocks are emitted after every pgTable const in the final
// output (see drizzle-compiler.ts), so a relationship can reference a
// table declared earlier or later in ast.tables without a temporal-dead-
// zone hazard.
export function renderRelationsBlocks(ast: CanonicalSchemaAST): string[] {
  const rawEntriesByTable = new Map<string, RawRelationEntry[]>()

  function addRaw(tableName: string, baseKey: string, expression: string) {
    const key = tableName.toLowerCase()
    const list = rawEntriesByTable.get(key) ?? []
    list.push({ baseKey, expression })
    rawEntriesByTable.set(key, list)
  }

  for (const relationship of ast.relationships) {
    const sourceVar = toCamelCase(relationship.sourceTable)
    const targetVar = toCamelCase(relationship.targetTable)

    const fields = relationship.sourceColumns.map((c) => `${sourceVar}.${toCamelCase(c)}`).join(", ")
    const references = relationship.targetColumns.map((c) => `${targetVar}.${toCamelCase(c)}`).join(", ")

    addRaw(
      relationship.sourceTable,
      targetVar,
      `one(${targetVar}, { fields: [${fields}], references: [${references}] })`
    )
    addRaw(relationship.targetTable, sourceVar, `many(${sourceVar})`)
  }

  const blocks: string[] = []

  for (const table of ast.tables) {
    const entries = rawEntriesByTable.get(table.name.toLowerCase())
    if (!entries || entries.length === 0) {
      continue
    }

    // Disambiguate duplicate keys deterministically (e.g. two FKs from
    // the same table to the same target table) by suffixing repeat
    // occurrences with an occurrence count.
    const seenCounts = new Map<string, number>()
    const lines = entries.map(({ baseKey, expression }) => {
      const count = (seenCounts.get(baseKey) ?? 0) + 1
      seenCounts.set(baseKey, count)
      const key = count === 1 ? baseKey : `${baseKey}${count}`
      return `  ${key}: ${expression},`
    })

    const tableVarName = toCamelCase(table.name)
    blocks.push(
      `export const ${tableVarName}Relations = relations(${tableVarName}, ({ one, many }) => ({\n${lines.join("\n")}\n}))`
    )
  }

  return blocks
}
