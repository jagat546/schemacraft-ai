import type { ColumnNode } from "@/lib/ast/types"

// Every value here is a pure function of (column, rowIndex, rowCount) —
// no Math.random, no Date.now/new Date(), no crypto. That's what makes
// "identical AST always produces identical JSON" hold: nothing here
// reads real wall-clock time or a randomness source.
export function generateBaseValue(column: ColumnNode, rowIndex: number, rowCount: number): unknown {
  const isLastRow = rowIndex === rowCount - 1
  if (column.nullable && !column.default && isLastRow) {
    // Demonstrates the column is genuinely optional, deterministically
    // (always the last row, never a random one).
    return null
  }

  if (column.default?.kind === "literal") {
    return column.default.value
  }

  switch (column.type) {
    case "uuid":
      return deterministicUuid(`${column.name}:${rowIndex}`)
    case "string":
      return generateStringPlaceholder(column.name, rowIndex)
    case "text":
      return `Sample ${column.name.replace(/_/g, " ")} text for row ${rowIndex + 1}.`
    case "integer":
    case "bigint":
      return rowIndex + 1
    case "float":
    case "decimal":
      return Number((rowIndex + 1.5).toFixed(2))
    case "boolean":
      return rowIndex % 2 === 0
    case "date":
      return `2024-01-${String(rowIndex + 1).padStart(2, "0")}`
    case "timestamp":
      return `2024-01-${String(rowIndex + 1).padStart(2, "0")}T00:00:00.000Z`
    case "json":
      return { sample: true, row: rowIndex + 1 }
    case "binary":
      // Static placeholder — base64 for the literal text "sample binary".
      return "c2FtcGxlIGJpbmFyeQ=="
    case "enum":
      return column.enumValues && column.enumValues.length > 0
        ? column.enumValues[rowIndex % column.enumValues.length]
        : null
    default: {
      const unreachable: never = column.type
      throw new Error(`Unhandled column type: ${String(unreachable)}`)
    }
  }
}

function generateStringPlaceholder(columnName: string, rowIndex: number): string {
  const lower = columnName.toLowerCase()
  const n = rowIndex + 1

  if (lower.includes("email")) return `user${n}@example.com`
  if (lower.includes("name")) return `Sample Name ${n}`
  if (lower.includes("title")) return `Sample Title ${n}`
  if (lower.includes("url")) return `https://example.com/${lower}/${n}`
  if (lower.includes("phone")) return `+1-555-000-${String(n).padStart(4, "0")}`
  return `sample_${lower}_${n}`
}

// Deterministic, non-cryptographic hash -> UUID-shaped hex string. Not a
// real UUID generator (no entropy source) — it exists purely so the same
// (column, rowIndex) seed always produces the same placeholder value.
function deterministicUuid(seed: string): string {
  const a = fnv1a(`${seed}:a`)
  const b = fnv1a(`${seed}:b`)
  const c = fnv1a(`${seed}:c`)
  const d = fnv1a(`${seed}:d`)
  return [a.slice(0, 8), b.slice(0, 4), `4${b.slice(4, 7)}`, `8${c.slice(0, 3)}`, (c + d).slice(0, 12)].join("-")
}

function fnv1a(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}
