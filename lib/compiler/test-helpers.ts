import { CURRENT_AST_VERSION } from "@/lib/ast/schema"
import type { CanonicalSchemaAST, RelationshipNode, TableNode } from "@/lib/ast/types"

// Setup-only helper shared by all 5 compiler test suites
// (lib/compiler/{sql,drizzle,json,markdown,mermaid}/*.test.ts). The
// { astVersion, tables, relationships } wrapper is identical, uninteresting
// boilerplate in every single compiler test — never itself the subject of
// an assertion — so it's extracted here rather than repeated by hand at
// every call site. Deliberately does NOT touch expected output strings;
// those remain handwritten inside each test file per compiler.
export function buildAst(tables: TableNode[], relationships: RelationshipNode[] = []): CanonicalSchemaAST {
  return { astVersion: CURRENT_AST_VERSION, tables, relationships }
}
