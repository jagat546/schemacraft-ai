import { describe, expect, it } from "vitest"

import { CURRENT_AST_VERSION } from "@/lib/ast/schema"
import { validateASTShape } from "@/lib/ast/validator"
import type { CanonicalSchemaAST } from "@/lib/ast/types"

// validateASTShape is a structural gate only: "is this a well-formed
// CanonicalSchemaAST, of a version this build knows how to compile?" It
// does not check cross-references (FK targets, index columns, duplicate
// names, etc.) — that is analyzeSchema's job (lib/ast/analyzer.test.ts).
// Every test here is written to respect that boundary: a shape-valid but
// semantically broken AST must still pass this gate.

// Shared by all four "missing required property" tests below — genuinely
// the same logic each time (build a valid fixture, strip exactly one key),
// so a small helper earns its keep here rather than repeating a
// destructure-and-omit at each call site.
function withoutKey<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy: Partial<T> = { ...obj }
  delete copy[key]
  return copy as Omit<T, K>
}

function validAst(): CanonicalSchemaAST {
  return {
    astVersion: CURRENT_AST_VERSION,
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true },
          { name: "email", type: "string", nullable: false, unique: true, primaryKey: false },
        ],
      },
    ],
    relationships: [],
  }
}

describe("validateASTShape", () => {
  it("accepts a well-formed AST", () => {
    const result = validateASTShape(validAst())
    expect(result.ok).toBe(true)
  })

  it("rejects an AST whose astVersion is not in SUPPORTED_AST_VERSIONS", () => {
    // This is the one check that lives outside Zod's schema entirely — a
    // hand-written post-parse check in validateASTShape itself. It has no
    // Zod-level coverage, so a regression here would only ever be caught
    // by a test written specifically against it, which is this one.
    const ast = { ...validAst(), astVersion: "99.0.0" }
    const result = validateASTShape(ast)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([
        `Unsupported AST version "99.0.0". Supported versions: ${CURRENT_AST_VERSION}.`,
      ])
    }
  })

  it("rejects a shape-valid but semantically broken AST at this layer only if it's actually shape-invalid — proving the layer boundary", () => {
    // A dangling FK (relationship pointing at a table that doesn't exist)
    // is a semantic problem, not a structural one. validateASTShape must
    // still accept it — rejecting it here would mean shape validation has
    // silently grown semantic responsibilities that belong to the
    // analyzer, breaking the two-phase pipeline the architecture depends on.
    const ast: CanonicalSchemaAST = {
      ...validAst(),
      relationships: [
        {
          sourceTable: "users",
          sourceColumns: ["id"],
          targetTable: "this_table_does_not_exist",
          targetColumns: ["id"],
        },
      ],
    }
    const result = validateASTShape(ast)
    expect(result.ok).toBe(true)
  })

  describe("malformed AST structure", () => {
    it.each([
      ["null", null],
      ["a number", 42],
      ["a string", "not an ast"],
      ["an array", []],
    ])("rejects input that is %s, not an object", (_label, input) => {
      const result = validateASTShape(input)
      expect(result.ok).toBe(false)
    })

    it("rejects an AST whose tables field is not an array", () => {
      const ast = { ...validAst(), tables: "not-an-array" }
      const result = validateASTShape(ast)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables:"))).toBe(true)
      }
    })
  })

  describe("missing required properties", () => {
    it("rejects an AST missing astVersion", () => {
      const result = validateASTShape(withoutKey(validAst(), "astVersion"))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("astVersion:"))).toBe(true)
      }
    })

    it("rejects an AST missing tables", () => {
      const result = validateASTShape(withoutKey(validAst(), "tables"))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables:"))).toBe(true)
      }
    })

    it("rejects an AST missing relationships", () => {
      const result = validateASTShape(withoutKey(validAst(), "relationships"))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("relationships:"))).toBe(true)
      }
    })

    it("rejects a column missing a required field (nullable)", () => {
      const ast = validAst()
      const columnWithoutNullable = withoutKey(ast.tables[0].columns[0], "nullable")
      const broken = {
        ...ast,
        tables: [{ ...ast.tables[0], columns: [columnWithoutNullable, ast.tables[0].columns[1]] }],
      }
      const result = validateASTShape(broken)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables.0.columns.0.nullable:"))).toBe(true)
      }
    })
  })

  describe("invalid field types", () => {
    it("rejects a non-boolean value for a boolean field", () => {
      const ast = validAst()
      const broken = {
        ...ast,
        tables: [
          {
            ...ast.tables[0],
            columns: [{ ...ast.tables[0].columns[0], nullable: "false" }, ast.tables[0].columns[1]],
          },
        ],
      }
      const result = validateASTShape(broken)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables.0.columns.0.nullable:"))).toBe(true)
      }
    })

    it("rejects a column type outside the ColumnType enum", () => {
      const ast = validAst()
      const broken = {
        ...ast,
        tables: [
          {
            ...ast.tables[0],
            columns: [
              { ...ast.tables[0].columns[0], type: "not-a-real-type" },
              ast.tables[0].columns[1],
            ],
          },
        ],
      }
      const result = validateASTShape(broken)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables.0.columns.0.type:"))).toBe(true)
      }
    })

    it("rejects astVersion when it isn't a string", () => {
      const ast = { ...validAst(), astVersion: 100 }
      const result = validateASTShape(ast)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("astVersion:"))).toBe(true)
      }
    })
  })

  describe("shape validation boundaries", () => {
    it("rejects a tables array with zero entries (requires at least 1)", () => {
      const ast = { ...validAst(), tables: [] }
      const result = validateASTShape(ast)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables:"))).toBe(true)
      }
    })

    it("rejects a table with zero columns (requires at least 1)", () => {
      const ast = validAst()
      const broken = { ...ast, tables: [{ ...ast.tables[0], columns: [] }] }
      const result = validateASTShape(broken)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables.0.columns:"))).toBe(true)
      }
    })

    it("rejects a relationship with zero sourceColumns (requires at least 1)", () => {
      const ast = validAst()
      const broken: CanonicalSchemaAST = {
        ...ast,
        relationships: [
          { sourceTable: "users", sourceColumns: [], targetTable: "users", targetColumns: ["id"] },
        ],
      }
      const result = validateASTShape(broken)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("relationships.0.sourceColumns:"))).toBe(true)
      }
    })

    it("rejects an empty-string table name (requires min length 1)", () => {
      const ast = validAst()
      const broken = { ...ast, tables: [{ ...ast.tables[0], name: "" }] }
      const result = validateASTShape(broken)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.startsWith("tables.0.name:"))).toBe(true)
      }
    })

    it("rejects an expression default with an empty expression string", () => {
      const ast = validAst()
      const broken = {
        ...ast,
        tables: [
          {
            ...ast.tables[0],
            columns: [
              {
                ...ast.tables[0].columns[0],
                default: { kind: "expression", expression: "" },
              },
              ast.tables[0].columns[1],
            ],
          },
        ],
      }
      const result = validateASTShape(broken)
      expect(result.ok).toBe(false)
    })

    it("accepts an expression default with a single-character expression (the boundary is inclusive at length 1)", () => {
      const ast = validAst()
      const withExpression: CanonicalSchemaAST = {
        ...ast,
        tables: [
          {
            ...ast.tables[0],
            columns: [
              {
                ...ast.tables[0].columns[0],
                default: { kind: "expression", expression: "x" },
              },
              ast.tables[0].columns[1],
            ],
          },
        ],
      }
      const result = validateASTShape(withExpression)
      expect(result.ok).toBe(true)
    })
  })
})
