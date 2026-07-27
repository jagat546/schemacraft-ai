# Sprint 5 — AI Provider Architecture — Closure

**This is the Sprint 5 execution record.** It tracks why Sprint 5 exists, what was done, what remains, and what closes it. For permanent, evergreen project facts (tech stack, architecture, features), see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — that information is deliberately not repeated here.

**Last updated:** 2026-07-27, after task S5-005 (Sprint 5 closure).

**Sprint 5 completion date:** 2026-07-27

---

## 1. Sprint Overview

- **Sprint name:** Sprint 5 — AI Provider Architecture
- **Sprint objective:** Replace the single hard-coded Gemini call `lib/services/generation.service.ts` made through Sprint 4 with a proper, extensible, provider-agnostic AI architecture — implement Anthropic and OpenAI alongside Gemini, and centralize which one actually serves a given generation — without changing the generation pipeline's public contract or any UI.
- **Sprint philosophy:** One roadmap task at a time, each fully validated (lint/typecheck/test/build) and committed before the next begins. Continue autonomously; stop only for a genuine architectural fork, roadmap ambiguity, unresolvable validation failure, or a product decision requiring explicit approval — provider *selection policy* was exactly that kind of decision (S5-004) and was not resolved unilaterally.
- **Current status:** ✅ **Completed.** All 5 roadmap tasks (S5-001 through S5-005) are complete, plus one architectural decision record (AD-005) reached mid-sprint. The repository builds, typechecks, lints, and tests clean as of the closing verification run in S5-005.

---

## 2. Why Sprint 5 Exists

Through Sprint 4, `lib/services/generation.service.ts` imported a concrete `geminiProvider` directly — there was no seam for a second AI provider, and `lib/ai/providers/interface.ts` already anticipated needing one (its own code comment: "`lib/ai/providers/gemini.ts` is the current, and only, implementation of this interface"). Sprint 5 exists to generalize that architecture and use it for real: implement Anthropic and OpenAI on top of it, and decide — deliberately, not as a side effect of wiring code — how a real generation picks which provider to use. Sprint 5 also carried one leftover open decision from Sprint 4's own closure: the delete-account implementation mechanism, explicitly deferred rather than resolved unilaterally at the time.

---

## 3. Completed Tasks

### S5-001 — AI Architecture Foundation
- **Status:** ✅ Complete (commit `941f616`).
- **Outcome:** `AIProviderAdapter` (provider contract), `AIGenerationRequest`/`AIGenerationResponse` (provider-agnostic types, superseding the old Gemini-specific `GenerateASTInput`/`GenerateASTResult`), an `AIProviderError` class hierarchy (each subclass carrying a fixed `retryable` flag), `PromptBuilder`/`ResponseParser` interfaces, a `RetryStrategy` interface with `ExponentialBackoffRetryStrategy`/`NoRetryStrategy` implementations, and `AIProviderRegistry` (mirroring `lib/compiler/registry.ts`'s own class-plus-factory convention). The existing Gemini integration was refactored onto all of this — not duplicated alongside it — including one disclosed behavior addition: Gemini calls now retry transient failures (rate limit/timeout/malformed response) via a 3-attempt exponential backoff, where none existed before. No external SDK beyond the already-integrated `@google/genai` was added, per this task's own explicit scope.

### S5-002 — Account Lifecycle Decision & AI Provider Expansion (Phase 1: AD-005; Phase 2: Anthropic)
- **Status:** ✅ Complete (commit `87c8dce`).
- **Outcome:** **AD-005** (`docs/architecture/AD-005-delete-account.md`) resolved the delete-account mechanism question left open at Sprint 4 closure, after auditing the actual schema/RLS rather than assuming from documentation: the full cascade chain (`profiles` → `projects` → `generations` → `user_preferences`, all `ON DELETE CASCADE` back to `auth.users`) already exists, and no Supabase Storage usage exists anywhere to clean up. Recommendation: hard delete, immediate, no grace period, via a new `SECURITY DEFINER` function `delete_own_account()` scoped to `auth.uid()` — no new secret required, directly analogous to two already-proven `SECURITY DEFINER` functions in this codebase (`handle_new_user`, `check_sandbox_rate_limit`). Judged straightforward enough to unblock Phase 2 without further user input, per that task's own instruction. **The Anthropic provider** was then implemented on S5-001's abstractions with zero duplicated logic: the actual database-design prompt content was extracted from `gemini-prompts.ts` into a new shared `lib/ai/ast-prompt-instructions.ts` (reused by both providers), and Anthropic's structured output is obtained via a forced tool call (`tool_choice`) rather than Gemini's free-text-JSON approach, since Anthropic has no equivalent JSON-schema response mode — the AST comes back through the tool-use block's already-parsed `input`, reusing the exact same `canonicalSchemaASTSchema` Gemini passes as its own `responseJsonSchema`.

### S5-003 — OpenAI Provider Implementation
- **Status:** ✅ Complete (commit `2a3e630`).
- **Outcome:** The OpenAI provider, using `response_format: { type: "json_schema", ... }` (non-strict, since strict mode's JSON-Schema-subset restrictions don't fit `canonicalSchemaASTSchema`'s optional fields without a schema-specific transform — `validateASTShape` remains the real conformance gate regardless of provider). **A real, test-confirmed bug was found and fixed while implementing this, not hypothetical:** OpenAI's SDK constructor throws immediately when no API key is configured, unlike Gemini's or Anthropic's constructors, which both defer any credential check to actual request time. Since `AIProviderRegistry` (via `createAIProviderRegistry()`) constructs every registered provider on every single generation, the pre-existing eager `export const openaiClient = new OpenAI(...)` module-level singleton would have crashed every generation — including Gemini-only ones — in any environment without `OPENAI_API_KEY` set, which is every environment today. Fixed by converting every provider's client (Gemini's and Anthropic's too, for consistency) to a lazily-constructed-and-cached getter, resolved inside each provider's own `generateAST()` call rather than at factory-construction time. This is an implementation-timing fix, not an architecture change — the public `AIProviderAdapter` interface, the DI parameter shape, the registry, the retry strategy, and the error hierarchy are all unchanged.

### S5-004 — Provider Selection
- **Status:** ✅ Complete (commit `49ba984`), per the accepted architecture decision (routing priority: explicit caller choice → `DEFAULT_AI_PROVIDER` environment variable → Gemini fallback; explicitly no automatic failover, provider chaining, cross-provider retry, load balancing, weighted routing, or cost-based routing — all deferred to future sprints, if ever wanted).
- **Outcome:** A new `lib/ai/provider-resolver.ts` (`resolveAIProvider()`) is now the single centralized place provider selection happens — fully typed, dependency-injected (registry and env both optional/overridable), and independently testable without any real SDK or network call (resolving a provider only looks it up, it never calls `generateAST()`). Invalid provider names throw a dedicated `InvalidAIProviderConfigurationError` naming the actual supported identifiers, rather than a generic lookup-miss message. `AIProviderRegistry` was simplified to a pure name→instance lookup table — its own prior "default provider" tracking (an `isDefault` flag, first-registered-wins) was removed entirely, since that was a second place the same policy could live, which is exactly what "centralized" means here. `generation.service.ts`'s public API stayed backwards compatible: `GenerationServiceDependencies` gained an optional `providerName` alongside the existing `provider` instance-injection escape hatch; existing callers (`lib/actions/generate-schema.ts`, `generate-schema-public.ts`) pass neither and are unaffected — confirmed via `git diff` that neither file changed.

### S5-005 — Sprint 5 Closure
- **Status:** ✅ Complete (this task).
- **Outcome:** Full validation (`lint`, `typecheck`, `test`, `build`) re-run clean on the fully-merged state. `TECH_DEBT.md` synchronized (TD-014's stale `lib/config.ts` path corrected to `lib/ai/config.ts`, plus an addendum noting Anthropic's/OpenAI's pinned-model-version trade-off, the inverse of Gemini's alias-based one). `SCHEMACRAFT_AI_MASTER_CONTEXT.md` synchronized (technology stack, repository structure, architecture overview, current features, repository status, known risks, sprint summary). This document written.

---

## 4. Remaining Sprint Tasks

None. All 5 roadmap tasks are complete. Two follow-ups were identified and deliberately left open, exactly as the roadmap's own scope boundaries anticipated:

- **Delete-account implementation itself** (the SQL function, the Server Action, the confirmation UI) — AD-005 resolved the *decision*, not the code. Recommended as its own future task.
- **A UI or account-level mechanism to actually select a non-default AI provider** — S5-004 built the selection *policy* (env var + explicit-name plumbing), not a way for a real user or operator to exercise it beyond setting `DEFAULT_AI_PROVIDER`. No product requirement for this existed within Sprint 5's own scope.

---

## 5. Current Repository Health

As of the Sprint 5 closing verification (S5-005, re-run in the same session as this document):

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ Passing — Turbopack, all 12 routes generated, static/dynamic split unchanged from pre-Sprint-5 |
| TypeScript (`npm run typecheck`) | ✅ Passing, zero errors |
| ESLint (`npm run lint`) | ✅ Passing, zero errors/warnings |
| Tests (`npm test`) | ✅ Passing, 329/329 across 40 files |
| Repository integrity | ✅ Branch `feature/sprint-5-provider-expansion` merges cleanly with `main` (the small CI-workflow-restructuring delta between them, unrelated to any Sprint 4/5 work, was merged in at the start of this session with zero conflicts) |
| Documentation progress | `SCHEMACRAFT_AI_MASTER_CONTEXT.md` synchronized; `TECH_DEBT.md` updated (TD-014); `docs/architecture/AD-005-delete-account.md` in place; this document written |

---

## 6. Known Risks

Updated at Sprint 5 closure to reflect what was resolved and what's newly disclosed:

- **Delete-account has a resolved decision (AD-005) but no implementation yet** — the SQL function, Server Action, and confirmation UI remain future work.
- **Anthropic and OpenAI are implemented and registered but not usable in any real environment today** — no `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` has been provisioned anywhere, and `DEFAULT_AI_PROVIDER` is not set, so every real generation still resolves to Gemini. This is the intended state after S5-004, not a gap in it.
- **No UI or account-level provider selection exists** — `DEFAULT_AI_PROVIDER` is an operator-level environment variable today, not a user-facing setting. Not required by S5-004's own scope.
- All Sprint 4 residual risks (TD-020 through TD-023, the two prepared-but-unapplied database changes, the contrast-verification and live-browser-verification gaps) are unchanged by Sprint 5 — see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` §9 and `TECH_DEBT.md` for the full, current list.

The full, unabridged risk and issue inventory lives in `TECH_DEBT.md`; this section is a summary, not a replacement for it.

---

## 7. Sprint Exit Criteria

Evaluated at closure (S5-005):

1. **Build, TypeScript, lint, and test checks all pass cleanly on the fully-merged state.** ✅ Met — all four re-run in this session (§5).
2. **Anthropic and OpenAI providers implemented on S5-001's abstractions, with no duplicated logic.** ✅ Met — both share `PromptBuilder`/`ResponseParser`/`RetryStrategy`/`AIProviderRegistry`/the `AIProviderError` hierarchy; only each provider's own SDK call and error-class mapping differ, which is inherent to using a different SDK, not duplicated logic.
3. **Provider selection centralized, per the accepted routing policy, with `generation.service.ts`'s public API unchanged.** ✅ Met — `resolveAIProvider()` is the one place selection policy lives; confirmed via `git diff` that neither Server Action calling into `generation.service.ts` needed any change.
4. **The delete-account decision resolved.** ✅ Met — AD-005, judged straightforward enough to unblock Sprint 5's own AI-provider work without further user input, per that task's explicit instruction.
5. **`TECH_DEBT.md` and `SCHEMACRAFT_AI_MASTER_CONTEXT.md` synchronized.** ✅ Met — §5/§6 above and this document's own diff.
6. **A short Sprint 5 closure note added, analogous to `Sprint-04-Closure.md`.** ✅ Met — this document.

**Sprint 5 status: ✅ Completed 2026-07-27**, with no partially-met exit criteria this time (unlike Sprint 4's own disclosed partial criterion around live-browser verification) — every criterion for *this* sprint's own scope was fully achievable and verified within this environment, since no task this sprint required an authenticated live session or a live Supabase connection to complete correctly.

---

## 8. Deferred Work

Work identified during Sprint 5 but explicitly out of its scope, deferred to future work:

- **Delete-account implementation** (the SQL function, Server Action, and UI) — AD-005 resolved the decision, not the code.
- **A UI/account-level mechanism for provider selection** beyond the `DEFAULT_AI_PROVIDER` environment variable.
- **Automatic failover, provider chaining, cross-provider retry, load balancing, weighted routing, and cost-based routing** — explicitly excluded from S5-004's own scope by the accepted architecture decision; would each need their own decision record if ever pursued.
- All pre-existing, lower-priority items already tracked in `TECH_DEBT.md` and not touched by Sprint 5 (TD-001, TD-005, TD-007/008/010, TD-012, TD-015, TD-017, TD-020 through TD-023).

---

## 9. Sprint Timeline

```
Foundation (S5-001)
   ↓  AIProviderAdapter, provider-agnostic types, error hierarchy,
      PromptBuilder/ResponseParser, RetryStrategy, AIProviderRegistry --
      Gemini refactored onto all of it, no new SDK yet
Decision & Expansion (S5-002)
   ↓  AD-005 (delete-account mechanism, resolved) + Anthropic provider
      (forced tool call for structured output)
Third Provider (S5-003)
   ↓  OpenAI provider (response_format: json_schema) -- found and fixed
      a real eager-client-construction bug affecting all three providers
Centralization (S5-004)
   ↓  resolveAIProvider() implements the accepted routing policy;
      AIProviderRegistry simplified to a pure lookup table
Closure (S5-005)
   ✅ all exit criteria (§7) met; Sprint 5 formally closed 2026-07-27
      ── current position ──
```

---

## 10. Next Milestone

Sprint 5 was the last sprint scoped in `docs/planning/Sprint-05-Implementation-Roadmap.md`. No Sprint 6 scope has been started, planned, or implied by anything in this document or in `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — per this sprint's own standing execution instructions, Sprint 5's closure is where this body of work stops. Candidate next-milestone inputs are exactly the items in §8 above (delete-account implementation, a provider-selection UI/mechanism, and the pre-existing `TECH_DEBT.md` backlog) plus whatever product direction is set outside this document.
