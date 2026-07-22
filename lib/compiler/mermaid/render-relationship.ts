import type { RelationshipNode, TableNode } from "@/lib/ast/types"
import { isSingleColumnUnique } from "@/lib/compiler/shared/column-flags"
import { sanitizeMermaidIdentifier } from "@/lib/compiler/mermaid/identifiers"

// Cardinality is inferred, not stored on the AST: the target side of a
// foreign key is always rendered as "exactly one" (`||`), matching
// standard FK semantics (a FK value identifies exactly one target row).
// The source side is "one" (`||`) only when every source column is
// individually unique (a one-to-one relationship); otherwise it's
// "zero-or-many" (`o{`) — a plain one-to-many. The AST has no explicit
// many-to-many concept (that's normally modeled as two FKs through a
// join table, which already renders correctly as two separate one-to-many
// relationships).
export function renderRelationshipLine(relationship: RelationshipNode, sourceTable: TableNode): string {
  const isOneToOne =
    relationship.sourceColumns.length > 0 &&
    relationship.sourceColumns.every((column) => isSingleColumnUnique(sourceTable, column))

  const sourceCardinality = isOneToOne ? "||" : "o{"
  const label =
    relationship.name ??
    `${relationship.sourceColumns.join("_")}_to_${relationship.targetColumns.join("_")}`

  return `    ${sanitizeMermaidIdentifier(relationship.targetTable)} ||--${sourceCardinality} ${sanitizeMermaidIdentifier(
    relationship.sourceTable
  )} : "${label}"`
}
