import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { canonicalSchemaASTSchema, SUPPORTED_AST_VERSIONS } from "@/lib/ast/schema"

// Structural validation only: "is this a well-formed CanonicalSchemaAST,
// of a version this build knows how to compile?" This is the shape gate
// every AI-produced AST must pass through before it is ever handed to
// the semantic analyzer (lib/ast/analyzer.ts) or a compiler
// (lib/compiler). It does not check cross-references (FK targets, index
// columns, etc.) — that is the analyzer's job.

export type ASTValidationResult =
  | { ok: true; data: CanonicalSchemaAST }
  | { ok: false; errors: string[] }

export function validateASTShape(input: unknown): ASTValidationResult {
  const parsed = canonicalSchemaASTSchema.safeParse(input)

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
      ),
    }
  }

  if (!SUPPORTED_AST_VERSIONS.includes(parsed.data.astVersion)) {
    return {
      ok: false,
      errors: [
        `Unsupported AST version "${parsed.data.astVersion}". Supported versions: ${SUPPORTED_AST_VERSIONS.join(", ")}.`,
      ],
    }
  }

  return { ok: true, data: parsed.data }
}
