import type { ForeignKeyAction, RelationshipNode } from "@/lib/ast/types"
import { quoteIdentifier } from "@/lib/compiler/sql/identifiers"

// Foreign keys are emitted as ALTER TABLE ... ADD CONSTRAINT statements
// after every CREATE TABLE, rather than inlined into the CREATE TABLE
// body. This makes table declaration order irrelevant — a relationship
// can point at a table declared earlier or later in ast.tables without
// the compiler needing to topologically sort tables first.
export function renderForeignKeyConstraint(relationship: RelationshipNode): string {
  const constraintName =
    relationship.name ?? `fk_${relationship.sourceTable}_${relationship.sourceColumns.join("_")}`

  const sourceColumns = relationship.sourceColumns.map(quoteIdentifier).join(", ")
  const targetColumns = relationship.targetColumns.map(quoteIdentifier).join(", ")

  const parts = [
    `ALTER TABLE ${quoteIdentifier(relationship.sourceTable)}`,
    `ADD CONSTRAINT ${quoteIdentifier(constraintName)}`,
    `FOREIGN KEY (${sourceColumns})`,
    `REFERENCES ${quoteIdentifier(relationship.targetTable)} (${targetColumns})`,
  ]

  if (relationship.onDelete) {
    parts.push(`ON DELETE ${renderForeignKeyAction(relationship.onDelete)}`)
  }
  if (relationship.onUpdate) {
    parts.push(`ON UPDATE ${renderForeignKeyAction(relationship.onUpdate)}`)
  }

  return `${parts.join(" ")};`
}

function renderForeignKeyAction(action: ForeignKeyAction): string {
  switch (action) {
    case "cascade":
      return "CASCADE"
    case "restrict":
      return "RESTRICT"
    case "set-null":
      return "SET NULL"
    case "set-default":
      return "SET DEFAULT"
    case "no-action":
      return "NO ACTION"
    default: {
      const unreachable: never = action
      throw new Error(`Unhandled foreign key action: ${String(unreachable)}`)
    }
  }
}
