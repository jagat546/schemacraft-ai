import { describe, expect, it } from "vitest"

import { jsonSampleCompiler } from "@/lib/compiler/json/json-compiler"
import { buildAst } from "@/lib/compiler/test-helpers"

// UUID-typed values come from a deterministic FNV-1a hash
// (lib/compiler/json/value-generator.ts::deterministicUuid) — not
// hand-computed here, since verifying a 32-bit hash by hand isn't a
// reliable way to catch a real regression. Instead: shape (does it look
// like a UUID) and determinism/relational-correctness (does the same
// value show up in both the source and target row it should) are the
// properties that actually matter and are meaningfully hand-verifiable.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/

describe("jsonSampleCompiler", () => {
  it("happy path: 3 rows per table, with FK columns pointing at real target row values", () => {
    const ast = buildAst(
      [
        {
          name: "users",
          columns: [
            { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true },
            { name: "email", type: "string", nullable: false, unique: true, primaryKey: false },
            { name: "bio", type: "text", nullable: true, unique: false, primaryKey: false },
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

    const result = jsonSampleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const parsed = JSON.parse(result.output)
    expect(parsed).toEqual({
      users: [
        { id: expect.stringMatching(UUID_SHAPE), email: "user1@example.com", bio: "Sample bio text for row 1." },
        { id: expect.stringMatching(UUID_SHAPE), email: "user2@example.com", bio: "Sample bio text for row 2." },
        // Last row of a nullable, default-less column is always null —
        // deterministically the last row, never a random one.
        { id: expect.stringMatching(UUID_SHAPE), email: "user3@example.com", bio: null },
      ],
      posts: [
        { id: 1, author_id: expect.stringMatching(UUID_SHAPE) },
        { id: 2, author_id: expect.stringMatching(UUID_SHAPE) },
        { id: 3, author_id: expect.stringMatching(UUID_SHAPE) },
      ],
    })

    // The FK column's value must match the corresponding target row's
    // actual generated id, row for row — proving the two-pass
    // apply-relationships overwrite actually happened, not just that
    // *some* UUID-shaped string is present.
    for (let i = 0; i < 3; i++) {
      expect(parsed.posts[i].author_id).toBe(parsed.users[i].id)
    }
  })

  // Prevents accidental non-determinism regressions — this is the
  // compiler where that risk is most concrete: value-generator.ts's own
  // header comment states the design contract directly ("no Math.random,
  // no Date.now/new Date(), no crypto"). This test is what actually
  // enforces that contract keeps holding.
  it("is deterministic: compiling the same AST twice produces byte-identical output", () => {
    const ast = buildAst([
      { name: "widgets", columns: [{ name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true }] },
    ])
    expect(jsonSampleCompiler.compile(ast)).toEqual(jsonSampleCompiler.compile(ast))
  })

  it("produces exactly 3 rows per table regardless of table count", () => {
    const ast = buildAst([
      { name: "widgets", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
    ])
    const result = jsonSampleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(JSON.parse(result.output).widgets).toHaveLength(3)
  })

  describe("string placeholder heuristics", () => {
    it.each([
      ["email", "user_email", "user1@example.com"],
      ["name", "full_name", "Sample Name 1"],
      ["title", "post_title", "Sample Title 1"],
      ["url", "homepage_url", "https://example.com/homepage_url/1"],
      ["phone", "contact_phone", "+1-555-000-0001"],
      ["fallback", "random_field", "sample_random_field_1"],
    ])("matches on %s in the column name", (_label, columnName, expected) => {
      const ast = buildAst([
        {
          name: "t",
          columns: [{ name: columnName, type: "string", nullable: false, unique: false, primaryKey: false }],
        },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(JSON.parse(result.output).t[0][columnName]).toBe(expected)
    })
  })

  describe("type-shaped placeholder values", () => {
    it("generates sequential integers/bigints starting at 1", () => {
      const ast = buildAst([
        {
          name: "t",
          columns: [
            { name: "a", type: "integer", nullable: false, unique: false, primaryKey: false },
            { name: "b", type: "bigint", nullable: false, unique: false, primaryKey: false },
          ],
        },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const rows = JSON.parse(result.output).t
      expect(rows.map((r: { a: number }) => r.a)).toEqual([1, 2, 3])
      expect(rows.map((r: { b: number }) => r.b)).toEqual([1, 2, 3])
    })

    it("generates float/decimal values as rowIndex + 1.5", () => {
      const ast = buildAst([
        { name: "t", columns: [{ name: "price", type: "decimal", nullable: false, unique: false, primaryKey: false }] },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const rows = JSON.parse(result.output).t
      expect(rows.map((r: { price: number }) => r.price)).toEqual([1.5, 2.5, 3.5])
    })

    it("alternates booleans starting true on row 0", () => {
      const ast = buildAst([
        { name: "t", columns: [{ name: "active", type: "boolean", nullable: false, unique: false, primaryKey: false }] },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const rows = JSON.parse(result.output).t
      expect(rows.map((r: { active: boolean }) => r.active)).toEqual([true, false, true])
    })

    it("generates fixed, hand-picked date and timestamp strings, never the real current date", () => {
      const ast = buildAst([
        {
          name: "t",
          columns: [
            { name: "d", type: "date", nullable: false, unique: false, primaryKey: false },
            { name: "ts", type: "timestamp", nullable: false, unique: false, primaryKey: false },
          ],
        },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const rows = JSON.parse(result.output).t
      expect(rows.map((r: { d: string }) => r.d)).toEqual(["2024-01-01", "2024-01-02", "2024-01-03"])
      expect(rows.map((r: { ts: string }) => r.ts)).toEqual([
        "2024-01-01T00:00:00.000Z",
        "2024-01-02T00:00:00.000Z",
        "2024-01-03T00:00:00.000Z",
      ])
    })

    it("generates a static object for json columns", () => {
      const ast = buildAst([
        { name: "t", columns: [{ name: "meta", type: "json", nullable: false, unique: false, primaryKey: false }] },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(JSON.parse(result.output).t).toEqual([
        { meta: { sample: true, row: 1 } },
        { meta: { sample: true, row: 2 } },
        { meta: { sample: true, row: 3 } },
      ])
    })

    it("generates a static base64 placeholder for binary columns", () => {
      const ast = buildAst([
        { name: "t", columns: [{ name: "blob", type: "binary", nullable: false, unique: false, primaryKey: false }] },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const rows = JSON.parse(result.output).t
      expect(rows.every((r: { blob: string }) => r.blob === "c2FtcGxlIGJpbmFyeQ==")).toBe(true)
    })

    it("cycles enum values by rowIndex modulo the number of values", () => {
      const ast = buildAst([
        {
          name: "t",
          columns: [{ name: "status", type: "enum", nullable: false, unique: false, primaryKey: false, enumValues: ["a", "b"] }],
        },
      ])
      const result = jsonSampleCompiler.compile(ast)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const rows = JSON.parse(result.output).t
      expect(rows.map((r: { status: string }) => r.status)).toEqual(["a", "b", "a"])
    })
  })

  it("regression: two independent FK columns on the same source table each resolve against their own target table", () => {
    // Matches a real shape observed in production output: a join table
    // (post_tags-style) with two FK columns pointing at two different
    // target tables. This is a real stress case for the two-pass
    // apply-relationships design — it must not let one relationship's
    // overwrite bleed into the other's column.
    const ast = buildAst(
      [
        {
          name: "posts",
          columns: [
            { name: "code", type: "string", nullable: false, unique: false, primaryKey: false, default: { kind: "literal", value: "POST" } },
          ],
        },
        {
          name: "tags",
          columns: [
            { name: "code", type: "string", nullable: false, unique: false, primaryKey: false, default: { kind: "literal", value: "TAG" } },
          ],
        },
        {
          name: "post_tags",
          columns: [
            { name: "post_code", type: "string", nullable: false, unique: false, primaryKey: false },
            { name: "tag_code", type: "string", nullable: false, unique: false, primaryKey: false },
          ],
        },
      ],
      [
        { sourceTable: "post_tags", sourceColumns: ["post_code"], targetTable: "posts", targetColumns: ["code"] },
        { sourceTable: "post_tags", sourceColumns: ["tag_code"], targetTable: "tags", targetColumns: ["code"] },
      ]
    )
    const result = jsonSampleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rows = JSON.parse(result.output).post_tags
    expect(rows).toEqual([
      { post_code: "POST", tag_code: "TAG" },
      { post_code: "POST", tag_code: "TAG" },
      { post_code: "POST", tag_code: "TAG" },
    ])
  })

  it("a literal default is used on every row, including the row that would otherwise be null", () => {
    // Proves literal defaults take precedence over the "last nullable row
    // is null" rule, not just that they apply to non-last rows.
    const ast = buildAst([
      {
        name: "t",
        columns: [
          {
            name: "status",
            type: "string",
            nullable: true,
            unique: false,
            primaryKey: false,
            default: { kind: "literal", value: "pending" },
          },
        ],
      },
    ])
    const result = jsonSampleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rows = JSON.parse(result.output).t
    expect(rows.map((r: { status: string }) => r.status)).toEqual(["pending", "pending", "pending"])
  })
})
