import type { ColumnNode } from "@/lib/ast/types"

// Canonical (dialect-agnostic) column type -> PostgreSQL type. This
// mapping — and only this mapping — is where "enum" decides to become
// TEXT + CHECK rather than a native Postgres ENUM type: native enums
// require a separate CREATE TYPE statement and ALTER TYPE to add values
// later, which is more moving parts than a first compiler needs. That
// choice is isolated here so a future dialect (or a future Postgres
// compiler revision) can change it without touching the AST.
export function mapColumnType(column: ColumnNode): string {
  switch (column.type) {
    case "string":
      return "VARCHAR(255)"
    case "text":
      return "TEXT"
    case "integer":
      return "INTEGER"
    case "bigint":
      return "BIGINT"
    case "float":
      return "DOUBLE PRECISION"
    case "decimal":
      return "NUMERIC"
    case "boolean":
      return "BOOLEAN"
    case "date":
      return "DATE"
    case "timestamp":
      return "TIMESTAMPTZ"
    case "uuid":
      return "UUID"
    case "json":
      return "JSONB"
    case "binary":
      return "BYTEA"
    case "enum":
      return "TEXT"
    default: {
      // Exhaustiveness guard: a new ColumnType added to the AST without a
      // matching branch here is a compiler bug, not a bad input — safe
      // to throw rather than silently emit wrong SQL.
      const unreachable: never = column.type
      throw new Error(`Unhandled column type: ${String(unreachable)}`)
    }
  }
}
