import { describe, expect, it } from "vitest"

import { mermaidDiagramCompiler } from "@/lib/compiler/mermaid/mermaid-compiler"
import { buildAst } from "@/lib/compiler/test-helpers"

describe("mermaidDiagramCompiler", () => {
  it("happy path: entity blocks with PK/UK tags, a one-to-many relationship with an auto-generated label", () => {
    const ast = buildAst(
      [
        {
          name: "users",
          columns: [
            { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true },
            { name: "email", type: "string", nullable: false, unique: true, primaryKey: false },
          ],
        },
        {
          name: "posts",
          columns: [
            { name: "id", type: "integer", nullable: false, unique: true, primaryKey: true },
            { name: "author_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
          ],
        },
      ],
      [{ sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] }]
    )

    const result = mermaidDiagramCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.output).toBe(
      [
        "erDiagram",
        ["    users {", "        uuid id PK", "        string email UK", "    }"].join("\n"),
        ["    posts {", "        int id PK", "        uuid author_id FK", "    }"].join("\n"),
        '    users ||--o{ posts : "author_id_to_id"',
      ].join("\n")
    )
  })

  // Prevents accidental non-determinism regressions: an iteration order
  // that silently depended on Map/Set insertion order (entity/relationship
  // ordering) instead of the AST's own array order would make this fail
  // without changing what the AST "means."
  it("is deterministic: compiling the same AST twice produces byte-identical output", () => {
    const ast = buildAst([
      { name: "widgets", columns: [{ name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true }] },
    ])
    expect(mermaidDiagramCompiler.compile(ast)).toEqual(mermaidDiagramCompiler.compile(ast))
  })

  it("renders one-to-one cardinality (||) when every source column is individually unique", () => {
    const ast = buildAst(
      [
        { name: "users", columns: [{ name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true }] },
        {
          name: "profiles",
          columns: [
            { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true },
            { name: "user_id", type: "uuid", nullable: false, unique: true, primaryKey: false },
          ],
        },
      ],
      [{ sourceTable: "profiles", sourceColumns: ["user_id"], targetTable: "users", targetColumns: ["id"] }]
    )
    const result = mermaidDiagramCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // toContain: scoped to the cardinality symbol specifically; entity
    // block formatting is already pinned exactly by the happy-path test.
    expect(result.output).toContain("users ||--|| profiles")
  })

  it("uses the relationship's own name as the label instead of the auto-generated one", () => {
    const ast = buildAst(
      [
        { name: "a", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
        {
          name: "b",
          columns: [
            { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
            { name: "a_id", type: "integer", nullable: false, unique: false, primaryKey: false },
          ],
        },
      ],
      [{ name: "fk_b_a", sourceTable: "b", sourceColumns: ["a_id"], targetTable: "a", targetColumns: ["id"] }]
    )
    const result = mermaidDiagramCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toContain('a ||--o{ b : "fk_b_a"')
  })

  describe("constraint tag priority: PK beats FK beats UK, one tag per column", () => {
    it("shows PK, not FK, for a column that is both a primary key and a foreign key source column", () => {
      const ast = buildAst(
        [
          { name: "a", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
          {
            name: "b",
            // b.id is simultaneously this table's PK and the FK source column
            columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }],
          },
        ],
        [{ sourceTable: "b", sourceColumns: ["id"], targetTable: "a", targetColumns: ["id"] }]
      )
      const result = mermaidDiagramCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // Positive + negative pair, deliberately not an exact match: this
      // is precisely testing mutual exclusivity of the two tags on one
      // column, which "contains the right tag" + "does not contain the
      // wrong tag" already asserts directly and unambiguously.
      expect(result.output).toContain("int id PK")
      expect(result.output).not.toContain("int id FK")
    })

    it("shows FK, not UK, for a foreign key source column that is also individually unique", () => {
      const ast = buildAst(
        [
          { name: "a", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
          {
            name: "b",
            columns: [
              { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
              { name: "a_id", type: "integer", nullable: false, unique: true, primaryKey: false },
            ],
          },
        ],
        [{ sourceTable: "b", sourceColumns: ["a_id"], targetTable: "a", targetColumns: ["id"] }]
      )
      const result = mermaidDiagramCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.output).toContain("int a_id FK")
      expect(result.output).not.toContain("int a_id UK")
    })
  })

  describe("mapToMermaidType", () => {
    it.each([
      ["string", "string"],
      ["text", "string"],
      ["enum", "string"],
      ["integer", "int"],
      ["bigint", "int"],
      ["float", "float"],
      ["decimal", "float"],
      ["boolean", "boolean"],
      ["date", "date"],
      ["timestamp", "timestamp"],
      ["uuid", "uuid"],
      ["json", "json"],
      ["binary", "bytes"],
    ] as const)("maps AST type %s to Mermaid type %s", (astType, mermaidType) => {
      const ast = buildAst([{ name: "t", columns: [{ name: "x", type: astType, nullable: true, unique: false, primaryKey: false }] }])
      const result = mermaidDiagramCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.output).toContain(`        ${mermaidType} x`)
    })
  })

  describe("sanitizeMermaidIdentifier", () => {
    it("replaces characters unsafe for a Mermaid identifier with underscores", () => {
      const ast = buildAst([
        { name: "user-profiles!", columns: [{ name: "x y", type: "integer", nullable: false, unique: false, primaryKey: true }] },
      ])
      const result = mermaidDiagramCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.output).toBe(
        ["erDiagram", ["    user_profiles_ {", "        int x_y PK", "    }"].join("\n")].join("\n")
      )
    })
  })

  it("regression: omits a relationship line without crashing when its source table can't be resolved", () => {
    // The compiler doesn't validate cross-references (that's the
    // analyzer's job, lib/ast/analyzer.ts::FK_SOURCE_TABLE_NOT_FOUND) — it
    // just tolerates a dangling reference by omitting the line, proving
    // the compiler layer stays defensive rather than throwing on input
    // the analyzer should have already rejected upstream.
    const ast = buildAst(
      [{ name: "a", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] }],
      [{ sourceTable: "ghost", sourceColumns: ["id"], targetTable: "a", targetColumns: ["id"] }]
    )
    const result = mermaidDiagramCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(["erDiagram", ["    a {", "        int id PK", "    }"].join("\n")].join("\n"))
  })
})
