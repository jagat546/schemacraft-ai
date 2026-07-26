import { describe, expect, it } from "vitest"

import { AnalysisErrorCode, AnalysisWarningCode, analyzeSchema } from "@/lib/ast/analyzer"
import { CURRENT_AST_VERSION } from "@/lib/ast/schema"
import type { CanonicalSchemaAST, ColumnNode, TableNode } from "@/lib/ast/types"

// Every fixture below gives each table a valid, unambiguous primary key
// (an "id" column, primaryKey: true) and avoids reserved-keyword names
// unless a test is specifically about primary keys or reserved keywords.
// This keeps each test isolated to exactly the one diagnostic it names —
// asserting an exact errors/warnings array, not just "contains at least
// one entry of the right code," requires fixtures that don't incidentally
// trip unrelated checks.

function idColumn(): ColumnNode {
  return { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true }
}

function table(overrides: Partial<TableNode> & { name: string }): TableNode {
  return { columns: [idColumn()], ...overrides }
}

function ast(overrides: Partial<CanonicalSchemaAST> = {}): CanonicalSchemaAST {
  return { astVersion: CURRENT_AST_VERSION, tables: [], relationships: [], ...overrides }
}

describe("analyzeSchema", () => {
  it("reports no errors or warnings for a clean, non-trivial schema", () => {
    // The happy path deliberately isn't trivial — multiple tables, a real
    // relationship — so it actually exercises checkRelationship and not
    // just the empty-input case.
    const result = analyzeSchema(
      ast({
        tables: [
          table({
            name: "users",
            columns: [idColumn(), { name: "email", type: "string", nullable: false, unique: true, primaryKey: false }],
          }),
          table({
            name: "posts",
            columns: [
              idColumn(),
              { name: "author_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
            ],
          }),
        ],
        relationships: [
          { sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] },
        ],
      })
    )
    expect(result).toEqual({ valid: true, errors: [], warnings: [] })
  })

  describe("DUPLICATE_TABLE", () => {
    it("flags two tables with the same name", () => {
      const result = analyzeSchema(
        ast({ tables: [table({ name: "users" }), table({ name: "users" })] })
      )
      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        { code: AnalysisErrorCode.DuplicateTable, message: 'Duplicate table "users".', table: "users" },
      ])
    })

    it("flags duplicates case-insensitively, reporting the second table's own casing", () => {
      const result = analyzeSchema(
        ast({ tables: [table({ name: "Users" }), table({ name: "users" })] })
      )
      expect(result.errors).toEqual([
        { code: AnalysisErrorCode.DuplicateTable, message: 'Duplicate table "users".', table: "users" },
      ])
    })
  })

  describe("DUPLICATE_COLUMN", () => {
    it("flags two columns with the same name in one table", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              columns: [
                idColumn(),
                { name: "email", type: "string", nullable: false, unique: false, primaryKey: false },
                { name: "email", type: "string", nullable: false, unique: false, primaryKey: false },
              ],
            }),
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.DuplicateColumn,
          message: 'Duplicate column "email" in table "users".',
          table: "users",
          column: "email",
        },
      ])
    })

    it("flags duplicates case-insensitively", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              columns: [
                idColumn(),
                { name: "Email", type: "string", nullable: false, unique: false, primaryKey: false },
                { name: "email", type: "string", nullable: false, unique: false, primaryKey: false },
              ],
            }),
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.DuplicateColumn,
          message: 'Duplicate column "email" in table "users".',
          table: "users",
          column: "email",
        },
      ])
    })
  })

  describe("FK_SOURCE_TABLE_NOT_FOUND", () => {
    it("flags a relationship whose sourceTable doesn't exist", () => {
      const result = analyzeSchema(
        ast({
          tables: [table({ name: "users" })],
          relationships: [
            { sourceTable: "ghost", sourceColumns: ["id"], targetTable: "users", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.FkSourceTableNotFound,
          message: 'Relationship references unknown source table "ghost".',
          table: "ghost",
        },
      ])
    })
  })

  describe("FK_SOURCE_COLUMN_NOT_FOUND", () => {
    it("flags a relationship whose sourceColumns includes a column not on the source table", () => {
      const result = analyzeSchema(
        ast({
          tables: [table({ name: "posts" }), table({ name: "users" })],
          relationships: [
            { sourceTable: "posts", sourceColumns: ["ghost_column"], targetTable: "users", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.FkSourceColumnNotFound,
          message: 'Relationship on "posts" references unknown source column "ghost_column".',
          table: "posts",
          column: "ghost_column",
        },
      ])
    })
  })

  describe("FK_TARGET_TABLE_NOT_FOUND", () => {
    it("flags a relationship whose targetTable doesn't exist", () => {
      const result = analyzeSchema(
        ast({
          tables: [table({ name: "posts" })],
          relationships: [
            { sourceTable: "posts", sourceColumns: ["id"], targetTable: "ghost", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.FkTargetTableNotFound,
          message: 'Relationship references unknown target table "ghost".',
          table: "ghost",
        },
      ])
    })
  })

  describe("FK_TARGET_COLUMN_NOT_FOUND", () => {
    it("flags a relationship whose targetColumns includes a column not on the target table", () => {
      const result = analyzeSchema(
        ast({
          tables: [table({ name: "posts" }), table({ name: "users" })],
          relationships: [
            { sourceTable: "posts", sourceColumns: ["id"], targetTable: "users", targetColumns: ["ghost_column"] },
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.FkTargetColumnNotFound,
          message: 'Relationship on "users" references unknown target column "ghost_column".',
          table: "users",
          column: "ghost_column",
        },
      ])
    })
  })

  describe("FK_COLUMN_COUNT_MISMATCH", () => {
    it("flags a relationship whose sourceColumns and targetColumns lengths differ", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "posts",
              columns: [idColumn(), { name: "extra", type: "uuid", nullable: false, unique: false, primaryKey: false }],
            }),
            table({ name: "users" }),
          ],
          relationships: [
            {
              name: "fk_posts_users",
              sourceTable: "posts",
              sourceColumns: ["id", "extra"],
              targetTable: "users",
              targetColumns: ["id"],
            },
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.FkColumnCountMismatch,
          message: 'Relationship "fk_posts_users" has mismatched source/target column counts.',
          table: "posts",
        },
      ])
    })
  })

  describe("INDEX_UNKNOWN_COLUMN", () => {
    it("flags an index referencing a column not on the table", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              indexes: [{ name: "idx_users_ghost", columns: ["ghost_column"] }],
            }),
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.IndexUnknownColumn,
          message: 'Index "idx_users_ghost" on table "users" references unknown column "ghost_column".',
          table: "users",
          column: "ghost_column",
        },
      ])
    })
  })

  describe("PRIMARY_KEY_UNKNOWN_COLUMN", () => {
    it("flags a table-level primary key referencing a column not on the table", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              columns: [{ name: "email", type: "string", nullable: false, unique: false, primaryKey: false }],
              primaryKey: { columns: ["ghost_column"] },
            }),
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.PrimaryKeyUnknownColumn,
          message: 'Primary key on table "users" references unknown column "ghost_column".',
          table: "users",
          column: "ghost_column",
        },
      ])
    })
  })

  describe("PRIMARY_KEY_CONFLICT", () => {
    it("flags a column-level primaryKey flag that disagrees with the table-level primary key", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              columns: [
                { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: false },
                { name: "email", type: "string", nullable: false, unique: false, primaryKey: true },
              ],
              primaryKey: { columns: ["id"] },
            }),
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.PrimaryKeyConflict,
          message:
            'Table "users" declares a table-level primary key that conflicts with column-level primaryKey flags (email).',
          table: "users",
        },
      ])
    })
  })

  describe("UNSAFE_EXPRESSION", () => {
    it("flags a column default expression containing a statement terminator", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              columns: [
                idColumn(),
                {
                  name: "x",
                  type: "integer",
                  nullable: false,
                  unique: false,
                  primaryKey: false,
                  default: { kind: "expression", expression: "1); DROP TABLE users; --" },
                },
              ],
            }),
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.UnsafeExpression,
          message:
            'Default expression for column "x" in table "users" contains a statement terminator or comment marker, which is not allowed.',
          table: "users",
          column: "x",
        },
      ])
    })

    it("flags a check constraint containing a comment marker", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              constraints: [{ kind: "check", name: "chk_x", expression: "x > 0 -- always true" }],
            }),
          ],
        })
      )
      expect(result.errors).toEqual([
        {
          code: AnalysisErrorCode.UnsafeExpression,
          message:
            'Check constraint "chk_x" on table "users" contains a statement terminator or comment marker, which is not allowed.',
          table: "users",
        },
      ])
    })

    it("does not flag a benign expression default or check constraint", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              columns: [
                idColumn(),
                {
                  name: "x",
                  type: "integer",
                  nullable: false,
                  unique: false,
                  primaryKey: false,
                  default: { kind: "expression", expression: "gen_random_uuid()" },
                },
              ],
              constraints: [{ kind: "check", expression: "x > 0" }],
            }),
          ],
        })
      )
      expect(result.errors).toEqual([])
    })
  })

  describe("MISSING_PRIMARY_KEY", () => {
    it("warns when a table has no table-level or column-level primary key", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            {
              name: "logs",
              columns: [{ name: "message", type: "text", nullable: false, unique: false, primaryKey: false }],
            },
          ],
        })
      )
      expect(result.valid).toBe(true)
      expect(result.warnings).toEqual([
        {
          code: AnalysisWarningCode.MissingPrimaryKey,
          message: 'Table "logs" has no primary key defined.',
          table: "logs",
        },
      ])
    })

    it("does not warn when a column is flagged primaryKey even without a table-level primaryKey", () => {
      const result = analyzeSchema(ast({ tables: [table({ name: "users" })] }))
      expect(result.warnings).toEqual([])
    })
  })

  describe("RESERVED_KEYWORD", () => {
    it("warns when a table name is a reserved SQL keyword", () => {
      const result = analyzeSchema(ast({ tables: [table({ name: "order" })] }))
      expect(result.warnings).toEqual([
        {
          code: AnalysisWarningCode.ReservedKeyword,
          message: 'Table "order" is a reserved SQL keyword and may need quoting.',
          table: "order",
          column: undefined,
        },
      ])
    })

    it("warns when a column name is a reserved SQL keyword", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "users",
              columns: [idColumn(), { name: "select", type: "string", nullable: false, unique: false, primaryKey: false }],
            }),
          ],
        })
      )
      expect(result.warnings).toEqual([
        {
          code: AnalysisWarningCode.ReservedKeyword,
          message: 'Column "select" in table "users" is a reserved SQL keyword and may need quoting.',
          table: "users",
          column: "select",
        },
      ])
    })
  })

  describe("CIRCULAR_FOREIGN_KEY", () => {
    it("warns on a self-referencing foreign key", () => {
      // Matches a real shape observed in production output: a
      // comments.parent_id -> comments.id self-reference (threaded
      // comments). Regression coverage for that exact case, not just a
      // synthetic one.
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "comments",
              columns: [idColumn(), { name: "parent_id", type: "uuid", nullable: true, unique: false, primaryKey: false }],
            }),
          ],
          relationships: [
            { sourceTable: "comments", sourceColumns: ["parent_id"], targetTable: "comments", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.valid).toBe(true)
      expect(result.warnings).toEqual([
        {
          code: AnalysisWarningCode.CircularForeignKey,
          message: "Circular foreign key relationship detected: comments -> comments.",
        },
      ])
    })

    it("warns on a two-table cycle", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({
              name: "a",
              columns: [idColumn(), { name: "b_id", type: "uuid", nullable: true, unique: false, primaryKey: false }],
            }),
            table({
              name: "b",
              columns: [idColumn(), { name: "a_id", type: "uuid", nullable: true, unique: false, primaryKey: false }],
            }),
          ],
          relationships: [
            { sourceTable: "a", sourceColumns: ["b_id"], targetTable: "b", targetColumns: ["id"] },
            { sourceTable: "b", sourceColumns: ["a_id"], targetTable: "a", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe(AnalysisWarningCode.CircularForeignKey)
    })

    it("does not warn on a simple, non-cyclic relationship", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "users" }),
            table({
              name: "posts",
              columns: [idColumn(), { name: "author_id", type: "uuid", nullable: false, unique: false, primaryKey: false }],
            }),
          ],
          relationships: [
            { sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })
  })

  describe("JOIN_TABLE_MISSING_UNIQUE_CONSTRAINT (TD-004)", () => {
    // The exact shape directly observed in a real "Blog" generation:
    // post_tags(post_id, tag_id) with a surrogate id PK and no unique
    // constraint on the FK pair, which allows duplicate relationship rows
    // at the database level. Previously pinned (S0-era) as a deliberate
    // "known gap, not yet fixed" baseline specifically so this test would
    // break and need updating once TD-004 was implemented — this is that
    // update.
    it("warns on a standard join table with a surrogate PK and no uniqueness on the FK pair", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "posts" }),
            table({ name: "tags" }),
            {
              name: "post_tags",
              columns: [
                idColumn(),
                { name: "post_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "tag_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
            },
          ],
          relationships: [
            { sourceTable: "post_tags", sourceColumns: ["post_id"], targetTable: "posts", targetColumns: ["id"] },
            { sourceTable: "post_tags", sourceColumns: ["tag_id"], targetTable: "tags", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.valid).toBe(true)
      expect(result.warnings).toEqual([
        {
          code: AnalysisWarningCode.JoinTableMissingUniqueConstraint,
          message:
            'Table "post_tags" looks like a many-to-many join table linking "post_id" and "tag_id", but has no composite uniqueness guarantee on that pair — duplicate relationship rows are not prevented at the database level.',
          table: "post_tags",
        },
      ])
    })

    it("does not warn when the join table has a composite table-level primary key", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "posts" }),
            table({ name: "tags" }),
            {
              name: "post_tags",
              columns: [
                { name: "post_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "tag_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
              primaryKey: { columns: ["post_id", "tag_id"] },
            },
          ],
          relationships: [
            { sourceTable: "post_tags", sourceColumns: ["post_id"], targetTable: "posts", targetColumns: ["id"] },
            { sourceTable: "post_tags", sourceColumns: ["tag_id"], targetTable: "tags", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("does not warn when the composite primary key is declared via column-level flags instead of table-level", () => {
      // Distinct code path from the test above: resolvePrimaryKeyColumnNames
      // falls back to column-level primaryKey flags when there's no
      // table-level primaryKey, exactly like the compiler's own
      // resolvePrimaryKeyColumns does.
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "posts" }),
            table({ name: "tags" }),
            {
              name: "post_tags",
              columns: [
                { name: "post_id", type: "uuid", nullable: false, unique: false, primaryKey: true },
                { name: "tag_id", type: "uuid", nullable: false, unique: false, primaryKey: true },
              ],
            },
          ],
          relationships: [
            { sourceTable: "post_tags", sourceColumns: ["post_id"], targetTable: "posts", targetColumns: ["id"] },
            { sourceTable: "post_tags", sourceColumns: ["tag_id"], targetTable: "tags", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("does not warn when the join table has a table-level composite unique constraint", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "posts" }),
            table({ name: "tags" }),
            {
              name: "post_tags",
              columns: [
                idColumn(),
                { name: "post_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "tag_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
              constraints: [{ kind: "unique", columns: ["post_id", "tag_id"] }],
            },
          ],
          relationships: [
            { sourceTable: "post_tags", sourceColumns: ["post_id"], targetTable: "posts", targetColumns: ["id"] },
            { sourceTable: "post_tags", sourceColumns: ["tag_id"], targetTable: "tags", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("does not warn when the join table has an equivalent unique index on the FK pair", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "posts" }),
            table({ name: "tags" }),
            {
              name: "post_tags",
              columns: [
                idColumn(),
                { name: "post_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "tag_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
              indexes: [{ name: "uq_post_tags", columns: ["post_id", "tag_id"], unique: true }],
            },
          ],
          relationships: [
            { sourceTable: "post_tags", sourceColumns: ["post_id"], targetTable: "posts", targetColumns: ["id"] },
            { sourceTable: "post_tags", sourceColumns: ["tag_id"], targetTable: "tags", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("warns on a self-referencing join table linking two rows of the same table", () => {
      // e.g. a friendships table linking two users — both relationships
      // target the same table, which this check must still catch since it
      // never inspects the target side at all.
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "users" }),
            {
              name: "friendships",
              columns: [
                idColumn(),
                { name: "user_id_a", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "user_id_b", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
            },
          ],
          relationships: [
            { sourceTable: "friendships", sourceColumns: ["user_id_a"], targetTable: "users", targetColumns: ["id"] },
            { sourceTable: "friendships", sourceColumns: ["user_id_b"], targetTable: "users", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([
        {
          code: AnalysisWarningCode.JoinTableMissingUniqueConstraint,
          message:
            'Table "friendships" looks like a many-to-many join table linking "user_id_a" and "user_id_b", but has no composite uniqueness guarantee on that pair — duplicate relationship rows are not prevented at the database level.',
          table: "friendships",
        },
      ])
    })

    it("does not warn on a self-referencing join table once it has a composite primary key", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "users" }),
            {
              name: "friendships",
              columns: [
                { name: "user_id_a", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "user_id_b", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
              primaryKey: { columns: ["user_id_a", "user_id_b"] },
            },
          ],
          relationships: [
            { sourceTable: "friendships", sourceColumns: ["user_id_a"], targetTable: "users", targetColumns: ["id"] },
            { sourceTable: "friendships", sourceColumns: ["user_id_b"], targetTable: "users", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("does not warn on an ordinary table with two foreign keys to the same target plus real business columns", () => {
      // posts.author_id and posts.editor_id both point at users, but posts
      // has substantial content columns beyond the FK pair — this is not a
      // join table, and warning here would be a false positive.
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "users" }),
            {
              name: "posts",
              columns: [
                idColumn(),
                { name: "author_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "editor_id", type: "uuid", nullable: true, unique: false, primaryKey: false },
                { name: "title", type: "string", nullable: false, unique: false, primaryKey: false },
                { name: "body", type: "text", nullable: false, unique: false, primaryKey: false },
              ],
            },
          ],
          relationships: [
            { sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] },
            { sourceTable: "posts", sourceColumns: ["editor_id"], targetTable: "users", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("does not warn on a table with only one outgoing relationship", () => {
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "users" }),
            table({
              name: "posts",
              columns: [idColumn(), { name: "author_id", type: "uuid", nullable: false, unique: false, primaryKey: false }],
            }),
          ],
          relationships: [
            { sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("does not warn on a table with a genuine composite (single, multi-column) foreign key", () => {
      // A single relationship whose sourceColumns has 2 entries is a
      // different shape from "two separate single-column relationships" —
      // this check only targets the latter (the classic join-table shape),
      // so a real composite FK to one target must not trigger it.
      const result = analyzeSchema(
        ast({
          tables: [
            table({ name: "b", columns: [idColumn(), { name: "y", type: "uuid", nullable: false, unique: false, primaryKey: false }] }),
            {
              name: "a",
              columns: [
                idColumn(),
                { name: "x", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "y", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
            },
          ],
          relationships: [
            { sourceTable: "a", sourceColumns: ["x", "y"], targetTable: "b", targetColumns: ["id", "y"] },
          ],
        })
      )
      expect(result.warnings).toEqual([])
    })

    it("is deterministic and reports one warning per qualifying table, in ast.tables order", () => {
      const build = () =>
        ast({
          tables: [
            table({ name: "posts" }),
            table({ name: "tags" }),
            table({ name: "users" }),
            {
              name: "post_tags",
              columns: [
                idColumn(),
                { name: "post_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "tag_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
            },
            {
              name: "friendships",
              columns: [
                idColumn(),
                { name: "user_id_a", type: "uuid", nullable: false, unique: false, primaryKey: false },
                { name: "user_id_b", type: "uuid", nullable: false, unique: false, primaryKey: false },
              ],
            },
          ],
          relationships: [
            { sourceTable: "post_tags", sourceColumns: ["post_id"], targetTable: "posts", targetColumns: ["id"] },
            { sourceTable: "post_tags", sourceColumns: ["tag_id"], targetTable: "tags", targetColumns: ["id"] },
            { sourceTable: "friendships", sourceColumns: ["user_id_a"], targetTable: "users", targetColumns: ["id"] },
            { sourceTable: "friendships", sourceColumns: ["user_id_b"], targetTable: "users", targetColumns: ["id"] },
          ],
        })

      const first = analyzeSchema(build())
      const second = analyzeSchema(build())
      expect(first).toEqual(second)
      expect(first.warnings.map((warning) => warning.table)).toEqual(["post_tags", "friendships"])
    })
  })
})
