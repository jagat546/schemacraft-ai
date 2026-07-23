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

  describe("regression: known gap, not yet fixed (Milestone 2c, not in scope for Milestone 1)", () => {
    it("does not yet warn on a join table with no uniqueness constraint on its FK pair", () => {
      // Pins today's actual behavior for a shape directly observed in a
      // real "Blog" generation: post_tags(post_id, tag_id) with a
      // surrogate id PK and no unique constraint on the FK pair, which
      // allows duplicate relationship rows at the database level (tech
      // debt #3 / roadmap Milestone 2c). This is NOT a desired outcome —
      // it's a deliberate baseline pin so that when Milestone 2c adds the
      // new analyzer warning for this shape, this test has to be
      // intentionally updated to expect it, rather than silently
      // continuing to pass with the old expectation.
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
      expect(result).toEqual({ valid: true, errors: [], warnings: [] })
    })
  })
})
