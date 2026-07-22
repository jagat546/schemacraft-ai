import type { CanonicalSchemaAST } from "@/lib/ast/types"

export function renderRelationshipsSection(ast: CanonicalSchemaAST): string {
  if (ast.relationships.length === 0) {
    return "## Relationships\n\nThis schema has no relationships between tables."
  }

  const lines = ["## Relationships", ""]

  for (const relationship of ast.relationships) {
    const label = relationship.name ? ` (\`${relationship.name}\`)` : ""
    const actions = [
      relationship.onDelete ? `ON DELETE ${relationship.onDelete.toUpperCase()}` : undefined,
      relationship.onUpdate ? `ON UPDATE ${relationship.onUpdate.toUpperCase()}` : undefined,
    ].filter((action): action is string => action !== undefined)
    const actionsSuffix = actions.length > 0 ? ` — ${actions.join(", ")}` : ""

    lines.push(
      `- **${relationship.sourceTable}.${relationship.sourceColumns.join(", ")}** → **${
        relationship.targetTable
      }.${relationship.targetColumns.join(", ")}**${label}${actionsSuffix}`
    )
  }

  return lines.join("\n")
}
