import { describe, expect, it } from "vitest"

import { markdownDocsCompiler } from "@/lib/compiler/markdown/markdown-compiler"
import { buildAst } from "@/lib/compiler/test-helpers"

describe("markdownDocsCompiler", () => {
  it("happy path: overview, table of contents, one table section with indexes and constraints, relationships section", () => {
    const ast = buildAst([
      {
        name: "users",
        comment: "Application users",
        columns: [
          { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true, default: { kind: "uuid" } },
          { name: "email", type: "string", nullable: false, unique: true, primaryKey: false },
        ],
        indexes: [{ name: "idx_users_email", columns: ["email"], unique: true }],
        constraints: [{ kind: "check", name: "chk_x", expression: "1=1" }],
      },
    ])

    const result = markdownDocsCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.output).toBe(
      [
        [
          "# Schema Documentation",
          "",
          "AST version: `1.0.0`",
          "",
          "This schema has 1 table and 0 relationships.",
          "",
          "## Table of Contents",
          "",
          "- [users](#users)",
        ].join("\n"),
        [
          "## users",
          "",
          "Application users",
          "",
          "| Column | Type | Nullable | Unique | Primary Key | Default |",
          "|---|---|---|---|---|---|",
          "| id | uuid | No | Yes | Yes | uuid() |",
          "| email | string | No | Yes | No | — |",
          "",
          "**Indexes:**",
          "",
          "- `idx_users_email` (unique) on (email)",
          "",
          "**Constraints:**",
          "",
          "- CHECK (1=1) `chk_x`",
        ].join("\n"),
        "## Relationships\n\nThis schema has no relationships between tables.",
      ].join("\n\n")
    )
  })

  // Prevents accidental non-determinism regressions: an iteration order
  // that silently depended on Map/Set/Object.keys() insertion instead of
  // the AST's own array order would make this fail without changing what
  // the AST "means."
  it("is deterministic: compiling the same AST twice produces byte-identical output", () => {
    const ast = buildAst([
      { name: "widgets", columns: [{ name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true }] },
    ])
    expect(markdownDocsCompiler.compile(ast)).toEqual(markdownDocsCompiler.compile(ast))
  })

  it("pluralizes table/relationship counts correctly at the singular/plural boundary", () => {
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
      [{ sourceTable: "b", sourceColumns: ["a_id"], targetTable: "a", targetColumns: ["id"] }]
    )
    const result = markdownDocsCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // toContain: this checks one derived sentence; the rest of the
    // document (table sections, relationships list) is already pinned
    // exactly by the happy-path test, so re-asserting it here would just
    // duplicate that coverage.
    expect(result.output).toContain("This schema has 2 tables and 1 relationship.")
  })

  it("omits the Indexes and Constraints subsections when a table has neither", () => {
    const ast = buildAst([
      { name: "widgets", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
    ])
    const result = markdownDocsCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).not.toContain("**Indexes:**")
    expect(result.output).not.toContain("**Constraints:**")
  })

  it("slugifies table names with spaces and special characters for the table of contents anchor", () => {
    const ast = buildAst([
      { name: "User Profiles!", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
    ])
    const result = markdownDocsCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // toContain: scoped to the slugified ToC line specifically; the table
    // section format it sits alongside is already covered by the
    // happy-path test.
    expect(result.output).toContain("- [User Profiles!](#user-profiles)")
  })

  it("renders a relationship line with its name and onDelete/onUpdate actions", () => {
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
      [
        {
          name: "fk_b_a",
          sourceTable: "b",
          sourceColumns: ["a_id"],
          targetTable: "a",
          targetColumns: ["id"],
          onDelete: "cascade",
          onUpdate: "restrict",
        },
      ]
    )
    const result = markdownDocsCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toContain("- **b.a_id** → **a.id** (`fk_b_a`) — ON DELETE CASCADE, ON UPDATE RESTRICT")
  })

  it("joins multi-column relationship source/target columns with commas", () => {
    const ast = buildAst(
      [
        {
          name: "a",
          columns: [
            { name: "x", type: "integer", nullable: false, unique: false, primaryKey: true },
            { name: "y", type: "integer", nullable: false, unique: false, primaryKey: true },
          ],
          primaryKey: { columns: ["x", "y"] },
        },
        {
          name: "b",
          columns: [
            { name: "x", type: "integer", nullable: false, unique: false, primaryKey: false },
            { name: "y", type: "integer", nullable: false, unique: false, primaryKey: false },
          ],
        },
      ],
      [{ sourceTable: "b", sourceColumns: ["x", "y"], targetTable: "a", targetColumns: ["x", "y"] }]
    )
    const result = markdownDocsCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toContain("- **b.x, y** → **a.x, y**")
  })

  it("regression: renders expression defaults and check constraints verbatim, without sanitizing them", () => {
    // Same documented boundary as the SQL and Drizzle compilers: content
    // validation (lib/ast/analyzer.ts::UNSAFE_EXPRESSION) is a pipeline
    // stage that runs before compilation, not something any compiler
    // re-implements. Markdown docs render the raw expression string, same
    // as the artifacts a user would actually run.
    const ast = buildAst([
      {
        name: "products",
        columns: [
          {
            name: "sku",
            type: "string",
            nullable: false,
            unique: false,
            primaryKey: false,
            default: { kind: "expression", expression: "upper(gen_random_uuid()::text)" },
          },
        ],
        constraints: [{ kind: "check", expression: "price >= 0" }],
      },
    ])
    const result = markdownDocsCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      [
        [
          "# Schema Documentation",
          "",
          "AST version: `1.0.0`",
          "",
          "This schema has 1 table and 0 relationships.",
          "",
          "## Table of Contents",
          "",
          "- [products](#products)",
        ].join("\n"),
        [
          "## products",
          "",
          "| Column | Type | Nullable | Unique | Primary Key | Default |",
          "|---|---|---|---|---|---|",
          "| sku | string | No | No | No | `upper(gen_random_uuid()::text)` |",
          "",
          "**Constraints:**",
          "",
          "- CHECK (price >= 0)",
        ].join("\n"),
        "## Relationships\n\nThis schema has no relationships between tables.",
      ].join("\n\n")
    )
  })

  describe("formatDefaultForDocs", () => {
    it.each([
      ["no default", undefined, "—"],
      ["literal string", { kind: "literal", value: "member" } as const, '"member"'],
      ["literal number", { kind: "literal", value: 0 } as const, "0"],
      ["literal null", { kind: "literal", value: null } as const, "null"],
      ["now", { kind: "now" } as const, "now()"],
      ["uuid", { kind: "uuid" } as const, "uuid()"],
      ["autoincrement", { kind: "autoincrement" } as const, "autoincrement"],
      ["expression", { kind: "expression", expression: "gen_random_uuid()" } as const, "`gen_random_uuid()`"],
    ])("formats %s as %s", (_label, columnDefault, expected) => {
      const ast = buildAst([
        {
          name: "t",
          columns: [{ name: "x", type: "string", nullable: true, unique: false, primaryKey: false, default: columnDefault }],
        },
      ])
      const result = markdownDocsCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.output).toContain(`| x | string | Yes | No | No | ${expected} |`)
    })
  })
})
