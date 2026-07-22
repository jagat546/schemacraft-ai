// Mermaid entity/attribute names can't safely contain arbitrary
// characters; this is a defensive sanitizer (AST names are already
// validated non-empty strings, but not restricted to identifier-safe
// characters).
export function sanitizeMermaidIdentifier(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_")
  return sanitized.length > 0 ? sanitized : "_"
}
