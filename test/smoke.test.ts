import { describe, expect, it } from "vitest"

// Harness verification only — not application test coverage. Proves the
// two integration risks identified during Phase A actually resolve before
// any real coverage is built on top of them: the "@/*" path alias, and the
// "react-server" condition that lets a module chain including
// lib/services/generation.service.ts (which has `import "server-only"`)
// load without throwing. Superseded once Phase 4 adds real
// generation.service.ts coverage; safe to remove at that point.
describe("vitest foundation", () => {
  it("resolves the @/* path alias", async () => {
    const { CURRENT_AST_VERSION } = await import("@/lib/ast/schema")
    expect(CURRENT_AST_VERSION).toBe("1.0.0")
  })

  it("resolves the react-server condition for server-only modules", async () => {
    const { buildGeneratedArtifacts } = await import("@/lib/services/generation.service")
    expect(typeof buildGeneratedArtifacts).toBe("function")
  })
})
