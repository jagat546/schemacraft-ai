// Every identifier the SQL compiler emits is double-quoted. This sidesteps
// the analyzer's RESERVED_KEYWORD warning entirely at the compiler level
// (a quoted identifier is never ambiguous with a keyword) and preserves
// whatever case the AST specifies, rather than relying on Postgres's
// fold-to-lowercase-when-unquoted default.
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

// Standard SQL string-literal escaping (double the single quotes). This
// is a correctness concern for the compiler, not a user-input trust
// boundary: AST default values are already-validated data, but literal
// values can still legitimately contain an apostrophe (e.g. "O'Brien").
export function escapeStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}
