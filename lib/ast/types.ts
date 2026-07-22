// Public type surface for the Canonical Schema AST. Consumers outside
// lib/ast should import from here rather than from schema.ts, so they
// depend on the AST's shape without depending on Zod directly.
//
// These types are not redeclared by hand — they are re-exported from
// schema.ts, which derives them from the Zod schemas via z.infer. That
// keeps exactly one definition of the AST shape, so the runtime-validated
// contract and the compile-time type can never drift apart.

export type {
  CanonicalSchemaAST,
  ColumnDefault,
  ColumnNode,
  ColumnType,
  ForeignKeyAction,
  IndexNode,
  PrimaryKeyNode,
  RelationshipNode,
  TableConstraintNode,
  TableNode,
} from "@/lib/ast/schema"
