import type { ColumnType } from "@/lib/ast/types"

// Canonical column type -> simplified Mermaid erDiagram attribute type
// keyword. Mermaid's ER syntax doesn't need (or support) dialect-precise
// types like VARCHAR(255) vs TEXT — a coarser, human-readable type name
// is more appropriate for a diagram than for DDL or a model file.
export function mapToMermaidType(type: ColumnType): string {
  switch (type) {
    case "string":
    case "text":
    case "enum":
      return "string"
    case "integer":
    case "bigint":
      return "int"
    case "float":
    case "decimal":
      return "float"
    case "boolean":
      return "boolean"
    case "date":
      return "date"
    case "timestamp":
      return "timestamp"
    case "uuid":
      return "uuid"
    case "json":
      return "json"
    case "binary":
      return "bytes"
    default: {
      const unreachable: never = type
      throw new Error(`Unhandled column type: ${String(unreachable)}`)
    }
  }
}
