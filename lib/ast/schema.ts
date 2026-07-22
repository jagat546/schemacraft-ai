import { z } from "zod"

// The Canonical Schema AST: a database-agnostic description of a schema
// design. This is the ONLY shape an AI provider is allowed to produce
// (see lib/ai/providers/interface.ts) and the ONLY input a compiler is
// allowed to read from (see lib/compiler). Nothing dialect-specific
// belongs here except through the `extensions` escape hatch on the nodes
// that need it.
//
// This file is the single source of truth for the AST shape. Types are
// derived from these schemas via z.infer (see the bottom of this file and
// lib/ast/types.ts) so the runtime contract and the compile-time contract
// can never drift apart.

// Versions the AST *shape* itself (independent of the app's package
// version), so a future breaking change to this contract has somewhere
// to hang a migration off of. lib/ast/validator.ts rejects any AST whose
// astVersion isn't in SUPPORTED_AST_VERSIONS, even if it is otherwise
// structurally valid.
export const CURRENT_AST_VERSION = "1.0.0" as const
export const SUPPORTED_AST_VERSIONS: readonly string[] = [CURRENT_AST_VERSION]

export const columnTypeSchema = z.enum([
  "string",
  "text",
  "integer",
  "bigint",
  "float",
  "decimal",
  "boolean",
  "date",
  "timestamp",
  "uuid",
  "json",
  "binary",
  "enum",
])

export const columnDefaultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("literal"),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
  z.object({ kind: z.literal("now") }),
  z.object({ kind: z.literal("uuid") }),
  z.object({ kind: z.literal("autoincrement") }),
  z.object({ kind: z.literal("expression"), expression: z.string().min(1) }),
])

export const columnNodeSchema = z.object({
  name: z.string().min(1),
  type: columnTypeSchema,
  nullable: z.boolean(),
  unique: z.boolean(),
  primaryKey: z.boolean(),
  default: columnDefaultSchema.optional(),
  // Only meaningful when type === "enum"; the analyzer does not currently
  // enforce that pairing, but compilers may.
  enumValues: z.array(z.string()).optional(),
  comment: z.string().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

export const primaryKeyNodeSchema = z.object({
  columns: z.array(z.string().min(1)).min(1),
  name: z.string().optional(),
})

export const foreignKeyActionSchema = z.enum([
  "cascade",
  "restrict",
  "set-null",
  "set-default",
  "no-action",
])

export const relationshipNodeSchema = z.object({
  name: z.string().optional(),
  sourceTable: z.string().min(1),
  sourceColumns: z.array(z.string().min(1)).min(1),
  targetTable: z.string().min(1),
  targetColumns: z.array(z.string().min(1)).min(1),
  onDelete: foreignKeyActionSchema.optional(),
  onUpdate: foreignKeyActionSchema.optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

export const indexNodeSchema = z.object({
  name: z.string().min(1),
  columns: z.array(z.string().min(1)).min(1),
  unique: z.boolean().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

export const tableConstraintNodeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("unique"),
    name: z.string().optional(),
    columns: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    kind: z.literal("check"),
    name: z.string().optional(),
    expression: z.string().min(1),
  }),
])

export const tableNodeSchema = z.object({
  name: z.string().min(1),
  columns: z.array(columnNodeSchema).min(1),
  primaryKey: primaryKeyNodeSchema.optional(),
  constraints: z.array(tableConstraintNodeSchema).optional(),
  indexes: z.array(indexNodeSchema).optional(),
  comment: z.string().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

export const canonicalSchemaASTSchema = z.object({
  // Versions the AST shape itself, independent of app/package versions,
  // so future breaking changes to this contract can be migrated.
  astVersion: z.string().min(1),
  tables: z.array(tableNodeSchema).min(1),
  relationships: z.array(relationshipNodeSchema),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

export type ColumnType = z.infer<typeof columnTypeSchema>
export type ColumnDefault = z.infer<typeof columnDefaultSchema>
export type ColumnNode = z.infer<typeof columnNodeSchema>
export type PrimaryKeyNode = z.infer<typeof primaryKeyNodeSchema>
export type ForeignKeyAction = z.infer<typeof foreignKeyActionSchema>
export type RelationshipNode = z.infer<typeof relationshipNodeSchema>
export type IndexNode = z.infer<typeof indexNodeSchema>
export type TableConstraintNode = z.infer<typeof tableConstraintNodeSchema>
export type TableNode = z.infer<typeof tableNodeSchema>
export type CanonicalSchemaAST = z.infer<typeof canonicalSchemaASTSchema>
