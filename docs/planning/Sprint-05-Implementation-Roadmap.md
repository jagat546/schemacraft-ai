# Sprint 5 — AI Provider Architecture Roadmap

**Task ID:** S5-000
**Status:** Planning deliverable, drafted at the start of S5-001 (this repository had no `Sprint-05-Implementation-Roadmap.md` when S5-001 was requested — see note below). No application code in this document.
**Author role:** Senior Staff Engineer / Tech Lead, implementation planning.
**Source of truth:** The S5-001 task brief provided directly by the project owner (AI Architecture Foundation: provider interface, request/response types, prompt-builder abstraction, parser abstraction, error types, retry-strategy interfaces, DI pattern for providers — architecture only, no external SDK integration). Cross-referenced against `SCHEMACRAFT_AI_MASTER_CONTEXT.md`, `CLAUDE.md`, and a direct audit of `lib/ai/`, `lib/actions/`, `lib/services/`, `app/(dashboard)/`.

**Note on this document's origin:** this file did not exist when S5-001 was requested. Per explicit instruction from the project owner, it was drafted at that point (not invented speculatively ahead of time) to give S5-001 the same kind of task-scoped, acceptance-criteria-bearing planning record every Sprint 4 task had. S5-002 onward are sized as placeholders — purpose and rough scope only, not full task breakdowns — since they depend on decisions S5-001 itself makes (the shape of the provider interface, the registry, the DI seams) and shouldn't be pre-specified in detail before that foundation exists.

**Naming note:** an unrelated, pre-existing `docs/architecture/sprint5-ast.md` also uses "Sprint 5" — that document is a historical record of the Canonical Schema AST / compiler-pipeline migration (shipped as `v0.7.0`, before this project's Sprint 0/1/3A/4 numbering was established). It has no relationship to this roadmap; the naming collision is a pre-existing repository quirk, not a numbering conflict introduced here.

---

## 1. Executive Summary

Sprint 4 (UX 2.0 Implementation) is closed. This sprint turns the product's AI integration — currently one hard-coded Gemini call, invoked directly by `lib/services/generation.service.ts` with no seam for a second provider — into a proper, extensible architecture: a provider interface, typed request/response/error contracts, a prompt-builder and response-parser abstraction per provider, a retry-strategy interface, and a dependency-injection-friendly provider registry. The existing, working Gemini integration is refactored onto this architecture (not duplicated alongside it); no new external AI SDK (Anthropic, OpenAI) is integrated in S5-001 itself.

**Audit finding that shaped this plan:** `lib/ai/providers/interface.ts` already defines a minimal `AIProviderAdapter` contract (`generateAST(input): Promise<GenerateASTResult>`), and it is already the only thing `lib/ai/providers/gemini.ts` implements — this codebase anticipated needing a provider abstraction (its own code comments say so directly: "a future non-Gemini provider would build its own prompt in its own shape... not reuse this," in `gemini-prompts.ts`) but never generalized past one concrete provider, because until now nothing needed a second one. S5-001 is the task that generalizes it, not a greenfield design.

## 2. Sprint 5 Roadmap

| Task | Theme |
|---|---|
| **S5-001** | AI Architecture Foundation — provider interface, request/response/error types, prompt-builder/response-parser abstractions, retry-strategy interface + a reference implementation, a provider registry (dependency injection), and a refactor of the existing Gemini integration onto all of it. No new SDK. |
| **S5-002** *(placeholder)* | Anthropic provider implementation — integrate `@anthropic-ai/sdk`, implement the S5-001 interfaces (prompt builder, response parser, provider factory), register it in the provider registry, add its config/env var, add provider-specific tests. Depends entirely on S5-001's interfaces being stable. |
| **S5-003** *(placeholder)* | OpenAI provider implementation — same shape as S5-002, for the OpenAI Chat Completions (or Structured Outputs) API. |
| **S5-004** *(placeholder)* | Provider selection — a deliberate decision (env var, per-request override, or an admin/account-level setting) for which registered provider actually serves a generation, once more than one is registered; almost certainly needs its own short decision record, not a default assumption. |
| **S5-005** *(placeholder)* | Sprint 5 closure — cross-provider regression pass, `TECH_DEBT.md`/`SCHEMACRAFT_AI_MASTER_CONTEXT.md` sync, a `Sprint-05-Closure.md` mirroring Sprint 4's own closure pattern. |

S5-002 onward are intentionally light — sizing them in detail now would mean guessing at interfaces S5-001 hasn't finalized yet. Each should get its own short planning pass (mirroring this document's own S5-001 section) once the task before it lands.

---

## 3. Task Breakdown

### S5-001 — AI Architecture Foundation

- **Purpose:** Replace the single hard-coded Gemini call path with a proper, extensible AI provider architecture, so adding Anthropic/OpenAI later is a matter of implementing an interface and registering a factory, not restructuring `lib/ai/` again.
- **Repository areas affected:** `lib/ai/` (new architecture layer), `lib/ai/providers/` (interfaces + refactored Gemini implementation), `lib/services/generation.service.ts` (provider now injected, defaulted rather than hard-imported), `lib/config.ts` (relocated to `lib/ai/config.ts` — it was already 100% AI-specific with a single consumer).
- **Dependencies:** None — first task of the sprint, building directly on Sprint 4's already-closed, verified baseline.
- **Estimated complexity:** L — touches the one runtime path every generation goes through, so correctness (not just typing) has to be verified by the same test suite that already covers `generation.service.ts`'s pure logic, plus new tests for every new piece.
- **Acceptance criteria:** `AIProviderAdapter` is provider-agnostic (no Gemini-specific types leak into it); `GenerateASTInput`/`GenerateASTResult` are superseded by richer `AIGenerationRequest`/`AIGenerationResponse` types carrying structured `AIProviderError`s, not bare strings, at the provider boundary; a `PromptBuilder<TPrompt>` and `ResponseParser<TResponse>` interface exist and Gemini's existing prompt-construction/response-parsing logic is refactored to implement them (not duplicated); a `RetryStrategy` interface exists with at least one concrete, unit-tested implementation; an `AIProviderRegistry` (register/resolve/list, mirroring the existing `CompilerRegistry` convention in `lib/compiler/registry.ts`) exists and is what `generation.service.ts` resolves its default provider from; `generation.service.ts`'s exported functions accept an optional injected provider, defaulting to the registry's default so every existing call site (`lib/actions/generate-schema.ts`, `lib/actions/generate-schema-public.ts`) needs zero changes; the outer `GenerateArtifactsResult`/`GenerateAndPersistResult` contract (still `error: string`) is unchanged, so the Server Action and UI layers built across Sprint 4 need no changes either; no `@anthropic-ai/sdk` or `openai` package is added to `package.json`.
- **Definition of Done:** `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all pass; full JSDoc on every exported type/interface/class/function in the new `lib/ai/` architecture files; a completion report covering files created/modified, architectural decisions, reusable abstractions, risks, and validation results, per the task brief's own required format.
- **Risks:** The main risk is silently changing the live Gemini pipeline's runtime behavior while "just" refactoring its structure — mitigated by keeping the outer service-layer contract (`GenerateArtifactsResult`/`GenerateAndPersistResult`, both still plain `error: string`) byte-for-byte unchanged, and by treating one genuine behavior addition (retry-on-transient-error, see completion report) as a deliberate, disclosed decision rather than an incidental side effect.
- **Suggested commit message:** `feat(ai): establish extensible AI provider architecture (interfaces, DI, retry strategy)`
- **Suggested branch strategy:** `feature/s5-001-ai-architecture-foundation`, cut from `main` (Sprint 4's closure branch merges before this starts).
- **Expected files:** `lib/ai/{config,errors,types,retry-strategy,provider-registry}.ts` (+ colocated tests), `lib/ai/providers/{interface,prompt-builder.interface,response-parser.interface,gemini,gemini-prompts,gemini-parser}.ts` (+ colocated tests), `lib/services/generation.service.ts` (dependency-injection seam only).
- **Testing strategy:** Unit tests for every new pure piece (error classes' `retryable`/`code` invariants, `RetryStrategy` implementations' `shouldRetry`/`getDelayMs` logic, `AIProviderRegistry`'s register/resolve/duplicate-name behavior, the Gemini response parser's envelope-interpretation logic against constructed fixture responses) — mirroring this codebase's existing convention of testing pure logic directly rather than mocking the AI SDK itself (no test in this repository today mocks `@google/genai`, and this task doesn't start that pattern). No new live-API-call test is added or expected.

---

## 4. Placeholder Tasks (not yet detailed)

### S5-002 — Anthropic Provider Implementation
Implement `AIProviderAdapter` for Anthropic's Messages API: a prompt builder producing Anthropic's message shape, a response parser interpreting its envelope (stop reasons, content blocks) into `AIGenerationResponse`, error mapping into the shared `AIProviderError` hierarchy, registration in `AIProviderRegistry`, config (model name, API key env var), and tests mirroring S5-001's Gemini test coverage. Requires adding `@anthropic-ai/sdk` to `package.json` — the first task in this sprint that does.

### S5-003 — OpenAI Provider Implementation
Same shape as S5-002, for OpenAI. Requires adding `openai` to `package.json`.

### S5-004 — Provider Selection
Once two or more providers are registered, something has to decide which one actually serves a given generation. Needs its own short decision record before implementation — the options (a single env-var-selected default, a per-account setting, a per-request override, automatic fallback on provider failure) have materially different UX, cost, and reliability implications and shouldn't be decided as a side effect of wiring code.

### S5-005 — Sprint 5 Closure
Full CI-mirrored validation across every provider added this sprint, `TECH_DEBT.md`/`SCHEMACRAFT_AI_MASTER_CONTEXT.md` sync, and a `Sprint-05-Closure.md` — the same closure pattern `Sprint-04-Closure.md` established.
