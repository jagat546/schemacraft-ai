import type { ColumnDefault } from "@/lib/ast/types"

export function formatDefaultForDocs(defaultValue: ColumnDefault | undefined): string {
  if (!defaultValue) {
    return "—"
  }

  switch (defaultValue.kind) {
    case "literal":
      return defaultValue.value === null ? "null" : JSON.stringify(defaultValue.value)
    case "now":
      return "now()"
    case "uuid":
      return "uuid()"
    case "autoincrement":
      return "autoincrement"
    case "expression":
      return `\`${defaultValue.expression}\``
  }
}
