import { describe, expect, it } from "vitest"

import { drizzleCompiler } from "@/lib/compiler/drizzle/drizzle-compiler"
import { buildAst } from "@/lib/compiler/test-helpers"

describe("drizzleCompiler", () => {
  it("happy path: 2-arg pgTable form, a single-column FK with onDelete, and relations() blocks", () => {
    const ast = buildAst(
      [
        {
          name: "users",
          columns: [
            { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true, default: { kind: "uuid" } },
            { name: "email", type: "string", nullable: false, unique: true, primaryKey: false },
          ],
        },
        {
          name: "posts",
          columns: [
            { name: "id", type: "integer", nullable: false, unique: true, primaryKey: true, default: { kind: "autoincrement" } },
            { name: "author_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
          ],
        },
      ],
      [{ sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"], onDelete: "cascade" }]
    )

    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.output).toBe(
      [
        'import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core"',
        'import { relations } from "drizzle-orm"',
        "",
        'export const users = pgTable("users", {',
        '  id: uuid("id").primaryKey().defaultRandom(),',
        '  email: varchar("email", { length: 255 }).notNull().unique(),',
        "})",
        "",
        'export const posts = pgTable("posts", {',
        '  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),',
        '  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),',
        "})",
        "",
        "export const usersRelations = relations(users, ({ one, many }) => ({",
        "  posts: many(posts),",
        "}))",
        "",
        "export const postsRelations = relations(posts, ({ one, many }) => ({",
        "  users: one(users, { fields: [posts.authorId], references: [users.id] }),",
        "}))",
      ].join("\n")
    )
  })

  // Prevents accidental non-determinism regressions: an iteration order
  // that silently depended on Map/Set insertion order (imports, relations
  // blocks) instead of the AST's own array order would make this fail
  // without changing what the AST "means."
  it("is deterministic: compiling the same AST twice produces byte-identical output", () => {
    const ast = buildAst([
      { name: "widgets", columns: [{ name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true }] },
    ])
    expect(drizzleCompiler.compile(ast)).toEqual(drizzleCompiler.compile(ast))
  })

  it("uses the 3-arg pgTable form with a composite primary key builder", () => {
    const ast = buildAst([
      {
        name: "post_tags",
        columns: [
          { name: "post_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
          { name: "tag_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
        ],
        primaryKey: { columns: ["post_id", "tag_id"] },
      },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Both columns are members of the resolved (table-level) primary key,
    // so each individually gets a .primaryKey() chain call — not just
    // .notNull() — matching how renderColumnProperty checks membership in
    // the resolved PK set, regardless of whether the PK was declared at
    // the table level or via a column-level flag.
    expect(result.output).toBe(
      [
        'import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core"',
        "",
        "export const postTags = pgTable(",
        '  "post_tags",',
        "  {",
        '    postId: uuid("post_id").primaryKey(),',
        '    tagId: uuid("tag_id").primaryKey(),',
        "  },",
        "  (table) => [primaryKey({ columns: [table.postId, table.tagId] })]",
        ")",
      ].join("\n")
    )
  })

  it("uses the 3-arg pgTable form for a table-level unique constraint", () => {
    const ast = buildAst([
      {
        name: "memberships",
        columns: [
          { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
          { name: "user_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
          { name: "org_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
        ],
        constraints: [{ kind: "unique", name: "uq_membership", columns: ["user_id", "org_id"] }],
      },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      [
        'import { integer, pgTable, unique, uuid } from "drizzle-orm/pg-core"',
        "",
        "export const memberships = pgTable(",
        '  "memberships",',
        "  {",
        '    id: integer("id").primaryKey(),',
        '    userId: uuid("user_id").notNull(),',
        '    orgId: uuid("org_id").notNull(),',
        "  },",
        '  (table) => [unique("uq_membership").on(table.userId, table.orgId)]',
        ")",
      ].join("\n")
    )
  })

  it("uses the 3-arg pgTable form for an index, choosing uniqueIndex when marked unique", () => {
    const ast = buildAst([
      {
        name: "users",
        columns: [
          { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
          { name: "email", type: "string", nullable: false, unique: false, primaryKey: false },
        ],
        indexes: [{ name: "idx_users_email", columns: ["email"], unique: true }],
      },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      [
        'import { integer, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core"',
        "",
        "export const users = pgTable(",
        '  "users",',
        "  {",
        '    id: integer("id").primaryKey(),',
        '    email: varchar("email", { length: 255 }).notNull(),',
        "  },",
        '  (table) => [uniqueIndex("idx_users_email").on(table.email)]',
        ")",
      ].join("\n")
    )
  })

  it("emits the customType bytea helper exactly once, only when a binary column exists", () => {
    const ast = buildAst([
      {
        name: "files",
        columns: [
          { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
          { name: "data", type: "binary", nullable: true, unique: false, primaryKey: false },
        ],
      },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      [
        'import { customType, integer, pgTable } from "drizzle-orm/pg-core"',
        "",
        "const bytea = customType<{ data: Buffer }>({",
        "  dataType() {",
        '    return "bytea"',
        "  },",
        "})",
        "",
        'export const files = pgTable("files", {',
        '  id: integer("id").primaryKey(),',
        '  data: bytea("data"),',
        "})",
      ].join("\n")
    )
    // A separate, narrower check than the exact match above: the helper
    // must appear exactly once even though this compiles fine on its own —
    // kept as an explicit count assertion since "exactly once" is a
    // distinct property from "the output is this text."
    expect(result.output.match(/const bytea = customType/g)).toHaveLength(1)
  })

  it("does not emit the bytea helper when no binary column exists", () => {
    const ast = buildAst([
      { name: "widgets", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).not.toContain("customType")
    expect(result.output).not.toContain("bytea")
  })

  it("renders an enum column as text() with a comment listing the allowed values", () => {
    const ast = buildAst([
      {
        name: "users",
        columns: [
          { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
          { name: "role", type: "enum", nullable: false, unique: false, primaryKey: false, enumValues: ["admin", "member"] },
        ],
      },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      [
        'import { integer, pgTable, text } from "drizzle-orm/pg-core"',
        "",
        'export const users = pgTable("users", {',
        '  id: integer("id").primaryKey(),',
        '  // role: one of "admin", "member"',
        '  role: text("role").notNull(),',
        "})",
      ].join("\n")
    )
  })

  it("renders an expression default via sql`` and imports sql from drizzle-orm", () => {
    const ast = buildAst([
      {
        name: "widgets",
        columns: [
          { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
          {
            name: "code",
            type: "string",
            nullable: false,
            unique: false,
            primaryKey: false,
            default: { kind: "expression", expression: "upper(gen_random_uuid()::text)" },
          },
        ],
      },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      [
        'import { integer, pgTable, varchar } from "drizzle-orm/pg-core"',
        'import { sql } from "drizzle-orm"',
        "",
        'export const widgets = pgTable("widgets", {',
        '  id: integer("id").primaryKey(),',
        '  code: varchar("code", { length: 255 }).notNull().default(sql`upper(gen_random_uuid()::text)`),',
        "})",
      ].join("\n")
    )
  })

  it("gives composite (multi-column) relationships a relations() entry only, no physical .references()", () => {
    const ast = buildAst(
      [
        {
          name: "a",
          columns: [
            { name: "x", type: "integer", nullable: false, unique: false, primaryKey: false },
            { name: "y", type: "integer", nullable: false, unique: false, primaryKey: false },
          ],
        },
        {
          name: "b",
          columns: [
            { name: "x", type: "integer", nullable: false, unique: false, primaryKey: true },
            { name: "y", type: "integer", nullable: false, unique: false, primaryKey: true },
          ],
          primaryKey: { columns: ["x", "y"] },
        },
      ],
      [{ sourceTable: "a", sourceColumns: ["x", "y"], targetTable: "b", targetColumns: ["x", "y"] }]
    )
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // toContain/not.toContain, not a full exact match: this test verifies
    // two specific properties (no physical FK, a correct relations()
    // entry) against a 2-table + relations fixture whose full rendered
    // form is already exercised in detail by the 2-arg/3-arg-form and
    // composite-PK tests above — asserting the whole document here would
    // just repeat that coverage under a different test name.
    expect(result.output).not.toContain(".references(")
    expect(result.output).toContain("one(b, { fields: [a.x, a.y], references: [b.x, b.y] })")
  })

  it("disambiguates duplicate relation keys with an occurrence-count suffix", () => {
    // Two FKs from the same source table to the same target table.
    const ast = buildAst(
      [
        { name: "users", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
        {
          name: "posts",
          columns: [
            { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
            { name: "author_id", type: "integer", nullable: false, unique: false, primaryKey: false },
            { name: "editor_id", type: "integer", nullable: true, unique: false, primaryKey: false },
          ],
        },
      ],
      [
        { sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] },
        { sourceTable: "posts", sourceColumns: ["editor_id"], targetTable: "users", targetColumns: ["id"] },
      ]
    )
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toContain("  users: one(users, { fields: [posts.authorId], references: [users.id] }),")
    expect(result.output).toContain("  users2: one(users, { fields: [posts.editorId], references: [users.id] }),")
  })

  it("relations() blocks are emitted regardless of ast.tables declaration order", () => {
    const ast = buildAst(
      [
        {
          name: "posts",
          columns: [
            { name: "id", type: "integer", nullable: false, unique: false, primaryKey: true },
            { name: "author_id", type: "integer", nullable: false, unique: false, primaryKey: false },
          ],
        },
        { name: "users", columns: [{ name: "id", type: "integer", nullable: false, unique: false, primaryKey: true }] },
      ],
      [{ sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] }]
    )
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // toContain: this test checks WHICH blocks get emitted regardless of
    // declaration order, not their exact content (pinned exactly by the
    // happy-path test already).
    expect(result.output).toContain("export const postsRelations")
    expect(result.output).toContain("export const usersRelations")
  })

  it("regression: compiles a self-referencing FK without a temporal-dead-zone error", () => {
    // render-relations.ts's own doc comment calls out exactly this hazard:
    // relations() blocks are emitted after every pgTable const specifically
    // so a relationship can reference a table declared earlier or later
    // without a temporal-dead-zone problem. A self-reference (source table
    // === target table, matching the real comments.parent_id shape seen in
    // production output) is the most direct possible test of that
    // guarantee — the table would need to reference its own
    // not-yet-fully-declared binding if this were handled naively.
    const ast = buildAst(
      [
        {
          name: "comments",
          columns: [
            { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true },
            { name: "parent_id", type: "uuid", nullable: true, unique: false, primaryKey: false },
          ],
        },
      ],
      [{ sourceTable: "comments", sourceColumns: ["parent_id"], targetTable: "comments", targetColumns: ["id"] }]
    )
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Exact match, not toContain: worth calling out that a self-reference
    // makes the table's own "one" and "many" relation entries collide on
    // the same base key ("comments"), which exercises the duplicate-key
    // suffixing logic too (comments / comments2) — a real, non-obvious
    // emergent behavior worth pinning precisely, not just approximately.
    expect(result.output).toBe(
      [
        'import { pgTable, uuid } from "drizzle-orm/pg-core"',
        'import { relations } from "drizzle-orm"',
        "",
        'export const comments = pgTable("comments", {',
        '  id: uuid("id").primaryKey(),',
        '  parentId: uuid("parent_id").references(() => comments.id),',
        "})",
        "",
        "export const commentsRelations = relations(comments, ({ one, many }) => ({",
        "  comments: one(comments, { fields: [comments.parentId], references: [comments.id] }),",
        "  comments2: many(comments),",
        "}))",
      ].join("\n")
    )
  })

  it("converts snake_case AST names to camelCase bindings and property names", () => {
    const ast = buildAst([
      {
        name: "user_profiles",
        columns: [{ name: "display_name", type: "string", nullable: false, unique: false, primaryKey: false }],
      },
    ])
    const result = drizzleCompiler.compile(ast)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      [
        'import { pgTable, varchar } from "drizzle-orm/pg-core"',
        "",
        'export const userProfiles = pgTable("user_profiles", {',
        '  displayName: varchar("display_name", { length: 255 }).notNull(),',
        "})",
      ].join("\n")
    )
  })
})
