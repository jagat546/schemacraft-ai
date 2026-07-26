// "gemini-flash-latest" is a Google-maintained alias that always resolves
// to their current recommended flash model, rather than a fixed dated
// snapshot. Chosen deliberately over pinning a specific version: dated
// snapshots (e.g. "gemini-2.5-flash") can stop being available to a given
// API key/project ("no longer available to new users") or become
// globally overloaded, while the alias is Google's own answer to "what
// should currently be used." The tradeoff is that its behavior can shift
// whenever Google repoints the alias — acceptable here since output is
// shape- and semantically-validated (lib/ast) before anything downstream
// trusts it.
export const aiConfig = {
  model: "gemini-flash-latest",
  maxTokens: 12288,
  requestTimeoutMs: 30_000,
} as const

// S5-002: Claude Sonnet 5 is Anthropic's current flagship model at the
// time this provider was added (unlike Gemini's alias above, Anthropic
// versions its model identifiers directly rather than offering a
// perpetually-repointed "latest" alias) — a deliberate, named choice, not
// a placeholder. maxTokens/requestTimeoutMs mirror aiConfig's own values;
// nothing about generating a CanonicalSchemaAST is provider-specific
// enough to need different limits yet.
export const anthropicConfig = {
  model: "claude-sonnet-5",
  maxTokens: 12288,
  requestTimeoutMs: 30_000,
} as const
