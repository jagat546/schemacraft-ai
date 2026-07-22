import type { ColumnNode } from "@/lib/ast/types"

export interface ColumnBuilder {
  // The full drizzle-orm/pg-core builder call, e.g. `varchar("email", { length: 255 })`.
  call: string
  pgCoreImports: string[]
  usesBytea: boolean
}

// Canonical (dialect-agnostic) column type -> drizzle-orm/pg-core builder
// call. Mirrors the choices made in lib/compiler/sql/type-map.ts so the
// two compilers describe the same schema consistently:
// - "enum" -> text(), same reasoning as the SQL compiler (no CREATE TYPE
//   / pgEnum management needed for a first pass).
// - "binary" -> a local customType("bytea") helper, since pg-core has no
//   built-in bytea column builder.
export function buildColumnBuilder(column: ColumnNode): ColumnBuilder {
  const name = JSON.stringify(column.name)

  switch (column.type) {
    case "string":
      return { call: `varchar(${name}, { length: 255 })`, pgCoreImports: ["varchar"], usesBytea: false }
    case "text":
      return { call: `text(${name})`, pgCoreImports: ["text"], usesBytea: false }
    case "integer":
      return { call: `integer(${name})`, pgCoreImports: ["integer"], usesBytea: false }
    case "bigint":
      return { call: `bigint(${name}, { mode: "number" })`, pgCoreImports: ["bigint"], usesBytea: false }
    case "float":
      return { call: `doublePrecision(${name})`, pgCoreImports: ["doublePrecision"], usesBytea: false }
    case "decimal":
      return { call: `numeric(${name})`, pgCoreImports: ["numeric"], usesBytea: false }
    case "boolean":
      return { call: `boolean(${name})`, pgCoreImports: ["boolean"], usesBytea: false }
    case "date":
      return { call: `date(${name})`, pgCoreImports: ["date"], usesBytea: false }
    case "timestamp":
      return {
        call: `timestamp(${name}, { withTimezone: true })`,
        pgCoreImports: ["timestamp"],
        usesBytea: false,
      }
    case "uuid":
      return { call: `uuid(${name})`, pgCoreImports: ["uuid"], usesBytea: false }
    case "json":
      return { call: `jsonb(${name})`, pgCoreImports: ["jsonb"], usesBytea: false }
    case "binary":
      return { call: `bytea(${name})`, pgCoreImports: [], usesBytea: true }
    case "enum":
      return { call: `text(${name})`, pgCoreImports: ["text"], usesBytea: false }
    default: {
      const unreachable: never = column.type
      throw new Error(`Unhandled column type: ${String(unreachable)}`)
    }
  }
}
